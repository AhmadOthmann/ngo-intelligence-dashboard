import re
from datetime import datetime, timezone
from typing import Any, Optional

from .ai_service import AIService
from .database import get_item, list_funding_items, list_items, update_item_fields
from .models import AnalyzeAllResponse, DigestMVPResponse, Item


TARGET_KEYWORDS = [
    "burundi",
    "bujumbura",
    "gitega",
    "education",
    "school",
    "children",
    "girls",
    "health",
    "animal welfare",
    "wildlife",
    "rabies",
    "funding",
    "grant",
    "ngo",
    "humanitarian",
    "east africa",
]

FUNDING_KEYWORDS = [
    "funding",
    "grant",
    "proposal",
    "call for proposals",
    "deadline",
    "application",
    "bmz",
    "stiftung",
    "ngo",
    "project funding",
]


class AnalysisService:
    def __init__(self) -> None:
        self.ai = AIService()

    def analyze_item(self, item_id: int) -> Optional[Item]:
        item = get_item(item_id)
        if item is None:
            return None

        text = _combined_text(item)
        summary = self._summarize(text)
        category = _classify(text)
        relevance_score = _relevance_score(text)
        is_funding = _is_funding(text)
        deadline = _extract_deadline(text) if is_funding else None
        target_org = _detect_target_org(text)

        return update_item_fields(
            item_id,
            {
                "summary": summary,
                "category": category,
                "relevance_score": relevance_score,
                "is_funding_opportunity": is_funding,
                "deadline": deadline,
                "target_org": target_org,
            },
        )

    def analyze_all(self, limit: int = 100) -> AnalyzeAllResponse:
        analyzed = 0
        errors: list[dict[str, Any]] = []
        for item in list_items(limit=limit, offset=0):
            try:
                updated = self.analyze_item(item.id)
                if updated is not None:
                    analyzed += 1
            except Exception as exc:
                errors.append({"item_id": item.id, "error": str(exc)})
        return AnalyzeAllResponse(analyzed=analyzed, errors=errors)

    def translate_item(self, item_id: int, target_language: str) -> Optional[Item]:
        item = get_item(item_id)
        if item is None:
            return None

        source_text = item.summary or _truncate(_strip_html(item.raw_text), 600)
        translated = self.ai.generate_text(
            system=f"Translate NGO intelligence text into {target_language}.",
            prompt=source_text,
            max_tokens=600,
        )
        if not translated:
            translated = (
                f"[Demo translation fallback: {target_language}] "
                f"{source_text}"
            )

        return update_item_fields(
            item_id,
            {
                "translated_text": translated,
                "translated_language": target_language,
            },
        )

    def digest(self) -> DigestMVPResponse:
        items = list_items(limit=100, offset=0)
        analyzed_items = [item for item in items if item.relevance_score is not None]
        top_items = sorted(
            analyzed_items,
            key=lambda item: (item.relevance_score or 0.0, item.created_at),
            reverse=True,
        )[:10]
        funding_items = list_funding_items(limit=10, offset=0)
        summary_text = _digest_summary(top_items, funding_items, len(items))

        return DigestMVPResponse(
            generated_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            top_items=top_items,
            funding_items=funding_items,
            summary_text=summary_text,
        )

    def _summarize(self, text: str) -> str:
        ai_summary = self.ai.generate_text(
            system="Summarize this NGO intelligence item in one plain sentence.",
            prompt=text[:4000],
            max_tokens=120,
        )
        if ai_summary:
            return _truncate(ai_summary.strip(), 200)
        return _truncate(_strip_html(text), 200)


def _combined_text(item: Item) -> str:
    return f"{item.title}\n\n{item.raw_text}"


def _strip_html(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", text)).strip()


def _truncate(text: str, limit: int) -> str:
    text = _strip_html(text)
    if len(text) <= limit:
        return text
    return f"{text[: limit - 3].rstrip()}..."


def _classify(text: str) -> str:
    lower = text.lower()
    if _is_funding(text):
        return "funding"
    if any(word in lower for word in ["policy", "regulation", "government", "law"]):
        return "policy"
    if any(word in lower for word in ["research", "report", "study", "survey"]):
        return "research"
    if any(word in lower for word in ["news", "update", "announced", "said"]):
        return "news"
    return "other"


def _relevance_score(text: str) -> float:
    lower = text.lower()
    matches = sum(1 for keyword in TARGET_KEYWORDS if keyword in lower)
    return round(min(1.0, matches / 8), 2)


def _is_funding(text: str) -> bool:
    lower = text.lower()
    return any(keyword in lower for keyword in FUNDING_KEYWORDS)


def _extract_deadline(text: str) -> Optional[str]:
    patterns = [
        r"\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b",
        r"\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b",
        r"\b(?:deadline|due|apply by|until)\D{0,30}([A-Z][a-z]+ \d{1,2}, 20\d{2})\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if not match:
            continue
        try:
            if len(match.groups()) == 3 and match.group(1).startswith("20"):
                year, month, day = match.groups()
                return f"{int(year):04d}-{int(month):02d}-{int(day):02d}"
            if len(match.groups()) == 3:
                day, month, year = match.groups()
                return f"{int(year):04d}-{int(month):02d}-{int(day):02d}"
            parsed = datetime.strptime(match.group(1), "%B %d, %Y")
            return parsed.date().isoformat()
        except ValueError:
            continue
    return None


def _detect_target_org(text: str) -> Optional[str]:
    lower = text.lower()
    burundi_score = sum(
        1
        for keyword in ["burundi", "bujumbura", "gitega", "education", "girls", "children", "school"]
        if keyword in lower
    )
    wtg_score = sum(
        1
        for keyword in ["animal", "wildlife", "rabies", "welfare", "trade", "consumer"]
        if keyword in lower
    )
    if burundi_score == 0 and wtg_score == 0:
        return None
    if burundi_score >= wtg_score:
        return "Burundi Kids"
    return "WTG"


def _digest_summary(top_items: list[Item], funding_items: list[Item], total_items: int) -> str:
    if total_items == 0:
        return "No ingested items are available yet. Use Ingest RSS to load demo intelligence."
    if not top_items and not funding_items:
        return (
            f"{total_items} items are ingested. Run Analyze All to generate relevance scores, "
            "summaries, and funding flags."
        )
    themes = sorted(
        {
            item.category
            for item in top_items
            if item.category
        }
    )
    theme_text = ", ".join(themes) if themes else "mixed NGO intelligence"
    return (
        f"{len(top_items)} high-priority analyzed items are available across {theme_text}. "
        f"{len(funding_items)} funding opportunities are currently visible."
    )
