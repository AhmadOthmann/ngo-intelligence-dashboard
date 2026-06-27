import os
import tempfile

os.environ["AI_PROVIDER"] = "none"
with tempfile.NamedTemporaryFile(delete=False, suffix=".db") as db_file:
    os.environ["DATABASE_PATH"] = db_file.name

from fastapi.testclient import TestClient

from backend.database import create_item
from backend.main import app
from backend.models import ScrapeResult


def test_mvp_endpoints_use_sqlite_and_fallback_analysis(monkeypatch) -> None:
    class FakeWebScraper:
        def scrape(self, **kwargs) -> ScrapeResult:
            return ScrapeResult(scraped=1, skipped=0, errors=[])

    monkeypatch.setattr("backend.main.WebScraperService", lambda: FakeWebScraper())

    with TestClient(app) as client:
        create_item(
            title="BMZ call for proposals for Burundi education projects",
            url="https://example.org/funding-burundi",
            source="example.org",
            raw_text=(
                "Funding grant deadline 2026-08-15 for NGO education projects "
                "in Burundi."
            ),
        )
        create_item(
            title="New research report on animal welfare",
            url="https://example.org/animal-report",
            source="example.org",
            raw_text=(
                "Research report about animal welfare and rabies response "
                "in East Africa."
            ),
        )

        assert client.get("/").json()["status"] == "ok"
        health = client.get("/health").json()
        assert health["status"] == "ok"
        assert health["openai_configured"] is False

        scraped = client.post(
            "/ingest/web",
            json={"urls": ["https://example.org"], "max_pages": 1, "follow_links": False},
        ).json()
        assert scraped == {"scraped": 1, "skipped": 0, "errors": []}

        items_response = client.get("/items?limit=10&offset=0").json()
        assert items_response["count"] == 2
        assert len(items_response["items"]) == 2
        assert len(client.get("/items?q=Burundi").json()["items"]) == 1
        assert len(client.get("/items?funding_only=true").json()["items"]) == 1
        assert len(client.get("/funding").json()) == 1

        digest = client.get("/digest").json()
        assert "generated_at" in digest
        assert "executive_summary" in digest

        analyzed = client.post("/analyze/all?limit=10").json()
        assert analyzed == {"analyzed": 2, "errors": []}

        item = client.get("/items?q=Burundi").json()["items"][0]
        assert item["category"] == "Funding"
        assert item["is_funding_opportunity"] is True
        assert item["deadline"] == "2026-08-15"
        assert item["target_org"] == "Burundi Kids"
        assert item["why_relevant"]
        assert item["recommended_action"]
        assert 0 <= item["relevance_score"] <= 100

        translated = client.post(
            f"/translate/{item['id']}",
            json={"target_language": "German"},
        ).json()
        assert translated["translated_language"] == "German"
        assert "Demo translation fallback" in translated["translated_text"]

        assert client.get(f"/items/{item['id']}").status_code == 200
        assert client.get("/items/999999").status_code == 404
