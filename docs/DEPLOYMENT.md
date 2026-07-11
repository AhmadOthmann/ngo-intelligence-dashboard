# Deployment

## Readiness

The repository contains enough configuration for a controlled demo deployment, not a secure production service. Before internet exposure, review [Security](../SECURITY.md) and add authentication, rate limiting, persistent storage, monitoring, secret management, and infrastructure-level egress controls.

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

The container uses Python 3.12.13 and installs `requirements.txt` with hash verification. Rebuild rather than installing ad hoc packages into a running container.

## Backend environment

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `APP_ENV` | yes when hosted | `production` in Docker | only explicit local/test values can enable demo operations; production also requires the source allowlist |
| `ENABLE_DEMO_ENDPOINTS` | no | `false` in code | local/test-only opt-in for destructive `POST /demo/reset` and `POST /demo/run`; ignored for missing, staging, production, and unknown environments |
| `SOURCE_DOMAIN_ALLOWLIST` | yes in production | empty | comma-separated exact hostnames allowed for RSS and web fetching |
| `AI_PROVIDER` | no | `none` in code when unset | set to `openai` to attempt model calls |
| `OPENAI_API_KEY` | only for OpenAI | empty | server-side API credential; never expose to the frontend |
| `OPENAI_MODEL` | no | `gpt-5.4-mini` | model identifier passed to the OpenAI SDK |
| `OPENAI_REASONING_EFFORT` | no | `low` | reasoning-effort value passed to the model request |
| `DATABASE_PATH` | no | `items.db` outside Docker | SQLite file path |
| `CORS_ORIGINS` | no | empty | comma-separated additional browser origins |
| `PORT` | no | `8000` in Docker | Uvicorn listen port |

Only the backend should receive `OPENAI_API_KEY`. No secondary translation provider is configured by this project.

For a hosted backend, use at least:

```text
APP_ENV=production
ENABLE_DEMO_ENDPOINTS=false
SOURCE_DOMAIN_ALLOWLIST=reliefweb.int,rss.dw.com,www.aktion-deutschland-hilft.de
```

The entries above are examples, not a recommendation to ingest those hosts. Matching is exact: allowing `example.org` does not allow `www.example.org`. Verify each source's terms and list every required hostname, including redirect targets and feed hosts.

## Frontend build

The root `amplify.yml` treats `frontend/` as the application root and runs:

```bash
npm ci
NITRO_PRESET=aws-amplify npm run build
```

The build output is `.amplify-hosting`.

For a local production-build smoke test from `frontend/`:

```bash
npm run build
npm run preview
```

The preview command serves the Nitro output; it is not the Vite static preview server.

### Frontend environment

Use one of these API patterns:

1. **Recommended for hosting:** set `VITE_API_BASE_URL=/api` and set the server-side `BACKEND_ORIGIN=https://api.example.org`. The frontend server proxies `/api/*` to the backend.
2. **Direct browser calls:** set `VITE_API_BASE_URL=https://api.example.org` and add the exact frontend origin to `CORS_ORIGINS` on the backend.

`BACKEND_ORIGIN` must be an absolute HTTP(S) origin without a trailing slash. A missing value should produce a `503` response from `/api`; it must never fall back to an old development tunnel.

The destructive **Load Local Demo Data** control is visible automatically during frontend development. `VITE_ENABLE_DEMO_CONTROLS=true` can include it in another build, but hosted builds should leave it false; the backend independently rejects the operation outside an explicitly enabled local/test environment.

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

## Outbound network policy

The backend validates source URLs before each request and redirect. It accepts only public HTTP(S) hosts on ports 80/443, rejects private/multicast/reserved and other non-global DNS answers, requires the production allowlist, disables environment proxy inheritance, blocks HTTPS downgrade, limits redirects to five, and limits response bodies to 2 MB. Connect/read timeouts are socket-inactivity limits, not a strict whole-response deadline.

This is not a complete network boundary. DNS is resolved once during validation and again by the HTTP stack when it connects, leaving a DNS-rebinding race. At the platform, container, VPC, or proxy layer:

- deny loopback, RFC1918/private, link-local, carrier-grade NAT, reserved, and multicast destinations for both IPv4 and IPv6;
- deny cloud metadata endpoints explicitly;
- allow outbound ports 80/443 only to approved destinations where the platform supports FQDN policy;
- prevent untrusted proxy configuration from changing the route;
- enforce an overall request or worker deadline so drip-fed responses cannot occupy a worker indefinitely; and
- log denied and allowed outbound requests without logging credentials or sensitive content.

Keep the API private until this defense in depth is in place.

## Reproducible builds and CI

- `.python-version` pins Python 3.12.13.
- `requirements.txt` and `requirements-dev.txt` are generated, hash-locked Python dependency sets.
- `frontend/.nvmrc` pins Node.js 24.14.0, `frontend/package.json` records npm 11.9.0, and `npm ci` enforces `package-lock.json`.
- `.github/workflows/ci.yml` installs the locked dependencies, runs `python -m pip check` and `python -m pytest`, then runs frontend lint, typecheck, and build checks for pull requests and pushes to `master`.

CI is a build-quality gate, not a deployment approval, penetration test, secret scanner, or dependency-vulnerability guarantee.

## Historical credential action

Repository review found what appears to be an OpenAI API key in historical Git data. Its value is deliberately omitted. The owner must revoke and rotate that credential and review provider usage. Removing the string from the current branch is not sufficient. Any later history-cleanup decision should happen only after rotation, with coordination for all clones, forks, deployments, and the repository's Lovable integration.

## Pre-deployment checklist

- [ ] set `APP_ENV=production` and verify `/demo/reset` and `/demo/run` return `404`
- [ ] add authentication, authorization, and organization isolation
- [ ] configure the exact `SOURCE_DOMAIN_ALLOWLIST` and an infrastructure egress firewall
- [ ] add request limits, timeouts, and rate limiting
- [ ] store secrets in the platform's secret manager
- [ ] rotate any credential that may ever have been committed or shared
- [ ] use persistent database storage and verify restoration from backup
- [ ] define exact CORS origins
- [ ] configure HTTPS for browser and backend traffic
- [ ] add structured logs, error reporting, metrics, and provider-fallback visibility
- [ ] require the GitHub Actions backend and frontend jobs before merge
- [ ] review third-party scraping terms and data-retention requirements
- [ ] add an explicit software license before inviting external reuse
