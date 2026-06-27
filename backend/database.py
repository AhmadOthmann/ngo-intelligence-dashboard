import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from .models import Item, VALID_CATEGORIES


DATABASE_PATH = Path(os.environ.get("DATABASE_PATH", "items.db"))


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def get_connection(db_path: Path | str = DATABASE_PATH) -> sqlite3.Connection:
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db(db_path: Path | str = DATABASE_PATH) -> None:
    connection = get_connection(db_path)
    try:
        with connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL CHECK(length(trim(title)) > 0),
                    url TEXT NOT NULL UNIQUE CHECK(length(trim(url)) > 0),
                    source TEXT NOT NULL CHECK(length(trim(source)) > 0),
                    published_at TIMESTAMP,
                    language TEXT,
                    raw_text TEXT NOT NULL CHECK(length(trim(raw_text)) > 0),
                    summary TEXT,
                    category TEXT CHECK(category IS NULL OR category IN ('news', 'funding', 'policy', 'research', 'other')),
                    relevance_score REAL CHECK(relevance_score IS NULL OR (relevance_score >= 0.0 AND relevance_score <= 1.0)),
                    is_funding_opportunity BOOLEAN DEFAULT 0,
                    deadline TEXT,
                    translated_text TEXT,
                    created_at TIMESTAMP DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
                )
                """
            )
            connection.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_items_url ON items(url)")
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_items_relevance ON items(relevance_score DESC)"
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_items_funding
                ON items(is_funding_opportunity)
                WHERE is_funding_opportunity = 1
                """
            )
            connection.execute("CREATE INDEX IF NOT EXISTS idx_items_category ON items(category)")
            connection.execute("CREATE INDEX IF NOT EXISTS idx_items_created ON items(created_at DESC)")
    finally:
        connection.close()


def row_to_item(row: sqlite3.Row) -> Item:
    data = dict(row)
    data["is_funding_opportunity"] = bool(data["is_funding_opportunity"])
    return Item(**data)


def create_item(
    *,
    title: str,
    url: str,
    source: str,
    raw_text: str,
    published_at: Optional[str] = None,
    language: Optional[str] = None,
    db_path: Path | str = DATABASE_PATH,
) -> Item:
    created_at = utc_now()
    connection = get_connection(db_path)
    try:
        with connection:
            cursor = connection.execute(
                """
                INSERT INTO items (
                    title, url, source, published_at, language, raw_text, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (title, url, source, published_at, language, raw_text, created_at),
            )
            row = connection.execute(
                "SELECT * FROM items WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
    finally:
        connection.close()
    return row_to_item(row)


def get_item(item_id: int, db_path: Path | str = DATABASE_PATH) -> Optional[Item]:
    connection = get_connection(db_path)
    try:
        row = connection.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    finally:
        connection.close()
    return row_to_item(row) if row else None


def list_items(
    *,
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db_path: Path | str = DATABASE_PATH,
) -> list[Item]:
    where_clause = ""
    parameters: list[Any] = []
    if q:
        where_clause = """
            WHERE title LIKE ?
               OR source LIKE ?
               OR raw_text LIKE ?
               OR summary LIKE ?
        """
        keyword = f"%{q}%"
        parameters.extend([keyword, keyword, keyword, keyword])
    parameters.extend([limit, offset])

    connection = get_connection(db_path)
    try:
        rows = connection.execute(
            f"""
            SELECT *
            FROM items
            {where_clause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            """,
            parameters,
        ).fetchall()
    finally:
        connection.close()
    return [row_to_item(row) for row in rows]


def update_item_fields(
    item_id: int,
    fields: dict[str, Any],
    db_path: Path | str = DATABASE_PATH,
) -> Optional[Item]:
    if not fields:
        return get_item(item_id, db_path)

    allowed_fields = {
        "summary",
        "category",
        "relevance_score",
        "is_funding_opportunity",
        "deadline",
        "translated_text",
    }
    unknown_fields = set(fields) - allowed_fields
    if unknown_fields:
        raise ValueError(f"unsupported fields: {', '.join(sorted(unknown_fields))}")

    if "category" in fields and fields["category"] not in VALID_CATEGORIES | {None}:
        raise ValueError("invalid category")
    if "relevance_score" in fields:
        score = fields["relevance_score"]
        if score is not None and not 0.0 <= score <= 1.0:
            raise ValueError("invalid relevance_score")

    assignments = ", ".join(f"{field} = ?" for field in fields)
    values = list(fields.values()) + [item_id]
    connection = get_connection(db_path)
    try:
        with connection:
            connection.execute(
                f"UPDATE items SET {assignments} WHERE id = ?",
                values,
            )
            row = connection.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    finally:
        connection.close()
    return row_to_item(row) if row else None
