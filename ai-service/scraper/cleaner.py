import re
from bs4 import BeautifulSoup


def clean_text(text: str) -> str:
    if not text:
        return ""

    # Remove HTML tags if any remain
    text = BeautifulSoup(text, "lxml").get_text()

    # Bug #3 fix: do NOT remove URLs — they carry important search context
    # (e.g. searching "amazon.in phones" needs URL context to match)

    # Remove email addresses only
    text = re.sub(r'\S+@\S+', '', text)

    # Remove special characters but keep punctuation and forward slashes (for URLs)
    text = re.sub(r'[^\w\s.,!?;:()\-\'\"/]+', ' ', text)

    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()

    # Bug #3 fix: removed the short-word filter — it was removing "AI", "5G", "UK", "US", "TV" etc.
    # These are important search terms for a search engine

    return text


def chunk_text(text: str, chunk_size: int = 500) -> list[str]:
    if not text:
        return []

    words = text.split()
    chunks = []
    current_chunk = []
    current_size = 0

    for word in words:
        current_chunk.append(word)
        current_size += 1
        if current_size >= chunk_size:
            chunks.append(' '.join(current_chunk))
            current_chunk = []
            current_size = 0

    if current_chunk:
        chunks.append(' '.join(current_chunk))

    return chunks


def clean_document(doc: dict) -> dict:
    doc['title'] = clean_text(doc.get('title', ''))
    doc['description'] = clean_text(doc.get('description', ''))
    doc['content'] = clean_text(doc.get('content', ''))
    return doc