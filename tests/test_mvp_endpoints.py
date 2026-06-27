import os
import tempfile

os.environ["AI_PROVIDER"] = "none"
with tempfile.NamedTemporaryFile(delete=False, suffix=".db") as db_file:
    os.environ["DATABASE_PATH"] = db_file.name

from fastapi.testclient import TestClient

from backend.database import create_item
from backend.main import app


def test_mvp_endpoints_use_sqlite_and_fallback_analysis() -> None:
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
        assert len(client.get("/items?limit=10&offset=0").json()) == 2
        assert len(client.get("/items?q=Burundi").json()) == 1
        assert len(client.get("/items?funding_only=true").json()) == 1
        assert len(client.get("/funding").json()) == 1

        digest = client.get("/digest").json()
        assert "generated_at" in digest
        assert "summary_text" in digest

        analyzed = client.post("/analyze/all?limit=10").json()
        assert analyzed == {"analyzed": 2, "errors": []}

        item = client.get("/items?q=Burundi").json()[0]
        assert item["category"] == "funding"
        assert item["is_funding_opportunity"] is True
        assert item["deadline"] == "2026-08-15"

        translated = client.post(
            f"/translate/{item['id']}",
            json={"target_language": "German"},
        ).json()
        assert translated["translated_language"] == "German"
        assert "Demo translation fallback" in translated["translated_text"]

        assert client.get(f"/items/{item['id']}").status_code == 200
        assert client.get("/items/999999").status_code == 404
