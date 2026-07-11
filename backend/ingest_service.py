from datetime import datetime, timezone
import sqlite3
from time import struct_time
from typing import Any, Optional
from urllib.parse import urlparse

import feedparser
from langdetect import LangDetectException, detect_langs
import requests

from .database import create_item
from .http_client import fetch_public_url, validate_public_url
from .models import IngestResult


DEFAULT_RSS_FEEDS = [
    "https://reliefweb.int/updates/rss.xml",
    "https://www.devex.com/news/rss",
    "https://feeds.bbci.co.uk/news/world/africa/rss.xml",
]


class IngestService:
    def __init__(self, db_path: Optional[str] = None) -> None:
        self.db_path = db_path
        self.session = requests.Session()
        self.session.trust_env = False
        self.session.headers.update({"User-Agent": "impact-atlas/0.1 (+local hackathon demo)"})

    def ingest(self, feeds: Optional[list[str]] = None) -> IngestResult:
        feed_urls = DEFAULT_RSS_FEEDS if feeds is None else feeds
        ingested = 0
        errors: list[dict[str, str]] = []

        for feed_url in feed_urls:
            try:
                parsed_feed = self._fetch_feed(feed_url)
                for entry in parsed_feed.entries:
                    item = self._entry_to_item(feed_url, entry)
                    if item is None:
                        continue

                    try:
                        create_item(**item, db_path=self.db_path) if self.db_path else create_item(**item)
                        ingested += 1
                    except sqlite3.IntegrityError:
                        continue
            except Exception as exc:
                errors.append({"feed_url": feed_url, "error": str(exc)})

        return IngestResult(ingested=ingested, errors=errors)

    def _fetch_feed(self, feed_url: str) -> Any:
        response = fetch_public_url(
            self.session,
            feed_url,
            timeout=(5, 30),
            accepted_content_types=("xml", "rss", "atom", "text/plain"),
        )
        parsed_feed = feedparser.parse(response.content)
        if parsed_feed.bozo:
            raise RuntimeError(f"Invalid RSS/Atom feed: {parsed_feed.bozo_exception}")
        return parsed_feed

    def _entry_to_item(self, feed_url: str, entry: Any) -> Optional[dict[str, Any]]:
        title = self._get_text(entry, "title")
        url = self._get_text(entry, "link")
        if not title or not url:
            return None
        try:
            url = validate_public_url(
                url,
                allowed_domains=(),
                require_allowlist_in_production=False,
            )
        except ValueError:
            return None

        raw_text = self._extract_raw_text(entry, title)
        return {
            "title": title,
            "url": url,
            "source": self._source_from_url(url, feed_url),
            "published_at": self._published_at(entry),
            "language": self._detect_language(raw_text),
            "raw_text": raw_text,
        }

    def _extract_raw_text(self, entry: Any, title: str) -> str:
        content = getattr(entry, "content", None)
        if content:
            value = content[0].get("value") if isinstance(content[0], dict) else None
            if value and value.strip():
                return value.strip()

        for field in ("summary", "description"):
            value = self._get_text(entry, field)
            if value:
                return value
        return title

    def _detect_language(self, text: str) -> str:
        try:
            detected = detect_langs(text)
        except LangDetectException:
            return "unknown"

        if not detected or detected[0].prob < 0.80:
            return "unknown"
        return detected[0].lang

    def _published_at(self, entry: Any) -> Optional[str]:
        parsed_time = getattr(entry, "published_parsed", None) or getattr(
            entry, "updated_parsed", None
        )
        if not isinstance(parsed_time, struct_time):
            return None

        published = datetime(*parsed_time[:6], tzinfo=timezone.utc)
        return published.isoformat().replace("+00:00", "Z")

    def _source_from_url(self, url: str, feed_url: str) -> str:
        return urlparse(url).netloc or urlparse(feed_url).netloc or "unknown"

    def _get_text(self, entry: Any, field: str) -> Optional[str]:
        value = getattr(entry, field, None)
        if value is None and isinstance(entry, dict):
            value = entry.get(field)
        if value is None:
            return None
        value = str(value).strip()
        return value or None
