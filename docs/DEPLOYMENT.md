# Deployment

## Readiness

The repository contains enough configuration for a controlled demo deployment, not a secure production service. Before internet exposure, review [Security](../SECURITY.md) and address authentication, SSRF protection, rate limiting, persistent storage, monitoring, and secret management.

## Recommended topology

- deploy the React/TanStack Start frontend on AWS Amplify or another Node-compatible host;
- deploy the FastAPI backend as a container behind HTTPS;
- keep browser calls same-origin through the frontend's `/api` proxy where possible; and
- attach durable storage to the backend.

## Backend container

Build from the repository root:

```bash
docker build -t ngo-intelligence-dashboard-api .
```

Run locally without OpenAI:

```bash
docker run --rm -p 8000:8000 \
  -e AI_PROVIDER=none \
  ngo-intelligence-dashboard-api
```

Run with an environment file and a persistent volume:

```bash
docker run --rm -p 8000:8000 \
  --env-file .env \
  -e DATABASE_PATH=/data/items.db \
  -v ngo-dashboard-data:/data \
  ngo-intelligence-dashboard-api
```

The image's default `DATABASE_PATH=/tmp/items.db` is ephemeral. Container replacement can delete all application data unless the path is changed to a mounted volume. A managed relational database is preferable for a real multi-user deployment.

## Backend environment

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `AI_PROVIDER` | no | `none` in code when unset | set to `openai` to attempt model calls |
| `OPENAI_API_KEY` | only for OpenAI | empty | server-side API credential; never expose to the frontend |
| `OPENAI_MODEL` | no | `gpt-5.4-mini` | model identifier passed to the OpenAI SDK |
| `OPENAI_REASONING_EFFORT` | no | `low` | reasoning-effort value passed to the model request |
| `TRANSLATION_PROVIDER` | no | `none` | set to `google` to opt in to the external fallback after OpenAI is unavailable |
| `DATABASE_PATH` | no | `items.db` outside Docker | SQLite file path |
| `CORS_ORIGINS` | no | empty | comma-separated additional browser origins |
| `PORT` | no | `8000` in Docker | Uvicorn listen port |

Only the backend should receive `OPENAI_API_KEY`. Enabling the Google fallback is a separate data-processing decision.

## Frontend build

The root `amplify.yml` treats `frontend/` as the application root and runs:

```bash
npm ci
NITRO_PRESET=aws-amplify npm run build
```

The build output is `.amplify-hosting`.

### Frontend environment

Use one of these API patterns:

1. **Recommended for hosting:** set `VITE_API_BASE_URL=/api` and set the server-side `BACKEND_ORIGIN=https://api.example.org`. The frontend server proxies `/api/*` to the backend.
2. **Direct browser calls:** set `VITE_API_BASE_URL=https://api.example.org` and add the exact frontend origin to `CORS_ORIGINS` on the backend.

`BACKEND_ORIGIN` must be an absolute HTTP(S) origin without a trailing slash. A missing value should produce a `503` response from `/api`; it must never fall back to an old development tunnel.

Do not place `OPENAI_API_KEY` or any other server credential in a `VITE_*` variable. Vite variables are embedded into browser-delivered assets.

## CORS

Localhost, private-network development hosts, and `*.amplifyapp.com` are currently allowed by backend configuration. For another production domain, add its exact origin:

```text
CORS_ORIGINS=https://dashboard.example.org
```

Multiple values are comma-separated. CORS is not authentication; it does not stop non-browser clients from calling the API.

## Health checks

Use:

```text
GET /health
```

The endpoint verifies the SQLite query path and reports whether OpenAI appears configured. It does not make a live OpenAI request, so it is not a complete dependency check.

## Persistence and backup

For any data that matters:

- mount the SQLite parent directory on durable storage;
- back up the database consistently;
- run only one writer process unless the storage design is tested for the expected concurrency;
- do not use `/tmp` as the database location; and
- plan a migration to a managed database before adding multiple instances or organizations.

## Pre-deployment checklist

- [ ] remove or disable `/demo/reset` and `/demo/run`
- [ ] add authentication, authorization, and organization isolation
- [ ] restrict web ingestion to approved sources and add SSRF defenses
- [ ] add request limits, timeouts, and rate limiting
- [ ] store secrets in the platform's secret manager
- [ ] rotate any credential that may ever have been committed or shared
- [ ] use persistent database storage and verify restoration from backup
- [ ] define exact CORS origins
- [ ] configure HTTPS for browser and backend traffic
- [ ] add structured logs, error reporting, metrics, and provider-fallback visibility
- [ ] run backend tests, frontend lint, and frontend build in CI
- [ ] review third-party scraping terms and data-retention requirements
- [ ] add an explicit software license before inviting external reuse
