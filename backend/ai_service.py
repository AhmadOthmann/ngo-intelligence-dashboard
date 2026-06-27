import json
import os
import re
from datetime import datetime
from typing import Any, Optional

from dotenv import load_dotenv


load_dotenv()


CATEGORIES = [
    "Burundi",
    "Funding",
    "Health",
    "Education",
    "GBV",
    "Animal Welfare",
    "Humanitarian",
    "Politics/Security",
    "Development",
    "Other",
]
TARGET_ORGS = ["Burundi Kids", "WTG", "Both", "Unknown"]
FUNDING_KEYWORDS = [
    "funding",
    "grant",
    "proposal",
    "call for proposals",
    "deadline",
    "application",
    "bmz",
    "stiftung",
    "foundation",
    "project funding",
    "small grants",
]
BURUNDI_KEYWORDS = [
    "burundi",
    "bujumbura",
    "gitega",
    "gateri",
    "great lakes",
    "drc/burundi",
    "burundi border",
    "education",
    "vocational",
    "school",
    "girls",
    "women",
    "gender-based violence",
    "gbv",
    "health",
    "refugee",
    "humanitarian",
]
WTG_KEYWORDS = [
    "animal welfare",
    "wildlife",
    "poaching",
    "wildlife trade",
    "rabies",
    "farm animals",
    "donkey skin",
    "puppy trade",
    "tourism",
    "animal ethics",
    "consumer protection",
]


class AIService:
    def __init__(self) -> None:
        load_dotenv()
        self.provider = os.environ.get("AI_PROVIDER", "none").strip().lower() or "none"
        self.api_key = os.environ.get("OPENAI_API_KEY", "").strip()
        self.model = os.environ.get("OPENAI_MODEL", "gpt-5.4-mini").strip()
        self.reasoning_effort = os.environ.get("OPENAI_REASONING_EFFORT", "low").strip()

    @property
    def openai_configured(self) -> bool:
        return self.provider == "openai" and _looks_like_api_key(self.api_key)

    def analyze_item(self, item: dict[str, Any]) -> dict[str, Any]:
        fallback = _fallback_analysis(item)
        if not self.openai_configured:
            return fallback

        payload = {
            "title": item.get("title"),
            "source": item.get("source"),
            "published_at": _json_safe_datetime(item.get("published_at")),
            "language": item.get("language"),
            "raw_text": _truncate(_strip_html(str(item.get("raw_text") or "")), 6000),
        }
        prompt = (
            "Analyze this item as practical NGO intelligence for Burundi Kids and WTG. "
            "Classify relevance for Burundi, Bujumbura, Gitega, Gateri, Great Lakes, "
            "DRC/Burundi border, education, vocational training, GBV, women/girls, "
            "health, humanitarian/refugee topics, small German NGO funding, BMZ, "
            "foundation grants, animal welfare, poaching, wildlife trade, rabies, "
            "farm animals, donkey skin trade, puppy trade, tourism/animal ethics, "
            "and WTG project countries/topics. Return only JSON.\n\n"
            f"Item JSON:\n{json.dumps(payload, ensure_ascii=True)}"
        )
        result = self._create_json(
            name="ngo_item_analysis",
            schema=_analysis_schema(),
            instructions=(
                "You are an NGO intelligence analyst. Produce concise, practical, "
                "non-generic intelligence for small NGO teams. Use only the allowed "
                "category and target_org values."
            ),
            prompt=prompt,
        )
        return _validate_analysis(result, fallback)

    def translate_text(self, text: str, target_language: str) -> dict[str, Any]:
        fallback = {
            "target_language": target_language,
            "translated_text": (
                f"[Demo translation fallback: {target_language}] "
                f"{_truncate(_strip_html(text), 1200)}"
            ),
            "quality_note": "Fallback mode: no OpenAI API call was made.",
        }
        if not self.openai_configured:
            return fallback

        result = self._create_json(
            name="ngo_translation",
            schema=_translation_schema(),
            instructions=(
                "Translate NGO communications faithfully. Preserve names, dates, "
                "funding deadlines, and practical action details."
            ),
            prompt=(
                f"Translate the following text into {target_language}. "
                "Return only JSON.\n\n"
                f"{_truncate(_strip_html(text), 6000)}"
            ),
        )
        return _validate_translation(result, fallback, target_language)

    def generate_digest(
        self,
        items: list[dict[str, Any]],
        funding_items: list[dict[str, Any]],
    ) -> dict[str, Any]:
        fallback = _fallback_digest(items, funding_items)
        if not self.openai_configured:
            return fallback

        compact_items = [_compact_item(item) for item in items[:20]]
        compact_funding = [_compact_item(item) for item in funding_items[:10]]
        result = self._create_json(
            name="ngo_daily_digest",
            schema=_digest_schema(),
            instructions=(
                "You write NGO-ready daily briefings for Burundi Kids and WTG. "
                "Be specific, action-oriented, and careful about uncertainty."
            ),
            prompt=(
                "Create a daily NGO intelligence briefing. Return only JSON.\n\n"
                f"Top items:\n{json.dumps(compact_items, ensure_ascii=True)}\n\n"
                f"Funding items:\n{json.dumps(compact_funding, ensure_ascii=True)}"
            ),
        )
        return _validate_digest(result, fallback)

    def _create_json(
        self,
        *,
        name: str,
        schema: dict[str, Any],
        instructions: str,
        prompt: str,
    ) -> Optional[dict[str, Any]]:
        try:
            from openai import OpenAI

            client = OpenAI(api_key=self.api_key)
            response = client.responses.create(
                model=self.model,
                instructions=instructions,
                input=prompt,
                reasoning={"effort": self.reasoning_effort},
                text={
                    "format": {
                        "type": "json_schema",
                        "name": name,
                        "schema": schema,
                        "strict": True,
                    }
                },
            )
            output = getattr(response, "output_text", None) or _extract_response_text(response)
            if not output:
                return None
            return _parse_json_object(output)
        except Exception:
            return None


def _analysis_schema() -> dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": False,
        "required": [
            "summary",
            "category",
            "relevance_score",
            "is_funding_opportunity",
            "deadline",
            "target_org",
            "why_relevant",
            "recommended_action",
        ],
        "properties": {
            "summary": {"type": "string"},
            "category": {"type": "string", "enum": CATEGORIES},
            "relevance_score": {"type": "integer", "minimum": 0, "maximum": 100},
            "is_funding_opportunity": {"type": "boolean"},
            "deadline": {"type": ["string", "null"]},
            "target_org": {"type": "string", "enum": TARGET_ORGS},
            "why_relevant": {"type": "string"},
            "recommended_action": {"type": "string"},
        },
    }


def _translation_schema() -> dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": False,
        "required": ["target_language", "translated_text", "quality_note"],
        "properties": {
            "target_language": {"type": "string", "enum": ["German", "French", "English"]},
            "translated_text": {"type": "string"},
            "quality_note": {"type": "string"},
        },
    }


def _digest_schema() -> dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": False,
        "required": [
            "headline",
            "executive_summary",
            "top_priorities",
            "funding_opportunities",
            "recommended_actions",
            "risk_alerts",
        ],
        "properties": {
            "headline": {"type": "string"},
            "executive_summary": {"type": "string"},
            "top_priorities": {"type": "array", "items": {"type": "string"}},
            "funding_opportunities": {"type": "array", "items": {"type": "string"}},
            "recommended_actions": {"type": "array", "items": {"type": "string"}},
            "risk_alerts": {"type": "array", "items": {"type": "string"}},
        },
    }


def _validate_analysis(
    result: Optional[dict[str, Any]],
    fallback: dict[str, Any],
) -> dict[str, Any]:
    if not result:
        return fallback
    category = result.get("category")
    target_org = result.get("target_org")
    if category not in CATEGORIES or target_org not in TARGET_ORGS:
        return fallback
    try:
        score = int(result.get("relevance_score", fallback["relevance_score"]))
    except (TypeError, ValueError):
        score = fallback["relevance_score"]
    return {
        "summary": _truncate(str(result.get("summary") or fallback["summary"]), 1000),
        "category": category,
        "relevance_score": max(0, min(100, score)),
        "is_funding_opportunity": bool(result.get("is_funding_opportunity")),
        "deadline": result.get("deadline") or None,
        "target_org": target_org,
        "why_relevant": _truncate(
            str(result.get("why_relevant") or fallback["why_relevant"]),
            800,
        ),
        "recommended_action": _truncate(
            str(result.get("recommended_action") or fallback["recommended_action"]),
            500,
        ),
    }


def _validate_translation(
    result: Optional[dict[str, Any]],
    fallback: dict[str, Any],
    target_language: str,
) -> dict[str, Any]:
    if not result:
        return fallback
    translated = str(result.get("translated_text") or "").strip()
    if not translated:
        return fallback
    return {
        "target_language": target_language,
        "translated_text": translated,
        "quality_note": str(result.get("quality_note") or "OpenAI translation completed."),
    }


def _validate_digest(
    result: Optional[dict[str, Any]],
    fallback: dict[str, Any],
) -> dict[str, Any]:
    if not result:
        return fallback
    validated: dict[str, Any] = {}
    for key in ["headline", "executive_summary"]:
        value = str(result.get(key) or fallback[key]).strip()
        validated[key] = value or fallback[key]
    for key in ["top_priorities", "funding_opportunities", "recommended_actions", "risk_alerts"]:
        values = result.get(key)
        if not isinstance(values, list):
            values = fallback[key]
        validated[key] = [str(value) for value in values[:6] if str(value).strip()]
    return validated


def _fallback_analysis(item: dict[str, Any]) -> dict[str, Any]:
    title = str(item.get("title") or "")
    text = f"{title}\n\n{item.get('raw_text') or ''}"
    clean = _strip_html(text)
    lower = clean.lower()
    is_funding = any(keyword in lower for keyword in FUNDING_KEYWORDS)
    category = _classify(lower, is_funding)
    target_org = _target_org(lower)
    score = _score(lower, is_funding, target_org)
    deadline = _extract_deadline(clean) if is_funding else None
    summary = _summary_from_text(clean)
    why = _why_relevant(category, target_org, is_funding)
    action = _recommended_action(category, is_funding, deadline)
    return {
        "summary": summary,
        "category": category,
        "relevance_score": score,
        "is_funding_opportunity": is_funding,
        "deadline": deadline,
        "target_org": target_org,
        "why_relevant": why,
        "recommended_action": action,
    }


def _classify(lower: str, is_funding: bool) -> str:
    if is_funding:
        return "Funding"
    if any(word in lower for word in ["burundi", "bujumbura", "gitega", "gateri"]):
        return "Burundi"
    if any(word in lower for word in ["school", "education", "teacher", "vocational"]):
        return "Education"
    if any(word in lower for word in ["gbv", "gender-based violence", "women", "girls"]):
        return "GBV"
    if any(word in lower for word in ["health", "rabies", "clinic", "disease", "ebola"]):
        return "Health"
    if any(word in lower for word in ["animal", "wildlife", "poaching", "donkey", "puppy"]):
        return "Animal Welfare"
    if any(word in lower for word in ["refugee", "humanitarian", "displacement", "relief"]):
        return "Humanitarian"
    if any(word in lower for word in ["policy", "security", "government", "conflict", "border"]):
        return "Politics/Security"
    if any(word in lower for word in ["development", "training", "livelihood", "capacity"]):
        return "Development"
    return "Other"


def _target_org(lower: str) -> str:
    burundi_hits = sum(1 for keyword in BURUNDI_KEYWORDS if keyword in lower)
    wtg_hits = sum(1 for keyword in WTG_KEYWORDS if keyword in lower)
    if burundi_hits and wtg_hits:
        return "Both"
    if burundi_hits:
        return "Burundi Kids"
    if wtg_hits:
        return "WTG"
    return "Unknown"


def _score(lower: str, is_funding: bool, target_org: str) -> int:
    matches = 0
    matches += sum(1 for keyword in BURUNDI_KEYWORDS if keyword in lower)
    matches += sum(1 for keyword in WTG_KEYWORDS if keyword in lower)
    matches += sum(1 for keyword in FUNDING_KEYWORDS if keyword in lower)
    score = min(100, 15 + matches * 8)
    if is_funding:
        score += 12
    if target_org in {"Burundi Kids", "WTG", "Both"}:
        score += 10
    return max(0, min(100, score))


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


def _summary_from_text(text: str) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", _strip_html(text))
    useful = [sentence for sentence in sentences if sentence][:4]
    return _truncate(" ".join(useful) if useful else text, 700)


def _why_relevant(category: str, target_org: str, is_funding: bool) -> str:
    if is_funding:
        return "This may create a funding or partnership opportunity for a small NGO team."
    if target_org == "Both":
        return "The topic overlaps with both Burundi Kids and WTG priorities."
    if target_org != "Unknown":
        return f"The topic matches {target_org} focus areas and should be reviewed."
    return f"The item is categorized as {category} and may be useful background intelligence."


def _recommended_action(category: str, is_funding: bool, deadline: Optional[str]) -> str:
    if is_funding:
        if deadline:
            return f"Check eligibility and decide whether to apply before {deadline}."
        return "Check eligibility, budget fit, and application deadline from the source."
    if category in {"Humanitarian", "Politics/Security", "Health"}:
        return "Review for operational risk and partner communication needs."
    return "Save or share with the relevant program lead if it affects current work."


def _fallback_digest(
    items: list[dict[str, Any]],
    funding_items: list[dict[str, Any]],
) -> dict[str, Any]:
    top_items = sorted(
        items,
        key=lambda item: int(item.get("relevance_score") or 0),
        reverse=True,
    )[:5]
    top_titles = [str(item.get("title") or "Untitled") for item in top_items]
    funding_titles = [str(item.get("title") or "Funding item") for item in funding_items[:5]]
    if not items:
        return {
            "headline": "NGO intelligence briefing: no items yet",
            "executive_summary": "No ingested items are available yet. Start with RSS ingestion or demo reset.",
            "top_priorities": ["Ingest RSS feeds", "Run Analyze All", "Review funding results"],
            "funding_opportunities": [],
            "recommended_actions": ["Click Ingest RSS, then Analyze All."],
            "risk_alerts": ["No current risk alerts because no items have been analyzed."],
        }
    return {
        "headline": "NGO intelligence briefing for Burundi Kids and WTG",
        "executive_summary": (
            f"{len(items)} analyzed or recent items are available. "
            f"{len(funding_items)} funding opportunities are visible. "
            "Review the highest relevance items first, then check funding deadlines."
        ),
        "top_priorities": top_titles or ["Review latest RSS items"],
        "funding_opportunities": funding_titles,
        "recommended_actions": [
            "Review high relevance items with program leads.",
            "Check funding eligibility and deadlines.",
            "Translate priority items for team or partner communication.",
        ],
        "risk_alerts": [
            str(item.get("title") or "Review item")
            for item in top_items
            if str(item.get("category") or "") in {"Health", "Humanitarian", "Politics/Security"}
        ][:5],
    }


def _compact_item(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "title": item.get("title"),
        "source": item.get("source"),
        "category": item.get("category"),
        "relevance_score": item.get("relevance_score"),
        "is_funding_opportunity": item.get("is_funding_opportunity"),
        "deadline": item.get("deadline"),
        "target_org": item.get("target_org"),
        "summary": _truncate(str(item.get("summary") or item.get("raw_text") or ""), 700),
        "why_relevant": item.get("why_relevant"),
        "recommended_action": item.get("recommended_action"),
    }


def _looks_like_api_key(value: str) -> bool:
    if not value:
        return False
    lowered = value.lower()
    if "replace" in lowered or "your_openai_api_key_here" in lowered:
        return False
    return value.startswith("sk-")


def _parse_json_object(text: str) -> Optional[dict[str, Any]]:
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if not match:
            return None
        try:
            parsed = json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return parsed if isinstance(parsed, dict) else None


def _extract_response_text(response: Any) -> str:
    try:
        chunks: list[str] = []
        for output in getattr(response, "output", []) or []:
            for content in getattr(output, "content", []) or []:
                text = getattr(content, "text", None)
                if text:
                    chunks.append(text)
        return "\n".join(chunks)
    except Exception:
        return ""


def _json_safe_datetime(value: Any) -> Any:
    return value.isoformat() if hasattr(value, "isoformat") else value


def _strip_html(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", text)).strip()


def _truncate(text: str, limit: int) -> str:
    text = _strip_html(text)
    if len(text) <= limit:
        return text
    return f"{text[: limit - 3].rstrip()}..."
