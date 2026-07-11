# Contributing

This repository is a hackathon MVP. Contributions should improve correctness, maintainability, security, or the usefulness of the NGO workflow without presenting the prototype as production-ready.

## Before opening a change

- Use a GitHub issue for a substantial feature or behavior change.
- Do not put security reports in a public issue; follow [SECURITY.md](SECURITY.md).
- Keep changes focused. Separate dependency updates, refactors, and user-facing features when practical.
- Do not add real NGO, donor, beneficiary, or credential data to fixtures or screenshots.

## Development setup

### Backend

Use Python 3.12.13 from `.python-version`.

```bash
python -m venv .venv
```

Activate the environment, then run:

```bash
python -m pip install --require-hashes -r requirements-dev.txt
cp .env.example .env
uvicorn backend.main:app --reload
```

On Windows PowerShell, activate with `.\.venv\Scripts\Activate.ps1` and copy with `Copy-Item .env.example .env`.

Set `AI_PROVIDER=none` for deterministic local development. Tests should not require a live external model or website unless the test is explicitly marked as an integration test.

The copied example configuration enables destructive demo endpoints for local use. Do not reuse it unchanged in a hosted environment. URL-fetch tests must mock DNS and HTTP rather than contacting live sources.

### Frontend

Use Node.js 24.14.0 from `.nvmrc` and npm 11.9.0 from the `packageManager` field.

```bash
cd frontend
npm ci
npm run dev
```

## Checks

Run the checks relevant to your change before opening a pull request.

```bash
# repository root
python -m pytest -q tests
```

```bash
# frontend/
npm run lint
npm run typecheck
npm run build
```

After `npm run build`, use `npm run preview` for an interactive smoke test of the Nitro production output. Stop the preview server when the check is complete.

If a check cannot be run, state why in the pull-request description.

## Code expectations

- Preserve Pydantic request and response validation at API boundaries.
- Keep database writes parameterized.
- Treat scraped content, URLs, and AI output as untrusted input.
- Keep outbound requests behind `backend/http_client.py`; preserve URL, DNS, address-class, redirect, content-type, timeout, and size checks.
- Preserve the production `SOURCE_DOMAIN_ALLOWLIST` requirement and the explicit local/test environment requirement for demo routes.
- Treat application URL checks as only one SSRF layer; deployments still need an egress firewall because of DNS rebinding.
- Do not silently broaden allowed origins or network destinations.
- Add or update tests for backend behavior changes.
- Keep `frontend/src/lib/api.ts` aligned with backend response models.
- Keep demo state honest: frontend profiles are not accounts and do not configure backend analysis.
- Keep backend/demo provenance, load failures, and translation-preview status visible to users.
- Do not hand-edit generated routing output when the TanStack tooling can regenerate it.
- Update README or `docs/` when setup, API, configuration, deployment, or limitations change.

## Pull requests

A useful pull request includes:

- the problem and why it matters;
- the implementation approach;
- user-visible or API behavior changes;
- security, migration, and deployment impact;
- screenshots for visual changes; and
- exact validation commands and results.

Prefer a draft pull request until the relevant checks pass.

## Commit hygiene

- Use short, descriptive commit messages.
- Do not commit `.env`, API keys, database files, generated videos, virtual environments, `node_modules`, or build output.
- If a secret is committed, revoke and rotate it immediately. Deleting it in a later commit does not remove it from history.

Repository review has already identified what appears to be an OpenAI API key in historical Git data. Do not reproduce it in issues, pull requests, test output, or documentation. The owner must rotate it independently of any later history-cleanup work.

## Dependency updates

Runtime requirements are declared in `requirements.in`; test requirements are declared in `requirements-dev.in`. Use `pip-tools==7.5.2` to regenerate both hash-locked files:

```bash
python -m piptools compile --generate-hashes --strip-extras -o requirements.txt requirements.in
python -m piptools compile --generate-hashes --strip-extras -o requirements-dev.txt requirements-dev.in
```

Review the full transitive diff and verify installation with `--require-hashes`. Do not hand-edit generated lock files.
Confirm every dependency name is the intended package (for example, avoid lookalike names such as `httpx2`).

For frontend updates, change `package.json`, regenerate `package-lock.json` with the pinned npm version, and use `npm ci` for verification. Keep runtime pins, the Docker base image, lock files, and CI configuration aligned.

## Licensing

The repository currently has no open-source license. A contribution does not by itself grant general reuse rights. Discuss licensing with the maintainers before accepting substantial outside contributions.
