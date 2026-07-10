# Contributing

This repository is a hackathon MVP. Contributions should improve correctness, maintainability, security, or the usefulness of the NGO workflow without presenting the prototype as production-ready.

## Before opening a change

- Use a GitHub issue for a substantial feature or behavior change.
- Do not put security reports in a public issue; follow [SECURITY.md](SECURITY.md).
- Keep changes focused. Separate dependency updates, refactors, and user-facing features when practical.
- Do not add real NGO, donor, beneficiary, or credential data to fixtures or screenshots.

## Development setup

### Backend

```bash
python -m venv .venv
```

Activate the environment, then run:

```bash
python -m pip install -r requirements.txt
cp .env.example .env
uvicorn backend.main:app --reload
```

On Windows PowerShell, activate with `.\.venv\Scripts\Activate.ps1` and copy with `Copy-Item .env.example .env`.

Set `AI_PROVIDER=none` for deterministic local development. Tests should not require a live external model or website unless the test is explicitly marked as an integration test.

### Frontend

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
npm run build
```

If a check cannot be run, state why in the pull-request description.

## Code expectations

- Preserve Pydantic request and response validation at API boundaries.
- Keep database writes parameterized.
- Treat scraped content, URLs, and AI output as untrusted input.
- Keep external-service timeouts bounded and return actionable errors.
- Do not silently broaden allowed origins or network destinations.
- Add or update tests for backend behavior changes.
- Keep `frontend/src/lib/api.ts` aligned with backend response models.
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

## Licensing

The repository currently has no open-source license. A contribution does not by itself grant general reuse rights. Discuss licensing with the maintainers before accepting substantial outside contributions.
