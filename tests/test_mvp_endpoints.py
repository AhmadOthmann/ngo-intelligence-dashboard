import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from backend.ai_service import AIService
from backend.database import create_item
from backend.main import _require_demo_confirmation, _require_demo_endpoints, app
from backend.models import DemoOperationRequest, ScrapeResult
from backend.web_scraper_service import (
    extract_candidate_links,
    is_listing_page,
    is_low_value_page,
    is_relevant_item,
)


def test_translation_without_openai_is_a_local_preview(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "none")

    result = AIService().translate_text("Funding deadline", "German")

    assert result["translated_text"].startswith("[Translation preview: German]")
    assert result["quality_note"].startswith("Preview mode:")


def test_demo_endpoints_are_disabled_by_default(monkeypatch) -> None:
    monkeypatch.delenv("ENABLE_DEMO_ENDPOINTS", raising=False)

    with TestClient(app) as client:
        assert client.post("/demo/reset").status_code == 404
        assert client.post("/demo/run").status_code == 404


def test_demo_endpoints_stay_disabled_in_production(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ENABLE_DEMO_ENDPOINTS", "true")

    with TestClient(app) as client:
        assert client.post("/demo/reset").status_code == 404


def test_demo_endpoints_require_an_explicit_local_environment(monkeypatch) -> None:
    monkeypatch.setenv("ENABLE_DEMO_ENDPOINTS", "true")
    monkeypatch.delenv("APP_ENV", raising=False)

    with TestClient(app) as client:
        assert client.post("/demo/reset").status_code == 404

    monkeypatch.setenv("APP_ENV", "staging")
    with TestClient(app) as client:
        assert client.post("/demo/reset").status_code == 404


def test_demo_guard_allows_an_explicit_development_environment(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("ENABLE_DEMO_ENDPOINTS", "true")

    _require_demo_endpoints()


def test_enabled_demo_routes_reject_missing_or_incorrect_confirmation(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("ENABLE_DEMO_ENDPOINTS", "true")

    with TestClient(app) as client:
        assert client.post("/demo/reset").status_code == 400
        assert client.post(
            "/demo/reset",
            json={"confirmation": "something-else"},
        ).status_code == 400


def test_demo_operations_require_the_exact_confirmation() -> None:
    with pytest.raises(HTTPException) as missing:
        _require_demo_confirmation(None, "replace-all-items")
    with pytest.raises(HTTPException) as incorrect:
        _require_demo_confirmation(
            DemoOperationRequest(confirmation="something-else"),
            "replace-all-items",
        )

    assert missing.value.status_code == 400
    assert incorrect.value.status_code == 400
    _require_demo_confirmation(
        DemoOperationRequest(confirmation="replace-all-items"),
        "replace-all-items",
    )


def test_ingestion_rejects_private_network_urls() -> None:
    with TestClient(app) as client:
        rss = client.post(
            "/ingest/rss",
            json={"feeds": ["http://169.254.169.254/latest/meta-data/"]},
        ).json()
        web = client.post(
            "/ingest/web",
            json={
                "urls": ["http://127.0.0.1/private"],
                "max_pages": 1,
                "follow_links": False,
            },
        ).json()

    assert rss["ingested"] == 0
    assert "non-public" in rss["errors"][0]["error"]
    assert web["scraped"] == 0
    assert "non-public" in web["errors"][0]["error"]


def test_explicitly_empty_ingestion_lists_do_not_use_defaults() -> None:
    with TestClient(app) as client:
        rss = client.post("/ingest/rss", json={"feeds": []}).json()
        web = client.post(
            "/ingest/web",
            json={"urls": [], "max_pages": 1, "follow_links": False},
        ).json()

    assert rss == {"ingested": 0, "errors": []}
    assert web == {"scraped": 0, "skipped": 0, "errors": []}


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


def test_candidate_link_discovery_caps_without_dns_lookups(monkeypatch) -> None:
    def unexpected_dns_lookup(*args, **kwargs):
        raise AssertionError(f"link discovery must not resolve DNS: {args}, {kwargs}")

    monkeypatch.setattr(
        "backend.http_client.socket.getaddrinfo",
        unexpected_dns_lookup,
    )
    html = "".join(
        f'<a href="/funding/call-{index}">Burundi education funding {index}</a>'
        for index in range(100)
    )

    links = extract_candidate_links(
        "https://example.org/news",
        html,
        max_links=3,
    )

    assert len(links) == 3
