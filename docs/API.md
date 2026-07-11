# API reference

## Conventions

- Local base URL: `http://127.0.0.1:8000`
- Interactive OpenAPI UI: `http://127.0.0.1:8000/docs`
- Content type: `application/json`
- Authentication: none

The API is designed for a controlled demo. Do not expose it to untrusted clients without authentication, rate limits, an outbound egress firewall, and the deployment controls described below.

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

Ingests the default feeds when the body is omitted or `feeds` is `null`. An explicit
empty list performs no network requests and returns an empty successful result.

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

Scrapes curated seed pages when `urls` is omitted or `null`. An explicit empty list
performs no network requests. The service can follow relevant links on the same domain.

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
- only guarded public HTTP(S) destinations are accepted.

```json
{
  "scraped": 3,
  "skipped": 7,
  "errors": []
}
```

RSS, web-page, discovered-link, redirect, and `robots.txt` destinations use the same outbound rules:

- URL length is at most 2,048 characters;
- URLs with credentials, backslashes, control characters, a missing hostname, or a scheme other than HTTP(S) are rejected;
- only ports 80 and 443 are permitted;
- all resolved IPv4 and IPv6 addresses must be globally routable and must not be private, loopback, link-local, multicast, reserved, or unspecified;
- up to five redirects are allowed, with every hop revalidated and HTTPS-to-HTTP downgrade rejected; web scraping also rejects cross-origin redirects while robots enforcement is enabled;
- responses use connect/read inactivity timeouts, expected content types, and a 2 MB body limit; and
- environment proxy settings are not inherited.

When `APP_ENV=production` or `APP_ENV=prod`, `SOURCE_DOMAIN_ALLOWLIST` is required and fetched hostnames must match an entry exactly; list each allowed subdomain and redirect host separately. Stored RSS article links are public-address validated but are not fetched and therefore do not need to be allowlisted. Source failures are isolated in the normal `errors` array. These checks do not eliminate a validate-then-connect DNS-rebinding race or impose a strict whole-response deadline, so an internet-facing deployment still requires a network egress firewall and an overall upstream-request timeout. See [Security](../SECURITY.md).

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

Returns a JSON array of likely funding items. Analyzed items use their stored analysis flag; keyword fallback is used only for items that do not yet have a relevance score. Items with detected deadlines are ordered by earliest deadline, with missing deadlines last.

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

Translation uses OpenAI when configured and otherwise returns local preview text without calling a secondary translation service. Preview text begins with a `[Translation preview: ...]` marker and the quality note explains that no provider completed the request. HTTP `200` with a preview does not mean translation occurred; clients must preserve that distinction.

## Demo operations

Both routes are disabled by default. They are available only when `ENABLE_DEMO_ENDPOINTS=true` and `APP_ENV` is explicitly `dev`, `development`, `local`, or `test`. Missing, staging, production, and unrecognized environments return `404` even if the enable flag is true. The repository's `.env.example` opts in for a disposable local demo.

### `POST /demo/reset`

**Destructive.** Deletes every item in the configured database, inserts five fixed Burundi Kids/WTG demo items, analyzes them, and returns counts. The local frontend dashboard's **Load Local Demo Data** control calls this route and then refreshes the displayed backend data.

```json
{
  "confirmation": "replace-all-items"
}
```

The exact JSON confirmation is required after the environment guard. This also prevents a simple cross-origin form POST from resetting the local database.

The custom frontend demo profile is not sent with this request and does not change the fixtures or backend analysis.

### `POST /demo/run`

Runs the default RSS ingestion, curated web scraping, analysis of up to 50 items, and digest generation synchronously. External sources can make the request slow or partially fail.

```json
{
  "confirmation": "run-live-ingestion"
}
```

## Common responses

| Status | Meaning |
|---:|---|
| `200` | request completed, including ingestion operations with per-source errors |
| `400` | application limit exceeded or a demo confirmation is missing/incorrect |
| `404` | requested item does not exist, or a demo operation is disabled |
| `422` | request body, path, or query validation failed |
| `500` | unhandled internal or external-service failure |

Provider failures are often converted into fallback output rather than an error response. The frontend labels preview output separately and labels whether inbox signals came from the backend or static demo data; API consumers must implement equivalent checks if that provenance matters.
