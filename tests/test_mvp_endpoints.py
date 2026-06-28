import os
import tempfile

os.environ["AI_PROVIDER"] = "none"
with tempfile.NamedTemporaryFile(delete=False, suffix=".db") as db_file:
    os.environ["DATABASE_PATH"] = db_file.name

from fastapi.testclient import TestClient

from backend.database import create_item
from backend.main import app
from backend.models import ScrapeResult
from backend.web_scraper_service import (
    is_listing_page,
    is_low_value_page,
    is_relevant_item,
)


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
        assert translated["translated_text"]

        translated_text = client.post(
            "/translate/text",
            json={
                "target_language": "German",
                "text": "Funding deadline for education partners in Burundi.",
            },
        ).json()
        assert translated_text["target_language"] == "German"
        assert translated_text["translated_text"]

        translated_text_alias = client.post(
            "/translate-text",
            json={
                "target_language": "French",
                "text": "Nein",
            },
        ).json()
        assert translated_text_alias["target_language"] == "French"
        assert translated_text_alias["translated_text"]

        assert client.get(f"/items/{item['id']}").status_code == 200
        assert client.get("/items/999999").status_code == 404


def test_scraper_relevance_matches_demo_themes() -> None:
    assert is_relevant_item(
        "Concern in Burundi supporting refugees from Democratic Republic of Congo",
        (
            "Concern Worldwide is supporting nutrition, water sanitation hygiene, "
            "children, and protection needs in Busuma refugee camp in Burundi."
        ),
        "https://reliefweb.int/report/burundi/concern-burundi-refugees-drc",
    )
    assert is_relevant_item(
        "Small grants for girls education in East Africa",
        (
            "Funding call for NGOs supporting girls, school attendance, health, "
            "and local partners in Burundi. Applications close in August."
        ),
        "https://www2.fundsforngos.org/example",
    )
    assert is_relevant_item(
        "Rabies control progress across East Africa",
        (
            "Animal welfare and veterinary partners report rabies vaccination "
            "progress across East Africa and need NGO coordination."
        ),
        "https://www.welttierschutz.org/en/projects/rabies/",
    )
    assert not is_relevant_item(
        "Earthquake response update in Venezuela",
        "Urban search and rescue teams reported infrastructure damage.",
        "https://reliefweb.int/report/venezuela/earthquake-response",
    )
    assert is_listing_page("https://reliefweb.int/updates?search=Burundi%20education")
    assert is_low_value_page("https://recadec.org/en/contact-us/", "Contact us")
    assert is_low_value_page("https://recadec.org/en/home/", "Home - recadec.org")
    assert is_low_value_page("https://recadec.org/en/faq/", "FQA - recadec.org")
    assert is_low_value_page("https://recadec.org/en/vision/", "Our vision - recadec.org")
