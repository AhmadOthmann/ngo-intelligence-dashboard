import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .ingest_service import IngestService
from .models import IngestRequest, IngestResult


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="NGO Intelligence Dashboard API", lifespan=lifespan)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
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
