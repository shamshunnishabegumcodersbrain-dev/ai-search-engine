import os
import json
import requests
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def _call_groq(system_prompt: str, user_prompt: str, max_tokens: int = 500) -> str | None:
    if not GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set — AI features disabled")
        return None

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "max_tokens": max_tokens,
        "temperature": 0.7
    }

    try:
        response = requests.post(GROQ_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        answer = response.json()["choices"][0]["message"]["content"].strip()
        logger.info(f"Groq answered — {len(answer)} chars")
        return answer
    except Exception as e:
        logger.error(f"Groq API call failed: {e}")
        return None


def _detect_intent(query: str) -> str:
    """Detect if query is navigational, informational, or transactional."""
    query_lower = query.lower().strip()

    nav_signals = [
        "youtube", "facebook", "instagram", "twitter", "google", "amazon",
        "netflix", "github", "reddit", "linkedin", "wikipedia", "geeksforgeeks",
        ".com", ".org", ".net", ".in"
    ]
    if any(s in query_lower for s in nav_signals):
        return "navigational"

    trans_signals = [
        "buy", "price", "cost", "cheap", "discount", "purchase",
        "download", "install", "sign up", "register", "book", "order"
    ]
    if any(s in query_lower for s in trans_signals):
        return "transactional"

    return "informational"


def generate_answer(query: str, context_chunks: list) -> str:
    intent = _detect_intent(query)

    system_prompt = (
        "You are a helpful AI search assistant, similar to Google's AI Overview. "
        "Answer clearly and concisely in 3-5 sentences. "
        "Do not use bullet points or markdown headers — write in plain prose. "
        "If the query is a website or brand name (navigational intent), "
        "give a brief factual description of what that website or brand does. "
        "If the query is a question (informational intent), answer it directly. "
        "If the query is about buying something (transactional intent), "
        "summarise what the product/service is and where to find it."
    )

    if context_chunks:
        context = "\n\n".join(context_chunks[:5])
        user_prompt = (
            f"Search query: {query}\n\n"
            f"Web search context:\n{context}\n\n"
            f"Write a helpful AI overview answer for this search query based on the context above. "
            f"Answer in 3-5 plain prose sentences."
        )
    else:
        user_prompt = (
            f"Search query: {query}\n\n"
            f"No web results are available. Answer from your general knowledge in 3-5 plain prose sentences."
        )

    result = _call_groq(system_prompt, user_prompt, max_tokens=400)
    if result:
        return result

    return f"Here are the search results for '{query}'. Please check the links below for more information."


def generate_knowledge_panel(entity: str, context: str = "") -> dict | None:
    """
    Generate a knowledge panel for a known entity (person, company, place, etc.)
    Returns a dict with title, type, description, and facts, or None if not applicable.
    Called by pipeline.py as a fallback when SerpAPI returns no knowledge_graph data.
    """
    system_prompt = (
        "You are a factual knowledge assistant. "
        "When given an entity name, output a JSON object with these fields only: "
        '{"title": string, "type": string, "description": string (1-2 sentences), '
        '"facts": {"key": "value", ...}} '
        "The facts object should have 3-5 key facts (founded, headquarters, CEO, etc). "
        "If the entity is not well-known enough, output: {\"not_found\": true}. "
        "Output ONLY valid JSON. No markdown, no explanation."
    )

    user_prompt = f"Entity: {entity}"
    if context:
        user_prompt += f"\n\nAdditional context from web:\n{context}"

    try:
        result = _call_groq(system_prompt, user_prompt, max_tokens=300)
        if not result:
            return None

        cleaned = result.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        data = json.loads(cleaned)

        if data.get("not_found"):
            return None

        return {
            "title": data.get("title", entity),
            "type": data.get("type", ""),
            "description": data.get("description", ""),
            "image": "",
            "website": "",
            "facts": data.get("facts", {}),
        }
    except Exception as e:
        logger.error(f"Knowledge panel generation failed: {e}")
        return None


def detect_comparison(query: str) -> tuple[str, str] | None:
    """
    Detect if the query is a comparison like "X vs Y" or "X versus Y".
    Returns (item_a, item_b) tuple if it is, or None if it's not.

    Examples:
      "iPhone vs Samsung"         → ("iPhone", "Samsung")
      "Python vs JavaScript"      → ("Python", "JavaScript")
      "React versus Vue"          → ("React", "Vue")
      "iPhone 15 vs Samsung S24"  → ("iPhone 15", "Samsung S24")
      "best laptop"               → None
    """
    import re
    # Match "X vs Y", "X versus Y", "X vs. Y" — case insensitive
    pattern = re.compile(
        r'^(.+?)\s+(?:vs\.?|versus)\s+(.+)$',
        re.IGNORECASE
    )
    match = pattern.match(query.strip())
    if match:
        item_a = match.group(1).strip()
        item_b = match.group(2).strip()
        # Both sides must be at least 2 chars and not just stopwords
        if len(item_a) >= 2 and len(item_b) >= 2:
            return (item_a, item_b)
    return None


def generate_comparison(item_a: str, item_b: str, context_chunks: list) -> dict | None:
    """
    Generate a structured side-by-side comparison table using Groq.
    Returns a dict ready to pass directly to the ComparePanel component, or None on failure.

    Return shape:
    {
        "item_a": str,
        "item_b": str,
        "winner": "a" | "b" | "tie",
        "verdict": str,       # 1-2 sentence summary
        "rows": [
            {
                "category": str,
                "a": str,
                "b": str,
                "winner": "a" | "b" | "tie"
            },
            ...  # 6-8 rows
        ]
    }
    """
    system_prompt = (
        "You are an expert comparison assistant. "
        "When given two items to compare, output a JSON object with this EXACT structure:\n"
        "{\n"
        '  "item_a": "first item name",\n'
        '  "item_b": "second item name",\n'
        '  "winner": "a" or "b" or "tie",\n'
        '  "verdict": "1-2 sentence summary explaining which is better and why, or why it is a tie",\n'
        '  "rows": [\n'
        '    { "category": "Category Name", "a": "value for item_a", "b": "value for item_b", "winner": "a" or "b" or "tie" },\n'
        "    ... 6 to 8 rows total\n"
        "  ]\n"
        "}\n\n"
        "Rules:\n"
        "- Pick 6-8 meaningful comparison categories relevant to these specific items\n"
        "- Each value should be 1-2 sentences max, factual and specific\n"
        "- winner field per row: set 'a' if item_a is better in that category, 'b' if item_b, 'tie' if equal\n"
        "- Overall winner: be decisive — pick 'a', 'b', or 'tie' based on the rows\n"
        "- Output ONLY valid JSON. No markdown, no explanation, no extra text."
    )

    context_text = ""
    if context_chunks:
        context_text = f"\n\nWeb search context:\n" + "\n\n".join(context_chunks[:5])

    user_prompt = (
        f"Compare: {item_a} vs {item_b}{context_text}\n\n"
        f"Generate a detailed comparison table."
    )

    try:
        result = _call_groq(system_prompt, user_prompt, max_tokens=900)
        if not result:
            return None

        # Strip markdown code fences if model adds them
        cleaned = result.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        cleaned = cleaned.strip()

        data = json.loads(cleaned)

        # Validate required fields
        if not data.get("rows") or not isinstance(data["rows"], list):
            logger.warning("Comparison JSON missing rows")
            return None

        # Normalise winner values
        def norm(w):
            return w if w in ("a", "b", "tie") else "tie"

        return {
            "item_a": data.get("item_a", item_a),
            "item_b": data.get("item_b", item_b),
            "winner": norm(data.get("winner", "tie")),
            "verdict": data.get("verdict", ""),
            "rows": [
                {
                    "category": row.get("category", ""),
                    "a": row.get("a", ""),
                    "b": row.get("b", ""),
                    "winner": norm(row.get("winner", "tie")),
                }
                for row in data["rows"]
                if row.get("category") and row.get("a") and row.get("b")
            ],
        }

    except json.JSONDecodeError as e:
        logger.error(f"Comparison JSON parse failed: {e}")
        return None
    except Exception as e:
        logger.error(f"generate_comparison failed: {e}")
        return None


def check_groq_health() -> bool:
    """Returns True if Groq API key is configured."""
    return bool(GROQ_API_KEY)


# Backwards-compatible alias (was called check_ollama_health in old code)
check_ollama_health = check_groq_health