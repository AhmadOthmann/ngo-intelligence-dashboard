# API reference

## Conventions

- Local base URL: `http://127.0.0.1:8000`
- Interactive OpenAPI UI: `http://127.0.0.1:8000/docs`
- Content type: `application/json`
- Authentication: none

The API is designed for a controlled demo. Do not expose it to untrusted clients in its current form.

## Health

### `GET /`

Returns a minimal process status and the configured AI-provider name.

### `GET /health`

Returns API, provider, and database state.

```json
{
  "status": "ok",
  "ai_provider": "none",
  "openai_configured": false,
  "database": "ok"
}
```

`openai_configured` reports configuration, not a live provider-reachability check.

## Ingestion

### `POST /ingest/rss`

Ingests the default feeds when the body is omitted or `feeds` is empty.

```json
{
  "feeds": [
    "https://example.org/feed.xml"
  ]
}
```

At most 20 feed URLs can be supplied. Feed-specific failures are returned in the `errors` array while other feeds continue.

```json
{
  "ingested": 4,
  "errors": []
}
```

### `POST /ingest/web`

Scrapes curated seed pages when `urls` is omitted. The service can follow relevant links on the same domain.

```json
{
  "urls": [
    "https://example.org/news"
  ],
  "max_pages": 10,
  "follow_links": true,
  "respect_robots": true
}
```

Constraints:

- at most 20 seed URLs;
- `max_pages` from 1 to 80; and
- only HTTP(S) URLs with a hostname are accepted by the current normalizer.

```json
{
  "scraped": 3,
  "skipped": 7,
  "errors": []
}
```

The current URL checks are insufficient for an internet-facing service. See [Security](../SECURITY.md).

## Items

### `GET /items`

Returns a paginated object, ordered by newest stored item first.

| Parameter | Type | Default | Notes |
|---|---:|---:|---|
| `q` | string | — | searches title, source, raw text, summary, relevance explanation, and recommendation |
| `category` | string | — | case-insensitive exact category match |
| `funding_only` | boolean | `false` | filters to stored or keyword-detected funding items |
| `limit` | integer | `50` | 1–200 |
| `offset` | integer | `0` | zero or greater |

```json
{
  "items": [],
  "count": 0,
  "limit": 50,
  "offset": 0
}
```

Allowed non-null categories are `Burundi`, `Funding`, `Health`, `Education`, `GBV`, `Animal Welfare`, `Humanitarian`, `Politics/Security`, `Development`, and `Other`.

### `GET /items/{item_id}`

Returns one item. `item_id` must be a positive integer. A missing item returns `404`.

### `GET /funding`

Returns a JSON array of likely funding items. Items with detected deadlines are ordered by earliest deadline, with missing deadlines last.

| Parameter | Type | Default | Notes |
|---|---:|---:|---|
| `limit` | integer | `50` | 1–100 |
| `offset` | integer | `0` | zero or greater |

## Analysis

### `POST /analyze/{item_id}`

Analyzes one stored item and returns the updated item. A missing item returns `404`.

The operation uses OpenAI only when configured; otherwise it returns deterministic fallback analysis.

### `POST /analyze/all`

Analyzes a newest-first batch.

| Parameter | Type | Default | Notes |
|---|---:|---:|---|
| `limit` | integer | `50` | 1–500 |

```json
{
  "analyzed": 12,
  "errors": []
}
```

Errors are isolated per item and returned in the response.

### `GET /digest`

Returns a briefing generated from up to 10 top-ranked items and 10 funding items.

```json
{
  "generated_at": "2026-07-11T00:00:00Z",
  "headline": "NGO intelligence briefing",
  "executive_summary": "...",
  "top_priorities": [],
  "funding_opportunities": [],
  "recommended_actions": [],
  "risk_alerts": [],
  "top_items": [],
  "funding_items": []
}
```

## Translation

Supported language inputs are `en`, `fr`, `de`, `English`, `French`, and `German`, case-insensitively.

### `POST /translate/{item_id}`

Translates the stored summary when present, otherwise the raw text or title.

```json
{
  "target_language": "German"
}
```

Returns the complete updated item. A missing item returns `404`.

### `POST /translate/text`

`POST /translate-text` is an alias with the same behavior.

```json
{
  "text": "Funding deadline for education partners in Burundi.",
  "target_language": "French"
}
```

The text must contain 1–12,000 characters.

```json
{
  "target_language": "French",
  "translated_text": "...",
  "quality_note": "..."
}
```

Provider order is OpenAI when configured, then the Google Translate fallback only when `TRANSLATION_PROVIDER=google`, then local preview text. A successful response with a preview quality note does not mean translation occurred.

## Demo operations

### `POST /demo/reset`

**Destructive.** Deletes every item in the configured database, inserts five fixed demo items, analyzes them, and returns counts.

Do not enable this route in a production deployment.

### `POST /demo/run`

Runs the default RSS ingestion, curated web scraping, analysis of up to 50 items, and digest generation synchronously. External sources can make the request slow or partially fail.

## Common responses

| Status | Meaning |
|---:|---|
| `200` | request completed, including ingestion operations with per-source errors |
| `400` | application limit exceeded, such as too many feeds or seed URLs |
| `404` | requested item does not exist |
| `422` | request body, path, or query validation failed |
| `500` | unhandled internal or external-service failure |

Provider failures are often converted into fallback output rather than an error response. Translation can call a Google Translate service only when `TRANSLATION_PROVIDER=google`. Callers that need strict provider or data-processing guarantees must add an explicit policy and observability layer.
