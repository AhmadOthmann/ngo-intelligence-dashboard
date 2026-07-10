# Security policy

## Project status

The NGO Intelligence Dashboard is a hackathon MVP, not a production security boundary. The default branch is the only maintained line, and there is currently no formal security-support or release schedule.

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
- CSRF protection for destructive demo actions;
- an audit log;
- production secret management;
- complete server-side request-forgery protection for caller-supplied scrape URLs;
- malware or active-content scanning of retrieved data; or
- guaranteed detection of prompt injection or misleading source content.

`POST /demo/reset` deletes all stored items. `POST /demo/run` triggers multiple external requests and model operations. Neither route should be publicly exposed.

## Safe deployment guidance

- Keep the API private or behind authenticated access.
- Restrict web ingestion to an allowlist of approved domains.
- Reject localhost, link-local, private, metadata-service, and otherwise non-public destinations after DNS resolution and after every redirect.
- Apply request-body, response-size, concurrency, and rate limits.
- Disable destructive demo routes outside a demo environment.
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

## Scraped and generated content

Web pages, feed entries, and model output are untrusted:

- verify funding deadlines, eligibility, contacts, and recommended actions against the original source;
- do not treat model classifications or translations as authoritative;
- escape or sanitize content before rendering it as markup;
- respect source terms, robots policies, copyright, and data-protection duties; and
- avoid ingesting beneficiary records or other sensitive personal data into this MVP.

## Scope

Security reports about the repository's own code and deployment configuration are in scope. General model-quality disagreements, third-party site outages, and vulnerabilities that exist only in an unmodified dependency should normally be reported to the relevant upstream project.
