# NGO Intelligence Dashboard

Demo-ready MVP for the AI 4 Good Hackathon. The app helps Burundi Kids and WTG
turn RSS news and funding feeds into practical NGO intelligence: relevant items,
funding opportunities, summaries, recommended actions, translations, and a daily
briefing.

## Why This Solves The Challenge

Small NGO teams do not have time to scan many news and funding sources manually.
This dashboard gives them one place to ingest feeds, classify relevance, detect
funding, translate key updates, and brief the team quickly.

## Architecture

- FastAPI backend on `http://127.0.0.1:8000`
- SQLite database stored in `items.db`
- RSS ingestion with `feedparser`
- OpenAI Responses API when `AI_PROVIDER=openai` and a real `OPENAI_API_KEY` is set
- Deterministic fallback logic when OpenAI is not configured or a model call fails
- React + Vite frontend on `http://127.0.0.1:5173`

## Backend Setup

From the project root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

Open Swagger:

```powershell
start http://127.0.0.1:8000/docs
```

If you are already inside `backend`, return to the project root first:

```powershell
cd ..
uvicorn backend.main:app --reload
```

## Environment Setup

Create a local `.env` from the example:

```powershell
Copy-Item .env.example .env
notepad .env
```

For OpenAI mode:

```text
AI_PROVIDER=openai
OPENAI_API_KEY=replace_with_your_key
OPENAI_MODEL=gpt-5.4-mini
OPENAI_REASONING_EFFORT=low
API_BASE_URL=http://127.0.0.1:8000
```

Do not commit `.env`. It is ignored by Git. If the key is missing or invalid,
the backend reports fallback mode in `/health` and still works for the demo.

## Frontend Setup

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open:

```powershell
start http://127.0.0.1:5173/app/dashboard
```

The frontend calls `http://127.0.0.1:8000` by default. To override:

```powershell
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

## Demo Flow

1. Start backend: `uvicorn backend.main:app --reload`
2. Start frontend: `cd frontend; npm run dev`
3. Open `http://127.0.0.1:5173/app/dashboard`
4. Click `Ingest RSS`
5. Click `Analyze all`
6. Review stats, item table, funding section, and digest
7. Open an item and translate it to German, French, or English
8. For a clean scripted demo, call `POST /demo/reset`, then refresh the dashboard

## API Usage Note

Core endpoints:

```text
GET /health
POST /ingest/rss
GET /items
GET /items/{id}
GET /funding
POST /analyze/{id}
POST /analyze/all
POST /translate/{id}
GET /digest
POST /demo/reset
POST /demo/run
```

`GET /items` returns:

```json
{
  "items": [],
  "count": 0,
  "limit": 50,
  "offset": 0
}
```

Translation body:

```json
{
  "target_language": "German"
}
```

## Backend Smoke Test Sequence

With backend running, test in Swagger or with HTTP tools:

```text
GET /health
POST /demo/reset
GET /items
POST /analyze/all
GET /items
GET /funding
GET /digest
POST /translate/{id}
```

Automated tests:

```powershell
.\.venv\Scripts\python.exe -m pytest -q tests
```

Frontend build:

```powershell
cd frontend
npm run build
```

## Troubleshooting

- `ModuleNotFoundError`: run `pip install -r requirements.txt` from the project root.
- Uvicorn import error from inside `backend`: run `cd ..` and start with `uvicorn backend.main:app --reload`.
- Browser page does not open from PowerShell: use `start http://127.0.0.1:8000/docs`.
- `/health` says `openai_configured: false`: replace the placeholder key in `.env` with a real OpenAI platform API key.
- RSS ingestion can show upstream feed errors. The endpoint still returns the errors without crashing the app.
