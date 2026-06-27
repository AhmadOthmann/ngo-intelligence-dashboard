import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Path, Query
from fastapi.middleware.cors import CORSMiddleware

from .database import get_item, init_db, list_items
from .ingest_service import IngestService
from .models import IngestRequest, IngestResult, Item


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

extra_origins = os.environ.get("CORS_ORIGINS", "")
if extra_origins:
    ALLOWED_ORIGINS.extend(
        origin.strip() for origin in extra_origins.split(",") if origin.strip()
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ingest/rss", response_model=IngestResult)
def ingest_rss(request: IngestRequest | None = None) -> IngestResult:
    feeds = request.feeds if request else None
    if feeds is not None and len(feeds) > 20:
        raise HTTPException(status_code=400, detail="Maximum number of feeds is 20")

    return IngestService().ingest(feeds)


@app.get(
    "/items",
    response_model=list[Item],
    summary="List stored intelligence items",
    description="Returns SQLite-backed items ordered by newest first. Supports keyword search and offset pagination.",
)
def get_items(
    q: str | None = Query(
        default=None,
        description="Keyword search across title, source, raw text, and summary.",
    ),
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
        description="Maximum number of items to return.",
    ),
    offset: int = Query(
        default=0,
        ge=0,
        description="Number of matching items to skip before returning results.",
    ),
) -> list[Item]:
    return list_items(q=q, limit=limit, offset=offset)


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
