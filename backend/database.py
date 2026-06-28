import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from .models import Item, VALID_CATEGORIES


DATABASE_PATH = Path(os.environ.get("DATABASE_PATH", "items.db"))
FUNDING_KEYWORDS = [
    "funding",
    "grant",
    "proposal",
    "call for proposals",
    "deadline",
    "application",
    "bmz",
    "stiftung",
    "ngo",
    "project funding",
    "foundation",
    "small grants",
]


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
            if not _table_exists(connection):
                _create_items_table(connection)
            elif _requires_table_rebuild(connection):
                _rebuild_items_table(connection)

            for column, definition in {
                "target_org": "TEXT",
                "why_relevant": "TEXT",
                "recommended_action": "TEXT",
                "translated_language": "TEXT",
                "updated_at": "TIMESTAMP",
            }.items():
                _ensure_column(connection, column, definition)

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


def _table_exists(connection: sqlite3.Connection) -> bool:
    row = connection.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'items'"
    ).fetchone()
    return row is not None


def _create_items_table(connection: sqlite3.Connection, table_name: str = "items") -> None:
    connection.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {table_name} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL CHECK(length(trim(title)) > 0),
            url TEXT NOT NULL UNIQUE CHECK(length(trim(url)) > 0),
            source TEXT NOT NULL CHECK(length(trim(source)) > 0),
            published_at TIMESTAMP,
            language TEXT,
            raw_text TEXT NOT NULL CHECK(length(trim(raw_text)) > 0),
            summary TEXT,
            category TEXT,
            relevance_score INTEGER CHECK(relevance_score IS NULL OR (relevance_score >= 0 AND relevance_score <= 100)),
            is_funding_opportunity BOOLEAN DEFAULT 0,
            deadline TEXT,
            target_org TEXT,
            why_relevant TEXT,
            recommended_action TEXT,
            translated_text TEXT,
            translated_language TEXT,
            created_at TIMESTAMP DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
            updated_at TIMESTAMP
        )
        """
    )


def _requires_table_rebuild(connection: sqlite3.Connection) -> bool:
    row = connection.execute(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'items'"
    ).fetchone()
    sql = row["sql"] if row else ""
    return (
        "category IN ('news', 'funding', 'policy', 'research', 'other')" in sql
        or "relevance_score >= 0.0 AND relevance_score <= 1.0" in sql
    )


def _rebuild_items_table(connection: sqlite3.Connection) -> None:
    columns = _column_names(connection)
    connection.execute("DROP TABLE IF EXISTS items_new")
    _create_items_table(connection, "items_new")

    def source(column: str, fallback: str = "NULL") -> str:
        return column if column in columns else fallback

    relevance_source = source("relevance_score")
    if relevance_source == "relevance_score":
        relevance_expression = (
            "CASE "
            "WHEN relevance_score IS NULL THEN NULL "
            "WHEN relevance_score <= 1 THEN CAST(round(relevance_score * 100) AS INTEGER) "
            "ELSE CAST(round(relevance_score) AS INTEGER) "
            "END"
        )
    else:
        relevance_expression = "NULL"

    category_source = source("category")
    category_expression = (
        "CASE lower(category) "
        "WHEN 'news' THEN 'Development' "
        "WHEN 'funding' THEN 'Funding' "
        "WHEN 'policy' THEN 'Politics/Security' "
        "WHEN 'research' THEN 'Development' "
        "WHEN 'other' THEN 'Other' "
        "ELSE category END"
        if category_source == "category"
        else "NULL"
    )

    connection.execute(
        f"""
        INSERT OR IGNORE INTO items_new (
            id, title, url, source, published_at, language, raw_text, summary,
            category, relevance_score, is_funding_opportunity, deadline,
            target_org, why_relevant, recommended_action, translated_text,
            translated_language, created_at, updated_at
        )
        SELECT
            id, title, url, source, published_at, language, raw_text, summary,
            {category_expression},
            {relevance_expression},
            COALESCE({source("is_funding_opportunity", "0")}, 0),
            {source("deadline")},
            {source("target_org")},
            {source("why_relevant")},
            {source("recommended_action")},
            {source("translated_text")},
            {source("translated_language")},
            {source("created_at", "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')")},
            {source("updated_at")}
        FROM items
        """
    )
    connection.execute("DROP TABLE items")
    connection.execute("ALTER TABLE items_new RENAME TO items")


def _column_names(connection: sqlite3.Connection) -> set[str]:
    return {
        row["name"]
        for row in connection.execute("PRAGMA table_info(items)").fetchall()
    }


def _ensure_column(connection: sqlite3.Connection, column: str, definition: str) -> None:
    if column not in _column_names(connection):
        connection.execute(f"ALTER TABLE items ADD COLUMN {column} {definition}")


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
    category: Optional[str] = None,
    funding_only: bool = False,
    limit: int = 50,
    offset: int = 0,
    db_path: Path | str = DATABASE_PATH,
) -> list[Item]:
    where_clause, parameters = _build_item_filters(
        q=q,
        category=category,
        funding_only=funding_only,
    )
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


def count_items(
    *,
    q: Optional[str] = None,
    category: Optional[str] = None,
    funding_only: bool = False,
    db_path: Path | str = DATABASE_PATH,
) -> int:
    where_clause, parameters = _build_item_filters(
        q=q,
        category=category,
        funding_only=funding_only,
    )
    connection = get_connection(db_path)
    try:
        row = connection.execute(
            f"SELECT COUNT(*) AS total FROM items {where_clause}",
            parameters,
        ).fetchone()
    finally:
        connection.close()
    return int(row["total"]) if row else 0


def list_funding_items(
    *,
    limit: int = 50,
    offset: int = 0,
    db_path: Path | str = DATABASE_PATH,
) -> list[Item]:
    funding_clauses, parameters = _funding_conditions()
    parameters.extend([limit, offset])
    connection = get_connection(db_path)
    try:
        rows = connection.execute(
            f"""
            SELECT *
            FROM items
            WHERE {funding_clauses}
            ORDER BY
                CASE WHEN deadline IS NULL THEN 1 ELSE 0 END,
                deadline ASC,
                created_at DESC
            LIMIT ? OFFSET ?
            """,
            parameters,
        ).fetchall()
    finally:
        connection.close()
    return [row_to_item(row) for row in rows]


def _build_item_filters(
    *,
    q: Optional[str],
    category: Optional[str],
    funding_only: bool,
) -> tuple[str, list[Any]]:
    clauses: list[str] = []
    parameters: list[Any] = []
    if q:
        clauses.append(
            """
            (
                title LIKE ?
                OR source LIKE ?
                OR raw_text LIKE ?
                OR summary LIKE ?
                OR why_relevant LIKE ?
                OR recommended_action LIKE ?
            )
            """
        )
        keyword = f"%{q}%"
        parameters.extend([keyword, keyword, keyword, keyword, keyword, keyword])
    if category:
        clauses.append("lower(category) = lower(?)")
        parameters.append(category)
    if funding_only:
        funding_clauses, funding_parameters = _funding_conditions()
        clauses.append(f"({funding_clauses})")
        parameters.extend(funding_parameters)

    where_clause = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    return where_clause, parameters


def _funding_conditions() -> tuple[str, list[Any]]:
    conditions = ["is_funding_opportunity = 1"]
    parameters: list[Any] = []
    for keyword in FUNDING_KEYWORDS:
        pattern = f"%{keyword.lower()}%"
        conditions.append(
            """
            (
                lower(title) LIKE ?
                OR lower(raw_text) LIKE ?
                OR lower(summary) LIKE ?
                OR lower(recommended_action) LIKE ?
            )
            """
        )
        parameters.extend([pattern, pattern, pattern, pattern])
    return " OR ".join(conditions), parameters


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
        "target_org",
        "why_relevant",
        "recommended_action",
        "translated_text",
        "translated_language",
    }
    unknown_fields = set(fields) - allowed_fields
    if unknown_fields:
        raise ValueError(f"unsupported fields: {', '.join(sorted(unknown_fields))}")

    if "category" in fields and fields["category"] not in VALID_CATEGORIES | {None}:
        raise ValueError("invalid category")
    if "relevance_score" in fields:
        score = fields["relevance_score"]
        if score is not None and not 0 <= int(score) <= 100:
            raise ValueError("invalid relevance_score")

    fields = {**fields, "updated_at": utc_now()}
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


def clear_items(db_path: Path | str = DATABASE_PATH) -> None:
    connection = get_connection(db_path)
    try:
        with connection:
            connection.execute("DELETE FROM items")
    finally:
        connection.close()


def database_ok(db_path: Path | str = DATABASE_PATH) -> bool:
    try:
        connection = get_connection(db_path)
        try:
            connection.execute("SELECT 1 FROM items LIMIT 1")
        finally:
            connection.close()
        return True
    except sqlite3.Error:
        return False
