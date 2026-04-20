import os
import time
import requests
from loguru import logger
from dotenv import load_dotenv
from rag.llama_service import generate_answer, generate_knowledge_panel, detect_comparison, generate_comparison

load_dotenv()

SERP_API_KEY = os.getenv("SERP_API_KEY", "")


def google_search(query: str, page: int = 1, page_size: int = 10, search_type: str = "web", safe_search: bool = True, tbs: str = "") -> dict:
    """
    Search using SerpAPI. Returns full enriched payload including:
    - results, total_results, total_pages
    - spell_fix (did you mean?)
    - related_searches
    - people_also_ask
    - knowledge_panel
    """
    try:
        if not SERP_API_KEY:
            logger.warning("SERP_API_KEY not set — returning empty results")
            return _empty_search_payload()

        params = {
            "q": query,
            "api_key": SERP_API_KEY,
            "num": page_size,
            "start": (page - 1) * page_size,
            # ── Safe search ───────────────────────────────────────────────────
            # "active" = filter adult content ON, "off" = no filter
            "safe": "active" if safe_search else "off",
        }

        # ── Time filter ───────────────────────────────────────────────────────
        if tbs:
            params["tbs"] = tbs

        if search_type == "news":
            params["tbm"] = "nws"
        elif search_type == "images":
            params["tbm"] = "isch"
        elif search_type == "videos":
            params["tbm"] = "vid"

        response = requests.get("https://serpapi.com/search", params=params, timeout=15)
        response.raise_for_status()
        data = response.json()

        # ── Results ──────────────────────────────────────────────────────────
        results = []
        items = data.get("organic_results", [])
        if search_type == "news":
            items = data.get("news_results", [])
        elif search_type == "images":
            items = data.get("images_results", [])
        elif search_type == "videos":
            items = data.get("video_results", [])

        for i, item in enumerate(items):
            source_field = item.get("source", {})
            if isinstance(source_field, str):
                source_name = source_field
                source_date = ""
            else:
                source_name = source_field.get("name", "")
                source_date = source_field.get("date", "")

            result = {
                "rank": (page - 1) * page_size + i + 1,
                "title": item.get("title", ""),
                "url": item.get("link", "") or item.get("original", ""),
                "description": item.get("snippet", "") or source_name,
                "score": round(max(0.1, 1.0 - (i * 0.05)), 2),
                "source_site": item.get("displayed_link", "") or source_name,
                "url_hash": str(hash(item.get("link", "") or item.get("original", ""))),
                "date": item.get("date", "") or source_date,
                # thumbnail: prefer thumbnail, fallback to original for image search
                "thumbnail": item.get("thumbnail", "") or (
                    item.get("original", "") if search_type == "images" else ""
                ),
            }
            results.append(result)

        # ── Total results ─────────────────────────────────────────────────────
        search_info = data.get("search_information", {})
        raw_total = search_info.get("total_results", len(results))
        try:
            total_results = int(str(raw_total).replace(",", ""))
        except (ValueError, TypeError):
            total_results = len(results)

        total_pages = max(1, (total_results + page_size - 1) // page_size)
        total_pages = min(total_pages, 20)

        # ── Spelling correction ───────────────────────────────────────────────
        spell_fix = search_info.get("spell_fix", "") or search_info.get("query_displayed", "")
        if spell_fix.lower() == query.lower():
            spell_fix = ""

        # ── Related searches ──────────────────────────────────────────────────
        related_raw = data.get("related_searches", [])
        related_searches = [r.get("query", "") for r in related_raw if r.get("query")][:8]

        # ── People also ask ───────────────────────────────────────────────────
        paa_raw = data.get("related_questions", [])
        people_also_ask = []
        for q in paa_raw[:6]:
            people_also_ask.append({
                "question": q.get("question", ""),
                "answer": q.get("snippet", ""),
                "source_url": q.get("link", ""),
                "source_title": q.get("title", ""),
            })

        # ── Knowledge graph ───────────────────────────────────────────────────
        kg = data.get("knowledge_graph", {})
        knowledge_panel = None
        if kg:
            knowledge_panel = {
                "title": kg.get("title", ""),
                "type": kg.get("type", ""),
                "description": kg.get("description", ""),
                "image": kg.get("image", ""),
                "website": kg.get("website", ""),
                "facts": {
                    k: v for k, v in kg.items()
                    if k not in [
                        "title", "type", "description", "image", "website",
                        "header_images", "people_also_search_for", "see_results_about"
                    ] and isinstance(v, str)
                },
            }

        logger.info(f"SerpAPI returned {len(results)} results, total={total_results}, safe={safe_search}")

        return {
            "results": results,
            "total_results": total_results,
            "total_pages": total_pages,
            "spell_fix": spell_fix,
            "related_searches": related_searches,
            "people_also_ask": people_also_ask,
            "knowledge_panel": knowledge_panel,
        }

    except requests.exceptions.HTTPError as e:
        logger.error(f"SerpAPI HTTP error: {e}")
        return _empty_search_payload()
    except Exception as e:
        logger.error(f"SerpAPI failed: {e}")
        return _empty_search_payload()


def _empty_search_payload() -> dict:
    return {
        "results": [],
        "total_results": 0,
        "total_pages": 0,
        "spell_fix": "",
        "related_searches": [],
        "people_also_ask": [],
        "knowledge_panel": None,
    }


def _looks_like_entity(query: str) -> bool:
    """
    Heuristic: if the query is 1-4 words, title-cased, and has no question words,
    it's likely a named entity (person, company, place) worth generating a KG panel for.
    """
    words = query.strip().split()
    if len(words) > 5:
        return False
    question_words = {"what", "why", "how", "when", "where", "who", "which", "is", "are", "does", "do"}
    if words[0].lower() in question_words:
        return False
    capitalised = sum(1 for w in words if w and w[0].isupper())
    return capitalised >= 1


def run_search_pipeline(query: str, page: int = 1, page_size: int = 10, search_type: str = "web", safe_search: bool = True, tbs: str = "") -> dict:
    """
    Main search pipeline. Runs web search + AI answer + AI knowledge panel fallback.
    Returns fully enriched response ready for the frontend.
    safe_search: True = filter adult content (default), False = off
    tbs: SerpAPI time filter string e.g. "qdr:d" for past day
    """
    start_time = time.time()

    try:
        search_data = google_search(query, page, page_size, search_type, safe_search=safe_search, tbs=tbs)
        results = search_data["results"]

        context_chunks = [
            f"{r['title']}: {r['description']}"
            for r in results[:5]
            if r.get("description")
        ]

        source = "google_search" if results else "ai_general"

        ai_answer = generate_answer(query, context_chunks)

        # ── Comparison mode: detect "X vs Y" queries ─────────────────────────
        comparison = None
        compare_pair = detect_comparison(query)
        if compare_pair and search_type == "web":
            item_a, item_b = compare_pair
            logger.info(f"Comparison query detected: '{item_a}' vs '{item_b}'")
            comparison = generate_comparison(item_a, item_b, context_chunks)
            if comparison:
                logger.info(f"Comparison table generated — {len(comparison['rows'])} rows")

        # Use SerpAPI knowledge panel if available; otherwise generate with AI for entity queries
        knowledge_panel = search_data["knowledge_panel"]
        if not knowledge_panel and search_type == "web" and _looks_like_entity(query):
            context_for_kg = "\n".join(context_chunks[:3]) if context_chunks else ""
            knowledge_panel = generate_knowledge_panel(query, context_for_kg)
            if knowledge_panel:
                logger.info(f"AI-generated knowledge panel for '{query}'")

        latency_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "ai_answer": ai_answer,
            "source": source,
            "query": query,
            "page": page,
            "page_size": page_size,
            "search_type": search_type,
            "safe_search": safe_search,
            "total_results": search_data["total_results"],
            "total_pages": search_data["total_pages"],
            "results": results,
            "spell_fix": search_data["spell_fix"],
            "related_searches": search_data["related_searches"],
            "people_also_ask": search_data["people_also_ask"],
            "knowledge_panel": knowledge_panel,
            "comparison": comparison,
            "latency_ms": latency_ms,
        }

    except Exception as e:
        logger.error(f"Pipeline error: {e}")
        return {
            "ai_answer": f"Something went wrong while searching for '{query}'. Please try again.",
            "source": "error",
            "query": query,
            "page": page,
            "page_size": page_size,
            "search_type": search_type,
            "safe_search": safe_search,
            "total_results": 0,
            "total_pages": 0,
            "results": [],
            "spell_fix": "",
            "related_searches": [],
            "people_also_ask": [],
            "knowledge_panel": None,
            "comparison": None,
            "latency_ms": 0,
        }


def summarize_url(url: str) -> str:
    """
    Fetch a webpage and return a 3-sentence AI summary.
    Called by the /summarize endpoint.
    """
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()

        # Very basic text extraction — strip tags
        import re
        text = re.sub(r"<[^>]+>", " ", resp.text)
        text = re.sub(r"\s+", " ", text).strip()
        text = text[:3000]  # limit context

        from rag.llama_service import generate_answer
        summary = generate_answer(
            f"Summarize this webpage content in exactly 3 clear sentences:",
            [text]
        )
        return summary
    except Exception as e:
        logger.error(f"summarize_url failed for {url}: {e}")
        return "Could not summarize this page. The site may have blocked access."