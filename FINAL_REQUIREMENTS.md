# Implementation status

This document records the behavior present in the current default branch. It replaces the earlier planning summary; planned features must not be presented as implemented.

## Implemented backend

- FastAPI application with generated OpenAPI documentation
- SQLite schema initialization, compatibility repair, indexes, and URL deduplication
- default or caller-supplied RSS/Atom ingestion
- curated or caller-supplied HTML ingestion with optional same-domain link following
- searchable, filterable, paginated item listing and item detail
- funding-opportunity listing with analysis and keyword matching
- single-item and batch analysis
- NGO-specific categories, 0–100 relevance scoring, target organization, rationale, and recommended action
- English, French, and German stored-item or free-text translation
- digest generation
- deterministic analysis fallback
- destructive demo reset and combined demo-run endpoints
- backend tests for the main SQLite/fallback flow and scraper relevance helpers

## Implemented frontend

- React 19 application using TanStack Start/Router, Vite, Nitro, TypeScript, and Tailwind CSS
- backend operations dashboard and signal inbox
- API client for ingestion, item retrieval, funding, analysis, translation, health, and digest
- same-origin `/api` server proxy for hosted deployments
- static demo organizations, signals, onboarding, profiles, saved-state, and conversations

## Demo-only frontend behavior

The following are not real account services:

- login and signup
- NGO profile persistence
- saved and ignored items
- peer discovery and peer messaging
- onboarding AI generation

These features use static fixtures or React memory and disappear or reset when the page reloads.

## External processing

- When `AI_PROVIDER=openai` and a usable-looking key is configured, analysis, translation, and digest code attempts the OpenAI Responses API.
- Analysis and digests fall back to deterministic logic when OpenAI is unavailable.
- Translation tries OpenAI when configured, optionally uses Google through `deep-translator` when `TRANSLATION_PROVIDER=google`, and otherwise returns preview text.
- Provider exceptions are generally hidden by fallback output.

## Known blockers for production

- no authentication, authorization, organization isolation, or rate limiting
- SSRF risk in caller-supplied RSS and web URLs
- destructive and potentially expensive demo endpoints
- no durable frontend account/profile/chat state
- local SQLite and ephemeral `/tmp/items.db` Docker default
- no formal migration framework, backups, monitoring, or audit log
- unpinned Python dependencies and no CI workflow
- no verified public deployment
- no explicit open-source license

See [README.md](README.md), [Architecture](docs/ARCHITECTURE.md), [API reference](docs/API.md), [Deployment](docs/DEPLOYMENT.md), and [Security](SECURITY.md) for the maintained documentation.
