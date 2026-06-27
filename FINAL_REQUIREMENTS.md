# Final MVP Requirements Summary

## Completed MVP Requirements

- FastAPI backend with SQLite persistence
- RSS ingestion through `POST /ingest/rss`
- Real HTML web scraping through `POST /ingest/web`
- Searchable, paginated item listing from SQLite
- Item detail endpoint
- Funding opportunity endpoint with flag and keyword fallback
- AI-powered analysis path with deterministic fallback
- Translation path with deterministic fallback
- NGO briefing digest endpoint
- Demo reset and demo run endpoints
- React dashboard integrated with backend at `http://127.0.0.1:8000`
- README setup, demo flow, and troubleshooting
- Three-minute demo script

## API Endpoints

- `GET /`
- `GET /health`
- `POST /ingest/rss`
- `POST /ingest/web`
- `GET /items`
- `GET /items/{id}`
- `GET /funding`
- `POST /analyze/{id}`
- `POST /analyze/all`
- `POST /translate/{id}`
- `GET /digest`
- `POST /demo/reset`
- `POST /demo/run`

## AI Features

- OpenAI Responses API through the official Python SDK
- Strict JSON-shaped model requests
- Item summaries
- NGO-specific category classification
- 0-100 relevance score
- Funding opportunity detection
- Deadline extraction
- Target NGO detection: Burundi Kids, WTG, Both, Unknown
- Why-relevant explanation
- Recommended action
- Translation to German, French, or English
- Daily briefing digest
- Web page text extraction from configured URLs and relevant same-domain links

## Fallback Behavior

If `AI_PROVIDER` is not `openai`, `OPENAI_API_KEY` is missing, or an OpenAI call
fails, the app uses deterministic keyword logic. Fallback mode still produces
valid JSON fields and keeps the demo working.

## Known Limitations

- RSS feeds may occasionally fail upstream.
- Web scraping depends on target site availability, robots rules, and page structure.
- SQLite is local and single-user.
- No authentication or team accounts.
- No scheduled ingestion.
- No email alerts.
- No vector database or semantic search.
- Fallback translation is clearly marked as demo fallback and is not a real translation.

## Future Roadmap

- Curated source management by NGO profile
- Scheduled ingestion and alert digests
- Saved items and review workflow backed by the backend
- Team authentication and roles
- Production database
- Evaluation set for AI relevance quality
- Human feedback loop for recommended actions
