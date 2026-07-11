# Implementation status

This document records the behavior present in the current implementation. It replaces the earlier planning summary; planned features must not be presented as implemented.

## Implemented backend

- FastAPI application with generated OpenAPI documentation
- SQLite schema initialization, compatibility repair, indexes, and URL deduplication
- default or caller-supplied RSS/Atom ingestion
- curated or caller-supplied HTML ingestion with optional same-domain link following
- shared safe outbound fetching with public-IP validation, exact production hostname allowlisting, guarded redirects, content checks, connect/read inactivity timeouts, and response-size limits
- searchable, filterable, paginated item listing and item detail
- funding-opportunity listing using stored analysis, with keyword fallback only for unanalyzed items
- single-item and batch analysis
- NGO-specific categories, 0–100 relevance scoring, target organization, rationale, and recommended action
- English, French, and German stored-item or free-text translation
- digest generation
- deterministic analysis fallback
- destructive demo reset and combined demo-run endpoints that require explicit local/test enablement plus operation-specific JSON confirmation and are hard-disabled elsewhere
- backend tests for the main SQLite/fallback flow, funding behavior, scraper relevance, outbound URL safety, redirects, response limits, and demo-endpoint guards

## Implemented frontend

- React 19 application using TanStack Start/Router, Vite, Nitro, TypeScript, and Tailwind CSS
- backend operations dashboard and signal inbox
- API client for ingestion, item retrieval, funding, analysis, translation, health, and digest
- same-origin `/api` server proxy for hosted deployments
- explicit **Load Local Demo Data** action for the guarded backend reset flow in development builds
- visible backend-versus-demo provenance and backend load errors in the inbox
- explicit translation-preview labeling when no provider is configured
- static demo organizations, signals, onboarding, profiles, saved-state, and conversations

## Demo-only frontend behavior

The following are not real account services:

- login and signup
- saved and ignored items
- peer discovery and peer messaging
- onboarding AI generation

Signup creates no account and login verifies no credential. The demo NGO profile is stored in browser `localStorage`, not in a backend account, and can be lost when browser storage is cleared. Saved/ignored items, conversations, and most other interaction state use static fixtures or React memory and disappear or reset when the page reloads.

A custom demo profile changes frontend presentation but does not configure the intelligence pipeline. Backend categories, rankings, recommendations, and fixed demo records remain hardcoded for Burundi Kids and WTG.

## External processing

- When `AI_PROVIDER=openai` and a usable-looking key is configured, analysis, translation, and digest code attempts the OpenAI Responses API.
- Analysis and digests fall back to deterministic logic when OpenAI is unavailable.
- Translation tries OpenAI when configured and otherwise returns preview text without calling a secondary translation provider.
- Preview output is marked and displayed as a preview rather than a completed provider translation.
- Provider exceptions are generally hidden by fallback output.

## Build and validation

- Python 3.12.13 is pinned in `.python-version` and the Docker base image.
- Node.js 24.14.0 and npm 11.9.0 are recorded for the frontend.
- Python runtime and development dependencies are generated as hash-locked requirements; npm uses its committed lockfile through `npm ci`.
- GitHub Actions runs backend tests and frontend lint, typecheck, and production build checks.
- The frontend preview command serves the Nitro production output.

## Known blockers for production

- no authentication, authorization, organization isolation, or rate limiting
- residual validate-then-connect DNS-rebinding risk; application URL checks still require an infrastructure egress firewall
- no strict application wall-clock deadline for a source that continuously drip-feeds bytes below the response-size cap
- destructive and potentially expensive demo endpoints in explicitly enabled local environments
- no backend account, profile, saved-item, or chat persistence
- local SQLite and ephemeral `/tmp/items.db` Docker default
- no formal migration framework, backups, monitoring, or audit log
- no verified public deployment
- no explicit open-source license

Repository review also found what appears to be an OpenAI API key in historical Git data. The key is not reproduced here and must be revoked and rotated by the account owner; removal from the current tree is not sufficient.

See [README.md](README.md), [Architecture](docs/ARCHITECTURE.md), [API reference](docs/API.md), [Deployment](docs/DEPLOYMENT.md), and [Security](SECURITY.md) for the maintained documentation.
