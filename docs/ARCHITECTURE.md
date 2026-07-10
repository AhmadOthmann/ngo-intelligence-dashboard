# Architecture

## Scope

The NGO Intelligence Dashboard is a hackathon MVP with three runtime concerns:

- collect potentially relevant material from RSS feeds and web pages;
- turn stored material into structured NGO intelligence; and
- present results in a browser dashboard.

It is a modular monolith, not a distributed production system. The frontend and backend are deployed separately. Only backend items and their analysis are persistent; account, profile, saved-item, and chat state are frontend demonstrations held in memory.

## Runtime components

| Component | Responsibility | Main implementation |
|---|---|---|
| Browser application | navigation, filters, actions, item views, translations, and briefings | `frontend/src/` |
| Frontend server | server-side rendering and optional same-origin `/api` proxy | `frontend/src/server.ts` |
| HTTP API | validation, routing, CORS, and orchestration | `backend/main.py` |
| RSS ingestion | feed retrieval, parsing, language detection, and deduplication | `backend/ingest_service.py` |
| Web ingestion | page retrieval, text extraction, link discovery, relevance filtering, and robots checks | `backend/web_scraper_service.py` |
| Analysis | item analysis, bulk analysis, translations, and digest assembly | `backend/analysis_service.py` |
| AI adapter | OpenAI structured-output calls plus deterministic fallbacks | `backend/ai_service.py` |
| Persistence | schema creation, migration helpers, filtering, and CRUD | `backend/database.py` |
| Domain models | API request/response validation and allowed values | `backend/models.py` |
| Demo state | volatile profile, saved/ignored items, and conversations | `frontend/src/lib/app-state.tsx` |
| Demo fixtures | static profiles, signals, and conversations | `frontend/src/lib/demo-data.ts` |

## Request and data flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as FastAPI
    participant S as Source
    participant D as SQLite
    participant M as AI or fallback

    U->>F: Start ingestion
    F->>A: POST /ingest/rss or /ingest/web
    A->>S: Fetch source content
    S-->>A: Feed or HTML
    A->>D: Insert unique items
    U->>F: Prioritize items
    F->>A: POST /analyze/all
    A->>D: Read recent items
    A->>M: Analyze each item
    M-->>A: Structured fields
    A->>D: Update items
    F->>A: GET /items or /digest
    A-->>F: JSON response
```

## Frontend

The frontend is a React 19 application built with TanStack Start/Router and Vite. `frontend/src/lib/api.ts` is the typed boundary to the backend.

API-origin resolution follows this order:

1. use `VITE_API_BASE_URL` when it is configured;
2. for local development, call `http://127.0.0.1:8000`;
3. on private-network hosts, call port `8000` on the same host; or
4. use same-origin `/api` in deployed environments.

The frontend server can forward `/api/*` to the origin configured by `BACKEND_ORIGIN`. The hardened behavior is to fail closed when that value is missing; API traffic must never be sent to an old tunnel or third-party host.

## Frontend state boundaries

| Feature | Source of truth | Persistence |
|---|---|---|
| Backend intelligence items | SQLite | database-dependent |
| Login/signup | demo UI only | none |
| NGO profile | React state | none |
| Saved/ignored signals | React state | none |
| Peer conversations | static fixtures and React state | none |
| Onboarding recommendations | deterministic frontend mock | none |

The `/app` layout's profile check is a navigation guard, not authentication or authorization.

## Backend

FastAPI initializes the SQLite schema during application startup. Route functions call service classes directly, and services use the database helpers directly. This is intentionally simple for a short-lived MVP.

The API allows local development origins, RFC1918 private-network origins, and `*.amplifyapp.com` through its current CORS regular expression. Additional origins can be supplied as a comma-separated `CORS_ORIGINS` value.

### Ingestion

RSS ingestion uses a small default feed list when the request supplies no feed URLs. Each item is mapped to a normalized record, and the database's unique URL index handles duplicates.

Web ingestion starts from curated pages unless the request supplies URLs. It can follow relevant same-domain links, optionally checks `robots.txt`, filters low-value/listing pages, and stores readable text from pages that match the configured NGO themes.

### Analysis and fallbacks

When `AI_PROVIDER=openai` and the API key appears configured, the AI adapter requests strict JSON-shaped outputs for analysis, translation, and digests. Any provider exception currently falls back silently.

Without OpenAI, deterministic analysis logic:

- classifies items through theme keywords;
- calculates a bounded 0–100 relevance score;
- detects likely funding content;
- extracts simple date patterns;
- produces template-based explanations and actions; and
- produces template-based digest and analysis content.

Translation is different: the code attempts `deep-translator`'s Google Translate backend, may use OpenAI when configured, and otherwise returns clearly marked preview text. Text can therefore leave the system even when the OpenAI path is disabled.

This behavior keeps the demo usable but also hides provider failures from callers. Production observability should distinguish provider errors, fallback use, and model-quality failures.

## Storage model

SQLite stores one `items` table. Important fields include:

- source: `title`, `url`, `source`, `published_at`, `language`, `raw_text`;
- analysis: `summary`, `category`, `relevance_score`, `is_funding_opportunity`, `deadline`;
- actionability: `target_org`, `why_relevant`, `recommended_action`;
- translation: `translated_text`, `translated_language`; and
- lifecycle: `created_at`, `updated_at`.

The URL is unique. Required source text fields reject empty values, and relevance scores are constrained to 0–100. Schema-initialization code includes a narrow migration path from an earlier category and score representation.

SQLite is appropriate for a local demo. It is not a substitute for concurrent, backed-up, multi-user production storage.

## Deployment topology

The intended hosted topology is:

```mermaid
flowchart TD
    U["Browser"] --> F["Amplify frontend"]
    F -->|"/api proxy"| B["FastAPI container"]
    B --> D["Persistent database volume"]
    B --> O["OpenAI API"]
    B --> W["Approved web sources"]
```

The provided Dockerfile writes SQLite to `/tmp/items.db` by default. That path is ephemeral on most container platforms. A durable deployment must mount persistent storage or move to a managed relational database.

## Trust boundaries and risks

- API requests are unauthenticated.
- caller-supplied scraping URLs cross a network trust boundary and currently need stronger SSRF protection before public exposure.
- scraped text and model output are untrusted content.
- model-generated funding deadlines and recommendations require source verification.
- third-party feeds and sites can change format, fail, or block access.
- the current fallback path prioritizes demo continuity over explicit error reporting.

See [Security](../SECURITY.md) and [Deployment](DEPLOYMENT.md) for operational controls.

## Evolution path

The next architectural steps should be driven by real usage, not added pre-emptively:

1. add authentication and organization-level authorization;
2. restrict ingestion to an approved-source registry and add SSRF defenses;
3. move persistence to a managed database with migrations and backups;
4. run ingestion and analysis as observable background jobs;
5. add source provenance, reviewer decisions, and audit history;
6. evaluate relevance, deadline extraction, and translation against a labelled test set; and
7. add deployment CI, secret scanning, dependency updates, and structured monitoring.
