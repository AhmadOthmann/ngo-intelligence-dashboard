from pathlib import Path

from backend.database import (
    create_item,
    init_db,
    list_funding_items,
    update_item_fields,
)


def test_analyzed_non_funding_ngo_item_is_not_a_funding_lead(tmp_path: Path) -> None:
    database = tmp_path / "items.db"
    init_db(database)
    item = create_item(
        title="NGO community coordination update",
        url="https://example.org/community-update",
        source="example.org",
        raw_text="Local NGO partners met to review routine program delivery.",
        db_path=database,
    )
    update_item_fields(
        item.id,
        {
            "summary": "Routine program coordination update.",
            "category": "Development",
            "relevance_score": 45,
            "is_funding_opportunity": False,
            "deadline": None,
            "target_org": "Unknown",
            "why_relevant": "Background program information.",
            "recommended_action": "No funding action required.",
        },
        db_path=database,
    )

    assert list_funding_items(db_path=database) == []


def test_unanalyzed_grant_item_uses_keyword_fallback(tmp_path: Path) -> None:
    database = tmp_path / "items.db"
    init_db(database)
    item = create_item(
        title="Small education grant",
        url="https://example.org/grant",
        source="example.org",
        raw_text="Applications are open for a small education grant.",
        db_path=database,
    )

    assert [result.id for result in list_funding_items(db_path=database)] == [item.id]


def test_unanalyzed_ngo_item_does_not_use_generic_ngo_as_funding_keyword(
    tmp_path: Path,
) -> None:
    database = tmp_path / "items.db"
    init_db(database)
    create_item(
        title="NGO community update",
        url="https://example.org/ngo-update",
        source="example.org",
        raw_text="The NGO shared a routine community program update.",
        db_path=database,
    )

    assert list_funding_items(db_path=database) == []
