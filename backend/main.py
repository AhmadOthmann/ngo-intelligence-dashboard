import os
from contextlib import asynccontextmanager
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Path, Query
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from .ai_service import AIService
from .analysis_service import AnalysisService
from .database import (
    clear_items,
    count_items,
    create_item,
    database_ok,
    get_item,
    init_db,
    list_funding_items,
    list_items,
)
from .ingest_service import IngestService
from .models import (
    AnalyzeAllResponse,
    DigestResponse,
    HealthResponse,
    IngestRequest,
    IngestResult,
    Item,
    ItemsResponse,
    ScrapeRequest,
    ScrapeResult,
    TranslateRequest,
    TranslateTextRequest,
    TranslateTextResponse,
)
from .web_scraper_service import WebScraperService


DEMO_ITEMS = [
    {
        "title": "BMZ small grants call for education projects in Burundi",
        "url": "https://example.org/demo/bmz-burundi-education",
        "source": "demo",
        "published_at": "2026-06-27T09:00:00Z",
        "language": "en",
        "raw_text": (
            "BMZ and a German foundation opened a call for proposals for small NGOs "
            "supporting education, vocational training, and girls in Burundi. "
            "Applications are due 2026-08-15."
        ),
    },
    {
        "title": "Gitega school network requests partners for vocational training",
        "url": "https://example.org/demo/gitega-vocational-training",
        "source": "demo",
        "published_at": "2026-06-27T10:00:00Z",
        "language": "en",
        "raw_text": (
            "Schools near Gitega and Gateri are seeking NGO partners for vocational "
            "training, school materials, and support for girls at risk of dropping out."
        ),
    },
    {
        "title": "Animal welfare groups warn of rising donkey skin trade",
        "url": "https://example.org/demo/donkey-skin-trade",
        "source": "demo",
        "published_at": "2026-06-27T11:00:00Z",
        "language": "en",
        "raw_text": (
            "Regional animal welfare organizations report increased donkey skin trade "
            "and puppy trafficking risks, with calls for advocacy and farm animal protection."
        ),
    },
    {
        "title": "Rabies vaccination campaign seeks NGO coordination",
        "url": "https://example.org/demo/rabies-campaign",
        "source": "demo",
        "published_at": "2026-06-27T12:00:00Z",
        "language": "en",
        "raw_text": (
            "A rabies response campaign needs animal welfare NGOs to coordinate local "
            "education, vaccination messaging, and community reporting."
        ),
    },
    {
        "title": "Great Lakes humanitarian update flags border displacement",
        "url": "https://example.org/demo/great-lakes-displacement",
        "source": "demo",
        "published_at": "2026-06-27T13:00:00Z",
        "language": "en",
        "raw_text": (
            "Humanitarian actors in the Great Lakes region report displacement near "
            "the DRC/Burundi border and increased needs for children, women, and health services."
        ),
    },
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="NGO Intelligence Dashboard API", lifespan=lifespan)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
]
LOCAL_NETWORK_ORIGIN_REGEX = (
    r"^https?://("
    r"localhost|127\.0\.0\.1|"
    r"10(?:\.\d{1,3}){3}|"
    r"192\.168(?:\.\d{1,3}){2}|"
    r"172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}"
    r")(?::\d+)?$"
)

extra_origins = os.environ.get("CORS_ORIGINS", "")
if extra_origins:
    ALLOWED_ORIGINS.extend(
        origin.strip() for origin in extra_origins.split(",") if origin.strip()
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=LOCAL_NETWORK_ORIGIN_REGEX,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "status": "ok",
        "ai_provider": os.environ.get("AI_PROVIDER", "none"),
    }


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    ai = AIService()
    return HealthResponse(
        status="ok",
        ai_provider=ai.provider,
        openai_configured=ai.openai_configured,
        database="ok" if database_ok() else "error",
    )


@app.post("/ingest/rss", response_model=IngestResult)
def ingest_rss(request: IngestRequest | None = None) -> IngestResult:
    feeds = request.feeds if request else None
    if feeds is not None and len(feeds) > 20:
        raise HTTPException(status_code=400, detail="Maximum number of feeds is 20")

    return IngestService().ingest(feeds)


@app.post(
    "/ingest/web",
    response_model=ScrapeResult,
    summary="Scrape web pages",
    description=(
        "Fetches real HTML pages, extracts readable content, optionally follows "
        "relevant links from seed pages, and stores scraped pages in SQLite."
    ),
)
def ingest_web(request: ScrapeRequest | None = None) -> ScrapeResult:
    request = request or ScrapeRequest()
    if request.urls is not None and len(request.urls) > 20:
        raise HTTPException(status_code=400, detail="Maximum number of seed URLs is 20")
    return WebScraperService().scrape(
        urls=request.urls,
        max_pages=request.max_pages,
        follow_links=request.follow_links,
        respect_robots=request.respect_robots,
    )


@app.get(
    "/items",
    response_model=ItemsResponse,
    summary="List stored intelligence items",
    description=(
        "Returns SQLite-backed items ordered by newest first. Supports keyword "
        "search, category/funding filters, total count, and offset pagination."
    ),
)
def get_items(
    q: str | None = Query(
        default=None,
        description="Keyword search across title, source, raw text, summary, and action fields.",
    ),
    category: str | None = Query(
        default=None,
        description="Optional category filter, such as Funding, Burundi, or Animal Welfare.",
    ),
    funding_only: bool = Query(
        default=False,
        description="Return only funding opportunities, using stored flags plus keyword fallback.",
    ),
    limit: int = Query(
        default=50,
        ge=1,
        le=200,
        description="Maximum number of items to return.",
    ),
    offset: int = Query(
        default=0,
        ge=0,
        description="Number of matching items to skip before returning results.",
    ),
) -> ItemsResponse:
    items = list_items(
        q=q,
        category=category,
        funding_only=funding_only,
        limit=limit,
        offset=offset,
    )
    return ItemsResponse(
        items=items,
        count=count_items(q=q, category=category, funding_only=funding_only),
        limit=limit,
        offset=offset,
    )


@app.get(
    "/items/{item_id}",
    response_model=Item,
    summary="Get one stored intelligence item",
    description="Returns a single SQLite-backed item by id.",
)
def get_item_by_id(
    item_id: int = Path(..., ge=1, description="SQLite item id."),
) -> Item:
    item = get_item(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@app.get(
    "/funding",
    response_model=list[Item],
    summary="List funding opportunities",
    description="Returns items flagged as funding opportunities, with keyword fallback for unanalyzed items.",
)
def get_funding(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[Item]:
    return list_funding_items(limit=limit, offset=offset)


@app.get(
    "/digest",
    response_model=DigestResponse,
    summary="Get NGO briefing digest",
    description="Returns an NGO-ready briefing using OpenAI if configured, otherwise deterministic fallback.",
)
def get_digest() -> DigestResponse:
    return AnalysisService().digest()


@app.post(
    "/analyze/all",
    response_model=AnalyzeAllResponse,
    summary="Analyze stored items",
    description="Analyzes latest stored items using OpenAI if configured, otherwise deterministic fallback.",
)
def analyze_all(
    limit: int = Query(default=50, ge=1, le=500),
) -> AnalyzeAllResponse:
    return AnalysisService().analyze_all(limit=limit)


@app.post(
    "/analyze/{item_id}",
    response_model=Item,
    summary="Analyze one item",
    description=(
        "Generates summary, category, 0-100 relevance score, funding flag, "
        "deadline, target NGO, relevance rationale, and recommended action."
    ),
)
def analyze_item(
    item_id: int = Path(..., ge=1),
) -> Item:
    item = AnalysisService().analyze_item(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@app.post(
    "/translate/text",
    response_model=TranslateTextResponse,
    summary="Translate text",
    description="Translates arbitrary text into English, French, or German.",
)
def translate_text(request: TranslateTextRequest) -> TranslateTextResponse:
    result = AIService().translate_text(request.text, request.target_language)
    return TranslateTextResponse(**result)


@app.post(
    "/translate-text",
    response_model=TranslateTextResponse,
    summary="Translate text",
    description="Translates arbitrary text into English, French, or German.",
)
def translate_text_alias(request: TranslateTextRequest) -> TranslateTextResponse:
    return translate_text(request)


@app.post(
    "/translate/{item_id}",
    response_model=Item,
    summary="Translate one item",
    description="Translates item summary/text into English, French, or German.",
)
def translate_item(
    request: TranslateRequest,
    item_id: int = Path(..., ge=1),
) -> Item:
    item = AnalysisService().translate_item(item_id, request.target_language)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@app.post("/demo/reset")
def demo_reset() -> dict[str, Any]:
    clear_items()
    created = []
    for demo_item in DEMO_ITEMS:
        created.append(create_item(**demo_item))
    analyzed = AnalysisService().analyze_all(limit=len(DEMO_ITEMS))
    return {
        "status": "ok",
        "created": len(created),
        "analyzed": analyzed.analyzed,
        "errors": analyzed.errors,
    }


@app.post("/demo/run")
def demo_run() -> dict[str, Any]:
    ingest_result = IngestService().ingest()
    scrape_result = WebScraperService().scrape(max_pages=15, follow_links=True)
    analyzed = AnalysisService().analyze_all(limit=50)
    digest = AnalysisService().digest()
    return {
        "status": "ok",
        "ingest": ingest_result.model_dump(),
        "scrape": scrape_result.model_dump(),
        "analysis": analyzed.model_dump(),
        "digest": digest.model_dump(mode="json"),
    }
