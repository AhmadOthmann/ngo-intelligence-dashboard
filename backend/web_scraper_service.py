import re
import sqlite3
from collections import deque
from datetime import datetime, timezone
from time import sleep
from typing import Optional
from urllib.parse import urldefrag, urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup
from langdetect import LangDetectException, detect_langs

from .database import create_item
from .models import ScrapeResult


USER_AGENT = "ngo-intelligence-dashboard/0.1 (+local hackathon demo)"
DEFAULT_WEB_SOURCES = [
    "https://recadec.org/en/a-new-generation-ready-to-transform-the-great-lakes-region/",
    "https://recadec.org/en/news/",
    "https://reliefweb.int/country/bdi",
    "https://reliefweb.int/updates?search=Burundi%20refugees%20Democratic%20Republic%20of%20Congo",
    "https://reliefweb.int/updates?search=Burundi%20girls%20education",
    "https://reliefweb.int/updates?search=Burundi%20health%20children",
    "https://reliefweb.int/updates?search=Great%20Lakes%20Region%20Burundi%20youth",
    "https://response.reliefweb.int/burundi/reports",
    "https://response.reliefweb.int/burundi/protection/reports",
    "https://www.engagement-global.de/en/overview-of-our-programmes",
    "https://asa.engagement-global.de/en/",
    "https://www.deutsch-afrikanisches-jugendwerk.de/en/teams-up/funding/submitting-an-application.html",
    "https://www.unocha.org/burundi",
    "https://www.globalfund.org/en/portfolio/country/?loc=BDI",
    "https://www.gavi.org/programmes-impact/country-hub/africa/burundi",
    "https://www.welttierschutz.org/en/",
    "https://www.welttierschutz.org/en/projects/",
]
GEOGRAPHY_KEYWORDS = [
    "burundi",
    "bujumbura",
    "gitega",
    "gateri",
    "busuma",
    "great lakes",
    "east africa",
    "rwanda",
    "democratic republic of congo",
    "drc",
    "congo",
]
BURUNDI_KIDS_KEYWORDS = [
    "education",
    "school",
    "attendance",
    "vocational",
    "girls",
    "girl",
    "children",
    "child",
    "youth",
    "women",
    "woman",
    "gbv",
    "gender-based violence",
    "health",
    "malaria",
    "humanitarian",
    "refugee",
    "refugees",
    "displaced",
    "protection",
    "wash",
    "water sanitation",
]
FUNDING_KEYWORDS = [
    "funding",
    "grant",
    "grants",
    "proposal",
    "proposals",
    "call",
    "rfa",
    "application",
    "applications",
    "apply",
    "eligible",
    "eligibility",
    "deadline",
    "bmz",
    "tender",
    "partnership",
    "foundation",
]
WTG_KEYWORDS = [
    "animal welfare",
    "wildlife",
    "wildlife protection",
    "rabies",
    "animal trade",
    "trafficking",
    "poaching",
    "donkey",
    "puppy",
    "stray dog",
    "veterinary",
    "consumer protection",
]
SOURCE_CONTEXT_KEYWORDS = [
    "ocha",
    "united nations",
    "unhcr",
    "unicef",
    "global fund",
    "gavi",
    "vaccine",
    "ngo",
    "civil society",
    "recadec",
    "concern worldwide",
]
RELEVANT_KEYWORDS = [
    *GEOGRAPHY_KEYWORDS,
    *BURUNDI_KIDS_KEYWORDS,
    *FUNDING_KEYWORDS,
    *WTG_KEYWORDS,
    *SOURCE_CONTEXT_KEYWORDS,
]


class WebScraperService:
    def __init__(
        self,
        db_path: Optional[str] = None,
        *,
        timeout: int = 20,
        delay_seconds: float = 0.4,
    ) -> None:
        self.db_path = db_path
        self.timeout = timeout
        self.delay_seconds = delay_seconds
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT})
        self._robots_cache: dict[str, RobotFileParser] = {}

    def scrape(
        self,
        *,
        urls: Optional[list[str]] = None,
        max_pages: int = 20,
        follow_links: bool = True,
        respect_robots: bool = True,
    ) -> ScrapeResult:
        seed_urls = [normalize_url(url) for url in (urls or DEFAULT_WEB_SOURCES)]
        queue = deque(url for url in seed_urls if url)
        visited: set[str] = set()
        scraped = 0
        skipped = 0
        errors: list[dict[str, str]] = []

        while queue and len(visited) < max_pages:
            url = queue.popleft()
            if not url or url in visited:
                continue
            visited.add(url)

            if respect_robots and not self._can_fetch(url):
                skipped += 1
                errors.append({"url": url, "error": "Blocked by robots.txt"})
                continue

            try:
                page = self._fetch(url)
                if page is None:
                    skipped += 1
                    continue

                item = self._page_to_item(url, page)
                if item is None:
                    skipped += 1
                else:
                    try:
                        if self.db_path:
                            create_item(**item, db_path=self.db_path)
                        else:
                            create_item(**item)
                        scraped += 1
                    except sqlite3.IntegrityError:
                        skipped += 1

                if follow_links:
                    for link in extract_candidate_links(url, page):
                        if link not in visited and len(visited) + len(queue) < max_pages * 4:
                            queue.append(link)
                sleep(self.delay_seconds)
            except Exception as exc:
                errors.append({"url": url, "error": str(exc)})

        return ScrapeResult(scraped=scraped, skipped=skipped, errors=errors)

    def _fetch(self, url: str) -> Optional[str]:
        response = self.session.get(url, timeout=self.timeout)
        response.raise_for_status()
        content_type = response.headers.get("content-type", "").lower()
        if "html" not in content_type:
            return None
        return response.text

    def _page_to_item(self, url: str, html: str) -> Optional[dict[str, object]]:
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "noscript", "svg", "form", "nav", "footer"]):
            tag.decompose()

        title = extract_title(soup, url)
        raw_text = extract_readable_text(soup)
        if not raw_text or len(raw_text) < 80:
            return None
        if (
            is_listing_page(url)
            or is_low_value_page(url, title)
            or not is_relevant_item(title, raw_text, url)
        ):
            return None

        published_at = extract_published_at(soup)
        language = detect_language(raw_text)
        return {
            "title": title,
            "url": url,
            "source": urlparse(url).netloc or "web",
            "published_at": published_at,
            "language": language,
            "raw_text": raw_text,
        }

    def _can_fetch(self, url: str) -> bool:
        parsed = urlparse(url)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        if origin not in self._robots_cache:
            parser = RobotFileParser()
            parser.set_url(urljoin(origin, "/robots.txt"))
            try:
                parser.read()
            except Exception:
                return True
            self._robots_cache[origin] = parser
        return self._robots_cache[origin].can_fetch(USER_AGENT, url)


def normalize_url(url: str) -> Optional[str]:
    url = (url or "").strip()
    if not url:
        return None
    url, _fragment = urldefrag(url)
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    return url


def extract_title(soup: BeautifulSoup, url: str) -> str:
    for selector in [
        ("meta", {"property": "og:title"}),
        ("meta", {"name": "twitter:title"}),
    ]:
        tag = soup.find(*selector)
        if tag and tag.get("content"):
            return clean_text(tag["content"])[:300]
    if soup.title and soup.title.string:
        return clean_text(soup.title.string)[:300]
    heading = soup.find(["h1", "h2"])
    if heading:
        return clean_text(heading.get_text(" "))[:300]
    return url


def extract_readable_text(soup: BeautifulSoup) -> str:
    chunks: list[str] = []
    description = soup.find("meta", attrs={"name": "description"})
    if description and description.get("content"):
        chunks.append(clean_text(description["content"]))

    for selector in ["article", "main"]:
        area = soup.find(selector)
        if area:
            chunks.extend(text_blocks(area))
            break
    if len(" ".join(chunks)) < 400:
        chunks.extend(text_blocks(soup))

    seen: set[str] = set()
    unique_chunks: list[str] = []
    for chunk in chunks:
        normalized = clean_text(chunk)
        if len(normalized) < 40 or normalized.lower() in seen:
            continue
        seen.add(normalized.lower())
        unique_chunks.append(normalized)

    return clean_text(" ".join(unique_chunks))[:12000]


def text_blocks(soup: BeautifulSoup) -> list[str]:
    blocks: list[str] = []
    for tag in soup.find_all(["h1", "h2", "h3", "p", "li"]):
        text = clean_text(tag.get_text(" "))
        if text:
            blocks.append(text)
    return blocks


def extract_candidate_links(base_url: str, html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    base_domain = urlparse(base_url).netloc
    scored_links: list[tuple[int, str]] = []
    for anchor in soup.find_all("a", href=True):
        href = normalize_url(urljoin(base_url, anchor["href"]))
        if not href or href == base_url:
            continue
        parsed = urlparse(href)
        if parsed.netloc != base_domain:
            continue
        link_text = clean_text(anchor.get_text(" "))
        if is_low_value_page(href, link_text):
            continue
        haystack = f"{href} {link_text}".lower()
        score = relevance_score(haystack)
        if score > 0:
            scored_links.append((score, href))

    prioritized: list[str] = []
    for _score, href in sorted(scored_links, key=lambda pair: pair[0], reverse=True):
        if href not in prioritized:
            prioritized.append(href)
    return prioritized


def is_listing_page(url: str) -> bool:
    parsed = urlparse(url)
    path = parsed.path.rstrip("/").lower()
    if parsed.query and path.endswith(("/updates", "/jobs", "/training")):
        return True
    if "/tag/" in path:
        return True
    if path in {"/country/bdi", "/en/news", "/news"}:
        return True
    if path.endswith(("/projects", "/our-projects")):
        return True
    if parsed.netloc == "www.unocha.org" and path == "/burundi":
        return True
    if parsed.netloc == "www.gavi.org" and "/country-hub/africa/burundi" in path:
        return True
    if parsed.netloc == "response.reliefweb.int" and path.endswith("/reports"):
        return True
    return False


def is_low_value_page(url: str, title_or_text: str) -> bool:
    parsed = urlparse(url)
    path = parsed.path.rstrip("/").lower()
    label = clean_text(title_or_text).lower()
    base_label = re.split(r"\s*[-–—|]\s*", label, maxsplit=1)[0]
    if not path or path in {"/", "/en"}:
        return True
    low_value_labels = {
        "about",
        "about us",
        "board",
        "board members",
        "chairman's speech",
        "contact",
        "contact us",
        "faq",
        "fqa",
        "home",
        "home en",
        "imprint",
        "legal notice",
        "news from recadec",
        "our mission",
        "our vision",
        "our projects",
        "privacy",
        "privacy policy",
        "project objectives",
        "target beneficiaries",
        "what we do",
    }
    if label in low_value_labels or base_label in low_value_labels:
        return True
    if any(
        part in path
        for part in (
            "/contact",
            "/about",
            "/privacy",
            "/imprint",
            "/faq",
            "/fqa",
            "/mission",
            "/vision",
            "/target-beneficiaries",
        )
    ):
        return True
    if "message from" in label and "president" in label:
        return True
    return False


def is_relevant_item(title: str, raw_text: str, url: str) -> bool:
    haystack = f"{title} {raw_text} {url}".lower()
    geo_hits = keyword_hits(haystack, GEOGRAPHY_KEYWORDS)
    burundi_kids_hits = keyword_hits(haystack, BURUNDI_KIDS_KEYWORDS)
    funding_hits = keyword_hits(haystack, FUNDING_KEYWORDS)
    wtg_hits = keyword_hits(haystack, WTG_KEYWORDS)
    source_hits = keyword_hits(haystack, SOURCE_CONTEXT_KEYWORDS)

    if geo_hits and (burundi_kids_hits or funding_hits or source_hits):
        return True
    if funding_hits and (burundi_kids_hits or "africa" in haystack or "ngo" in haystack):
        return True
    if wtg_hits and any(
        context in haystack for context in ("africa", "global", "germany", "europe")
    ):
        return True
    if "recadec" in haystack and any(
        context in haystack
        for context in ("burundi", "bujumbura", "great lakes", "education", "youth")
    ):
        return True
    return False


def relevance_score(haystack: str) -> int:
    return (
        len(keyword_hits(haystack, GEOGRAPHY_KEYWORDS)) * 3
        + len(keyword_hits(haystack, BURUNDI_KIDS_KEYWORDS)) * 2
        + len(keyword_hits(haystack, FUNDING_KEYWORDS)) * 3
        + len(keyword_hits(haystack, WTG_KEYWORDS)) * 2
        + len(keyword_hits(haystack, SOURCE_CONTEXT_KEYWORDS))
    )


def keyword_hits(haystack: str, keywords: list[str]) -> list[str]:
    return [keyword for keyword in keywords if keyword in haystack]


def extract_published_at(soup: BeautifulSoup) -> Optional[str]:
    selectors = [
        ("meta", {"property": "article:published_time"}),
        ("meta", {"name": "date"}),
        ("meta", {"name": "dc.date"}),
        ("time", {}),
    ]
    for name, attrs in selectors:
        tag = soup.find(name, attrs=attrs)
        value = None
        if tag:
            value = tag.get("content") or tag.get("datetime") or tag.get_text(" ")
        parsed = parse_datetime(value)
        if parsed:
            return parsed
    return None


def parse_datetime(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    value = value.strip()
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    except ValueError:
        return None


def detect_language(text: str) -> str:
    try:
        detected = detect_langs(text)
    except LangDetectException:
        return "unknown"
    if not detected or detected[0].prob < 0.80:
        return "unknown"
    return detected[0].lang


def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()
