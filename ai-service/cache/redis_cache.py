import os
import json
import hashlib
from loguru import logger

REDIS_URL = os.getenv("REDIS_URL", "")
TTL = int(os.getenv("CACHE_TTL_SECONDS", 3600))

_client = None


def _get_client():
    global _client
    if _client is None and REDIS_URL:
        try:
            import redis
            _client = redis.from_url(REDIS_URL, decode_responses=True)
            _client.ping()
            logger.info(f"Redis connected: {REDIS_URL}")
        except Exception as e:
            logger.warning(f"Redis unavailable — caching disabled: {e}")
            _client = None
    return _client


def _make_key(query: str, page: int, page_size: int, search_type: str) -> str:
    raw = f"{query.lower().strip()}|{page}|{page_size}|{search_type}"
    return "search:" + hashlib.md5(raw.encode()).hexdigest()


def get_cached(query: str, page: int, page_size: int, search_type: str):
    """Return cached result dict or None if not cached / Redis unavailable."""
    try:
        r = _get_client()
        if not r:
            return None
        key = _make_key(query, page, page_size, search_type)
        val = r.get(key)
        if val:
            logger.info(f"Cache HIT for '{query}' page={page}")
            return json.loads(val)
        logger.info(f"Cache MISS for '{query}' page={page}")
        return None
    except Exception as e:
        logger.warning(f"Cache get error: {e}")
        return None


def set_cached(query: str, page: int, page_size: int, search_type: str, data: dict):
    """Store result in Redis. Fails silently if Redis unavailable."""
    try:
        r = _get_client()
        if not r:
            return
        key = _make_key(query, page, page_size, search_type)
        r.setex(key, TTL, json.dumps(data, default=str))
        logger.info(f"Cached '{query}' page={page} for {TTL}s")
    except Exception as e:
        logger.warning(f"Cache set error: {e}")


def clear_all_cache():
    """Delete all search cache keys."""
    try:
        r = _get_client()
        if not r:
            return
        keys = r.keys("search:*")
        if keys:
            r.delete(*keys)
            logger.info(f"Cleared {len(keys)} cache entries")
    except Exception as e:
        logger.warning(f"Cache clear error: {e}")
