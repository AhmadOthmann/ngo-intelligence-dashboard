# NGO Intelligence Dashboard

Local MVP for the AI 4 Good Hackathon. The backend ingests RSS items into SQLite,
analyzes them with deterministic fallback logic or an optional AI provider, and
serves a simple dashboard for Burundi Kids and WTG.

## Backend setup

From the project root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

Optional AI configuration:

```powershell
Copy-Item .env.example .env
notepad .env
```

The MVP works with `AI_PROVIDER=none`. To use AI, set `AI_PROVIDER=openai` with
`OPENAI_API_KEY`, or `AI_PROVIDER=bedrock` with AWS Bedrock environment
credentials and `AWS_BEDROCK_MODEL_ID`.

Open the API docs in a browser:

```powershell
start http://127.0.0.1:8000/docs
```

Seed sample data:

```powershell
python -m backend.seed_data
```

If you are already inside the `backend` directory, go back to the project root before starting Uvicorn:

```powershell
cd ..
uvicorn backend.main:app --reload
```

## Backend smoke tests

With the backend running:

```powershell
python -m pytest
```

Manual checks in Swagger:

```text
POST /ingest/rss
GET /items
GET /items?q=Burundi&limit=10&offset=0
GET /items?funding_only=true
GET /funding
GET /digest
POST /analyze/all
POST /analyze/{id}
POST /translate/{id}
```

Use this body for translation:

```json
{
  "target_language": "German"
}
```

## Frontend setup

In a second terminal, from the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL, usually:

```powershell
start http://127.0.0.1:5173
```

The frontend reads backend data from `http://127.0.0.1:8000` by default. To use a different backend URL:

```powershell
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

## Demo flow

1. Start the backend from the project root:

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn backend.main:app --reload
```

2. Start the frontend:

```powershell
cd frontend
npm run dev
```

3. Open the dashboard at `http://127.0.0.1:5173/app/dashboard`.
4. Click `Ingest RSS`.
5. Click `Analyze all`.
6. Search, open funding items, review the digest, and translate an item to German or French.
