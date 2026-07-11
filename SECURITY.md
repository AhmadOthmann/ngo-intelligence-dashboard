# Security policy

## Project status

Impact Atlas is a hackathon MVP, not a production security boundary. The default branch is the only maintained line, and there is currently no formal security-support or release schedule.

## Reporting a vulnerability

Use GitHub's private vulnerability-reporting or security-advisory flow for this repository. If that option is unavailable, contact the repository owner privately through the contact methods on the owner's GitHub profile.

Do not include credentials, exploit details, personal data, or sensitive NGO information in a public issue.

A useful report includes:

- affected endpoint, file, or commit;
- impact and realistic attack scenario;
- reproduction steps or a minimal proof of concept;
- suggested mitigation, if known; and
- whether any real data or credential may have been exposed.

## Known security limitations

The current application does not provide:

- authentication or authorization;
- organization or tenant isolation;
- rate limiting or abuse controls;
- authentication-backed CSRF protection for state-changing or costly actions;
- an audit log;
- production secret management;
- an infrastructure egress boundary that eliminates the remaining DNS-rebinding SSRF race;
- an application-enforced whole-request deadline for drip-fed source responses;
- malware or active-content scanning of retrieved data; or
- guaranteed detection of prompt injection or misleading source content.

`POST /demo/reset` deletes all stored items. `POST /demo/run` triggers multiple external requests and model operations. Both are off by default and are exposed only when the enable flag is true and `APP_ENV` explicitly names a local/test environment. Missing, staging, production, and unrecognized environments fail closed. Each operation also requires an exact JSON confirmation phrase, preventing a simple cross-origin form POST from executing it. The routes should still remain unreachable from untrusted networks; the confirmation is a safety interlock, not authentication.

Login, signup, profile, saved-item, and chat screens do not provide an account security boundary. The profile is stored only in browser `localStorage`, and a custom profile is not used to scope backend data or analysis.

## Outbound request controls

RSS, web-page, discovered-link, redirect, and `robots.txt` requests pass through `backend/http_client.py`. It enforces:

- HTTP(S) only, ports 80/443, a maximum URL length, and no URL credentials, backslashes, or control characters;
- rejection of localhost and any hostname whose IPv4 or IPv6 answers include private, loopback, link-local, multicast, reserved, unspecified, or otherwise non-global addresses;
- an exact-hostname `SOURCE_DOMAIN_ALLOWLIST` whenever `APP_ENV` is `production` or `prod`;
- validation of every redirect, a five-redirect maximum, no HTTPS-to-HTTP downgrade, and no cross-origin page redirect while robots enforcement is active;
- disabled environment proxy inheritance, connect/read inactivity timeouts, accepted content types, and a 2 MB response limit.

The hostname is resolved during validation and then resolved again by the HTTP client. An attacker who controls DNS could change the answer between those steps. Application validation therefore reduces, but does not eliminate, SSRF risk.

Requests' connect/read timeouts limit inactive socket operations, not total wall-clock duration. A server that drip-feeds data can hold a worker longer than the configured read timeout. Production infrastructure must impose an overall upstream-request or worker deadline in addition to the application byte limit.

## Safe deployment guidance

- Keep the API private or behind authenticated access.
- Set `APP_ENV=production` and configure `SOURCE_DOMAIN_ALLOWLIST` with exact approved hostnames, including required feed and redirect hosts.
- Enforce an egress firewall or controlled outbound proxy that denies localhost, link-local, private, multicast, reserved, metadata-service, and otherwise non-public destinations at connection time for IPv4 and IPv6, and configure an overall request deadline.
- Apply request-body, response-size, concurrency, and rate limits.
- Keep `ENABLE_DEMO_ENDPOINTS=false` and verify destructive demo routes return `404`.
- Store API keys in a secret manager and pass them only to the backend.
- Never use a `VITE_*` variable for a secret; Vite values are visible to browsers.
- Configure an explicit backend origin. Do not use a stale tunnel as a fallback.
- Use HTTPS and exact production origins.
- Use durable, access-controlled storage with tested backups.
- Add dependency scanning, secret scanning, and automated security updates.

## Credentials

Never commit `.env` files or real credentials. If a credential appears in Git history, logs, screenshots, chat, or a deployed client bundle, revoke and rotate it immediately. Removing it from the latest revision is not enough.

OpenAI API keys must remain on the backend. The frontend should receive only application data, never provider credentials.

Any provider key that has appeared in Git history must be treated as compromised and rotated. Removing it in a later commit does not invalidate copies in earlier commits, forks, caches, or clones.

### Historical OpenAI key warning

Repository review found what appears to be an OpenAI API key in historical Git data. The value is intentionally not reproduced. Its revocation status cannot be established from this repository, so the owner must:

1. revoke and rotate the credential in the OpenAI account;
2. review API usage and billing for unexpected activity;
3. update secret-manager and deployment references with the replacement; and
4. invalidate any other location where the old credential was copied.

Rotation is the immediate containment step. Rewriting public Git history is a separate, disruptive cleanup operation that does not invalidate leaked copies and must be coordinated with collaborators, forks, deployments, and the repository's Lovable integration.

There is no secondary translation provider. When OpenAI is not configured or does not complete the request, translation endpoints return clearly marked local preview text. A successful HTTP response is not evidence that a translation provider processed the content.

## Scraped and generated content

Web pages, feed entries, and model output are untrusted:

- verify funding deadlines, eligibility, contacts, and recommended actions against the original source;
- do not treat model classifications or translations as authoritative;
- escape or sanitize content before rendering it as markup;
- respect source terms, robots policies, copyright, and data-protection duties; and
- avoid ingesting beneficiary records or other sensitive personal data into this MVP.

## Scope

Security reports about the repository's own code and deployment configuration are in scope. General model-quality disagreements, third-party site outages, and vulnerabilities that exist only in an unmodified dependency should normally be reported to the relevant upstream project.
