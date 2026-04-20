import chromadb
from chromadb.config import Settings
from loguru import logger
import os
import uuid


# Bug #1 fix: .env had CHROMA_DB_PATH but code was reading CHROMA_PATH — now both match
CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_db")

_client = None
_collection = None


def get_client():
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=CHROMA_PATH)
        logger.info(f"ChromaDB client initialized at {CHROMA_PATH}")
    return _client


def get_collection():
    global _collection
    if _collection is None:
        client = get_client()
        _collection = client.get_or_create_collection(
            name="search_index",
            metadata={"hnsw:space": "cosine"}
        )
        logger.info(f"ChromaDB collection ready — documents: {_collection.count()}")
    return _collection


def add_documents(documents: list[dict], embeddings: list[list[float]]):
    collection = get_collection()

    ids = []
    docs = []
    metas = []
    embeds = []

    for doc, embedding in zip(documents, embeddings):
        doc_id = doc.get("url_hash", str(uuid.uuid4()))
        ids.append(doc_id)
        docs.append(doc.get("content", "")[:1000])

        # Bug #10 fix: if meta description is empty, build a clean excerpt from content
        raw_desc = doc.get("description", "")
        if not raw_desc:
            content = doc.get("content", "")
            excerpt = content[:160]
            if len(content) > 160:
                last_space = excerpt.rfind(" ")
                excerpt = (excerpt[:last_space] if last_space > 0 else excerpt) + "..."
            raw_desc = excerpt

        metas.append({
            "url": doc.get("url", ""),
            "title": doc.get("title", ""),
            "description": raw_desc,
            "source": doc.get("source", ""),
            "url_hash": doc_id
        })
        embeds.append(embedding)

    collection.upsert(
        ids=ids,
        documents=docs,
        metadatas=metas,
        embeddings=embeds
    )

    logger.info(f"Added/updated {len(ids)} documents in ChromaDB")


def search_similar(query_embedding: list[float], n_results: int = 10) -> dict:
    collection = get_collection()

    if collection.count() == 0:
        logger.warning("ChromaDB collection is empty — no documents indexed yet")
        return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(n_results, collection.count()),
        include=["documents", "metadatas", "distances"]
    )

    return results


def clear_collection():
    client = get_client()
    client.delete_collection("search_index")
    global _collection
    _collection = None
    logger.info("ChromaDB collection cleared")


def get_document_count() -> int:
    collection = get_collection()
    return collection.count()