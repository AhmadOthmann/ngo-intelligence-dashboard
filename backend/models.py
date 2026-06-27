from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


VALID_CATEGORIES = {
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
}
VALID_TARGET_ORGS = {"Burundi Kids", "WTG", "Both", "Unknown"}
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
    summary: Optional[str] = Field(default=None, max_length=1000)
    category: Optional[str] = None
    relevance_score: Optional[int] = None
    is_funding_opportunity: bool = False
    deadline: Optional[str] = None
    target_org: Optional[str] = None
    why_relevant: Optional[str] = None
    recommended_action: Optional[str] = None
    translated_text: Optional[str] = None
    translated_language: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in VALID_CATEGORIES:
            raise ValueError(
                "category must be one of: "
                + ", ".join(sorted(VALID_CATEGORIES))
            )
        return value

    @field_validator("relevance_score")
    @classmethod
    def validate_relevance_score(cls, value: Optional[int]) -> Optional[int]:
        if value is not None and not 0 <= value <= 100:
            raise ValueError("relevance_score must be between 0 and 100")
        return value

    @field_validator("target_org")
    @classmethod
    def validate_target_org(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in VALID_TARGET_ORGS:
            raise ValueError("target_org must be one of: Burundi Kids, WTG, Both, Unknown")
        return value


class IngestRequest(BaseModel):
    feeds: Optional[list[str]] = None


class IngestResult(BaseModel):
    ingested: int
    errors: list[dict[str, Any]]


class ScrapeRequest(BaseModel):
    urls: Optional[list[str]] = None
    max_pages: int = Field(default=10, ge=1, le=30)
    follow_links: bool = True
    respect_robots: bool = True


class ScrapeResult(BaseModel):
    scraped: int
    skipped: int
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


class ItemsResponse(BaseModel):
    items: list[Item]
    count: int
    limit: int
    offset: int


class HealthResponse(BaseModel):
    status: str
    ai_provider: str
    openai_configured: bool
    database: str


class DigestResponse(BaseModel):
    generated_at: str
    headline: str
    executive_summary: str
    top_priorities: list[str]
    funding_opportunities: list[str]
    recommended_actions: list[str]
    risk_alerts: list[str]
    top_items: list[Item] = Field(default_factory=list)
    funding_items: list[Item] = Field(default_factory=list)


class AnalyzeAllResponse(BaseModel):
    analyzed: int
    errors: list[dict[str, Any]]
