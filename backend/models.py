from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


VALID_CATEGORIES = {"news", "funding", "policy", "research", "other"}
VALID_TARGET_LANGUAGES = {"en", "fr", "de", "english", "french", "german"}
LANGUAGE_LABELS = {
    "en": "English",
    "english": "English",
    "fr": "French",
    "french": "French",
    "de": "German",
    "german": "German",
}


class Item(BaseModel):
    id: int
    title: str
    url: str
    source: str
    published_at: Optional[datetime] = None
    language: Optional[str] = None
    raw_text: str
    summary: Optional[str] = Field(default=None, max_length=200)
    category: Optional[str] = None
    relevance_score: Optional[float] = None
    is_funding_opportunity: bool = False
    deadline: Optional[str] = None
    target_org: Optional[str] = None
    translated_text: Optional[str] = None
    translated_language: Optional[str] = None
    created_at: datetime

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in VALID_CATEGORIES:
            raise ValueError(
                "category must be one of: news, funding, policy, research, other"
            )
        return value

    @field_validator("relevance_score")
    @classmethod
    def validate_relevance_score(cls, value: Optional[float]) -> Optional[float]:
        if value is not None and not 0.0 <= value <= 1.0:
            raise ValueError("relevance_score must be between 0.0 and 1.0")
        return value


class IngestRequest(BaseModel):
    feeds: Optional[list[str]] = None


class IngestResult(BaseModel):
    ingested: int
    errors: list[dict[str, Any]]


class TranslateRequest(BaseModel):
    target_language: str

    @field_validator("target_language")
    @classmethod
    def validate_target_language(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in VALID_TARGET_LANGUAGES:
            raise ValueError("target_language must be one of: English, French, German")
        return LANGUAGE_LABELS[normalized]


class DigestResponse(BaseModel):
    briefing_date: str
    summary: str = Field(max_length=500)
    items: list[Item] = Field(max_length=20)


class DigestMVPResponse(BaseModel):
    generated_at: str
    top_items: list[Item]
    funding_items: list[Item]
    summary_text: str


class AnalyzeAllResponse(BaseModel):
    analyzed: int
    errors: list[dict[str, Any]]
