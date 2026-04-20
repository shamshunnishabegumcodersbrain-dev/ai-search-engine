import os
import sys
import threading
import uuid
import time
import io
import base64
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from loguru import logger

from scraper.spider import scrape_all
from scraper.cleaner import clean_document, chunk_text
from embeddings.vectorize import embed_text, embed_batch
from embeddings.chromadb_store import add_documents, clear_collection, get_document_count
from rag.pipeline import run_search_pipeline, summarize_url
from rag.llama_service import check_groq_health
from scraper.scheduler import start_scheduler
from cache.redis_cache import get_cached, set_cached

# ─── Logging ─────────────────────────────────────────────────────────────────
os.makedirs("logs", exist_ok=True)
logger.remove()
logger.add(sys.stdout, level=os.getenv("LOG_LEVEL", "INFO"))
logger.add("logs/ai_service.log", rotation="10 MB", retention="7 days", level="INFO")

SCRAPE_SECRET = os.getenv("SCRAPE_SECRET", "")


def verify_scrape_key(x_scrape_key: str = Header(default=None)):
    if not SCRAPE_SECRET:
        raise HTTPException(status_code=500, detail="SCRAPE_SECRET not configured on server.")
    if x_scrape_key != SCRAPE_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing scrape key.")


def run_full_scrape():
    logger.info("Starting full scrape job...")
    try:
        raw_docs = scrape_all()
        logger.info(f"Scraped {len(raw_docs)} documents")
        cleaned_docs = [clean_document(doc) for doc in raw_docs]

        all_chunks = []
        for doc in cleaned_docs:
            chunks = chunk_text(doc["content"], chunk_size=500)
            for i, chunk in enumerate(chunks):
                chunk_doc = doc.copy()
                chunk_doc["content"] = chunk
                chunk_doc["url_hash"] = f"{doc['url_hash']}_{i}"
                all_chunks.append(chunk_doc)

        logger.info(f"Created {len(all_chunks)} chunks for embedding")
        texts = [d["content"] for d in all_chunks]
        embeddings = embed_batch(texts)
        add_documents(all_chunks, embeddings)
        logger.info(f"Scrape job complete — {len(all_chunks)} chunks indexed")
    except Exception as e:
        logger.error(f"Scrape job failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AI Search Engine starting up...")
    groq_ok = check_groq_health()
    if groq_ok:
        logger.info("Groq API ready (llama-3.3-70b-versatile)")
    else:
        logger.warning("Groq API not configured — set GROQ_API_KEY in .env")
    doc_count = get_document_count()
    logger.info(f"ChromaDB has {doc_count} documents indexed")
    start_scheduler(run_full_scrape)
    yield
    logger.info("AI Search Engine shutting down...")


app = FastAPI(
    title="AI Search Engine",
    description="RAG-powered search with Groq + Llama3",
    version="2.1.0",
    lifespan=lifespan
)

raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5000")
allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
logger.info(f"CORS allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Models ───────────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str
    page: int = 1
    page_size: int = 10
    search_type: str = "web"  # web | news | images | videos
    tbs: str = ""             # time filter: qdr:h | qdr:d | qdr:w | qdr:m | qdr:y


class SummarizeRequest(BaseModel):
    url: str
    title: str = ""


class VoiceTranscribeRequest(BaseModel):
    audio_base64: str
    language: str = "en"
    audio_format: str = "webm"  # webm | ogg | wav | mp4


# ─── Health ──────────────────────────────────────────────────────────────────

_last_groq_status = False
_last_groq_check = 0
GROQ_CACHE_SECONDS = 30


@app.get("/health")
async def health():
    global _last_groq_status, _last_groq_check
    now = time.time()
    if now - _last_groq_check > GROQ_CACHE_SECONDS:
        _last_groq_status = check_groq_health()
        _last_groq_check = now
    doc_count = get_document_count()
    return {
        "status": "ok",
        "groq": "ready" if _last_groq_status else "unavailable",
        "model": "llama-3.3-70b-versatile",
        "documents_indexed": doc_count,
        "embedding_model": os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2"),
        "chroma_path": os.getenv("CHROMA_PATH", "./chroma_db"),
    }


# ─── Search ──────────────────────────────────────────────────────────────────

@app.post("/search")
async def search(request: SearchRequest):
    if not request.query or len(request.query.strip()) < 2:
        raise HTTPException(status_code=400, detail="Query must be at least 2 characters")
    if len(request.query) > 200:
        raise HTTPException(status_code=400, detail="Query must be under 200 characters")
    if request.page < 1:
        request.page = 1
    if request.page_size < 1 or request.page_size > 50:
        request.page_size = 10
    if request.search_type not in ["web", "news", "images", "videos"]:
        request.search_type = "web"

    logger.info(f"Search request — query: '{request.query}' page: {request.page} type: {request.search_type} tbs: {request.tbs}")

    cached = get_cached(request.query, request.page, request.page_size, request.search_type)
    if cached:
        cached["from_cache"] = True
        return cached

    result = run_search_pipeline(
        query=request.query,
        page=request.page,
        page_size=request.page_size,
        search_type=request.search_type,
        tbs=request.tbs,
    )

    set_cached(request.query, request.page, request.page_size, request.search_type, result)
    result["from_cache"] = False
    return result


# ─── Summarize ───────────────────────────────────────────────────────────────

@app.post("/summarize")
async def summarize(request: SummarizeRequest):
    """
    Fetch a webpage and summarize it in 3 sentences using Groq.
    This is a feature Google doesn't offer.
    """
    if not request.url or not request.url.startswith("http"):
        raise HTTPException(status_code=400, detail="A valid URL is required")

    logger.info(f"Summarize request — url: {request.url[:80]}")
    summary = summarize_url(request.url, request.title)
    return {"success": True, "summary": summary, "url": request.url}


# ─── Scrape ──────────────────────────────────────────────────────────────────

@app.post("/scrape")
async def trigger_scrape(_=Depends(verify_scrape_key)):
    job_id = str(uuid.uuid4())
    logger.info(f"Manual scrape triggered — job_id: {job_id}")
    thread = threading.Thread(target=run_full_scrape, daemon=True)
    thread.start()
    return {"status": "started", "job_id": job_id, "message": "Scrape job started in background."}


@app.delete("/clear-cache")
async def clear_cache(_=Depends(verify_scrape_key)):
    clear_collection()
    return {"status": "cleared", "message": "ChromaDB collection cleared successfully"}


# ─── Voice Transcription ─────────────────────────────────────────────────────

@app.post("/voice-transcribe")
async def voice_transcribe(request: VoiceTranscribeRequest):
    """
    Accepts base64-encoded audio, transcribes using Groq Whisper,
    and returns the transcript text.
    """
    groq_api_key = os.getenv("GROQ_API_KEY", "")
    if not groq_api_key:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY not configured")

    if not request.audio_base64:
        raise HTTPException(status_code=400, detail="No audio data provided")

    try:
        import groq as groq_sdk

        audio_bytes = base64.b64decode(request.audio_base64)

        client = groq_sdk.Groq(api_key=groq_api_key)

        mime_types = {
            "webm": "audio/webm",
            "ogg": "audio/ogg",
            "wav": "audio/wav",
            "mp4": "audio/mp4",
            "m4a": "audio/m4a",
        }
        mime = mime_types.get(request.audio_format, "audio/webm")
        filename = f"audio.{request.audio_format}"

        # Normalize language code
        lang = request.language
        if lang in ("en-IN", "en-GB", "en-AU"):
            lang = "en"

        transcription = client.audio.transcriptions.create(
            file=(filename, io.BytesIO(audio_bytes), mime),
            model="whisper-large-v3-turbo",
            language=lang,
            response_format="json",
        )

        transcript_text = transcription.text.strip()
        logger.info(f"Voice transcribed — {len(transcript_text)} chars, lang: {request.language}")

        return {
            "success": True,
            "transcript": transcript_text,
            "language": request.language,
        }

    except Exception as e:
        logger.error(f"Voice transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")