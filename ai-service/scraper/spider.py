import requests
from bs4 import BeautifulSoup
from datetime import datetime
import hashlib
import time
from urllib.parse import urljoin, urlparse
from loguru import logger  # unified with the rest of ai-service

WEBSITES = [
    # Tech news
    "https://techcrunch.com",
    "https://arstechnica.com",
    "https://www.theverge.com",
    "https://news.ycombinator.com",
    "https://www.wired.com",
    "https://venturebeat.com",
    "https://www.engadget.com",
    "https://www.zdnet.com",
    # World news
    "https://www.bbc.com/news",
    "https://www.reuters.com",
    "https://apnews.com",
    "https://www.theguardian.com",
    # Science
    "https://www.scientificamerican.com",
    "https://phys.org",
    # India
    "https://www.ndtv.com",
    "https://timesofindia.indiatimes.com",
    "https://www.thehindu.com",
    "https://indianexpress.com",
    "https://www.moneycontrol.com",
    # Tech products
    "https://gadgets360.com",
    "https://www.digit.in",
    # Health
    "https://www.healthline.com",
    "https://www.webmd.com",
    # Finance
    "https://www.investopedia.com",
    "https://economictimes.indiatimes.com",
    # AI / programming
    "https://openai.com/blog",
    "https://huggingface.co/blog",
    "https://stackoverflow.blog",
    "https://dev.to",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

REQUEST_DELAY = 2.0
MAX_ARTICLES_PER_SITE = 5


def _is_article_url(url: str, base_domain: str) -> bool:
    parsed = urlparse(url)
    if base_domain not in parsed.netloc:
        return False
    path = parsed.path.strip("/")
    if not path or path in ["news", "blog", "articles"]:
        return False
    skip_patterns = [
        "/tag/", "/category/", "/author/", "/page/", "/search/",
        "/login", "/signup", "/subscribe", "/about", "/contact",
        "/privacy", "/terms", "?", "#",
        ".jpg", ".png", ".pdf", ".mp4",
    ]
    if any(p in url for p in skip_patterns):
        return False
    parts = [p for p in path.split("/") if p]
    return len(parts) >= 2


def _extract_article_links(html: str, base_url: str) -> list[str]:
    soup = BeautifulSoup(html, "lxml")
    base_domain = urlparse(base_url).netloc.replace("www.", "")
    seen = set()
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        full_url = urljoin(base_url, href)
        full_url = full_url.split("#")[0].rstrip("/")
        if full_url in seen:
            continue
        seen.add(full_url)
        if _is_article_url(full_url, base_domain):
            links.append(full_url)
            if len(links) >= MAX_ARTICLES_PER_SITE:
                break
    return links


def scrape_url(url: str) -> dict | None:
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        html = response.text
        soup = BeautifulSoup(html, "lxml")

        for tag in soup(["script", "style", "nav", "footer", "header",
                          "aside", "iframe", "noscript"]):
            tag.decompose()

        title_tag = soup.find("title")
        title = title_tag.get_text(strip=True) if title_tag else "No Title"

        meta_desc = soup.find("meta", attrs={"name": "description"}) or \
                    soup.find("meta", attrs={"property": "og:description"})
        description = meta_desc["content"] if meta_desc and meta_desc.get("content") else ""

        paragraphs = soup.find_all("p")
        content = " ".join(
            p.get_text(strip=True) for p in paragraphs
            if len(p.get_text(strip=True)) > 30
        )
        content = content[:5000]

        if not content:
            return None

        url_hash = hashlib.md5(url.encode()).hexdigest()

        return {
            "url": url,
            "title": title,
            "description": description,
            "content": content,
            "source": urlparse(url).netloc.replace("www.", ""),
            "scraped_at": datetime.utcnow(),
            "url_hash": url_hash,
        }

    except Exception as e:
        logger.error(f"Failed to scrape {url}: {e}")
        return None


def scrape_site(base_url: str) -> list[dict]:
    docs = []
    try:
        response = requests.get(base_url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        html = response.text
    except Exception as e:
        logger.error(f"Failed to fetch homepage {base_url}: {e}")
        return docs

    homepage_doc = scrape_url(base_url)
    if homepage_doc:
        docs.append(homepage_doc)

    article_links = _extract_article_links(html, base_url)
    logger.info(f"  Found {len(article_links)} article links on {base_url}")

    for link in article_links:
        time.sleep(REQUEST_DELAY)
        doc = scrape_url(link)
        if doc:
            docs.append(doc)
            logger.info(f"  Scraped article: {doc['title'][:60]}")
        else:
            logger.warning(f"  Skipped: {link}")

    return docs


def scrape_all() -> list[dict]:
    all_docs = []
    total = len(WEBSITES)
    for i, url in enumerate(WEBSITES):
        logger.info(f"Scraping site [{i + 1}/{total}]: {url}")
        site_docs = scrape_site(url)
        all_docs.extend(site_docs)
        logger.info(f"  Got {len(site_docs)} documents from {url}")
        if i < total - 1:
            time.sleep(REQUEST_DELAY)
    logger.info(f"Scraping complete — {len(all_docs)} total documents from {total} sites")
    return all_docs