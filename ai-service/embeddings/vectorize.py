from sentence_transformers import SentenceTransformer
from loguru import logger
import os

MODEL_NAME = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

_model = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info(f"Loading embedding model: {MODEL_NAME}")
        _model = SentenceTransformer(MODEL_NAME)
        logger.info("Embedding model loaded successfully")
    return _model


def embed_text(text: str) -> list[float]:
    model = get_model()
    embedding = model.encode(text, convert_to_tensor=False)
    return embedding.tolist()


def embed_batch(texts: list[str]) -> list[list[float]]:
    model = get_model()
    embeddings = model.encode(texts, convert_to_tensor=False, batch_size=32, show_progress_bar=True)
    return [e.tolist() for e in embeddings]