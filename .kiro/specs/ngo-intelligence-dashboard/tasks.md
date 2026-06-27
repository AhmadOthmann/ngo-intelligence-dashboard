# Implementation Plan: NGO Intelligence Dashboard

## Overview

This plan implements an AI-powered NGO Intelligence Dashboard with a Python FastAPI backend and React+Vite TypeScript frontend. The backend handles RSS ingestion, AI-powered analysis (summarization, classification, relevance scoring, funding detection), multilingual translation, and curated digest generation. The frontend provides dashboard, digest, and funding pages with per-item actions and proper loading/error states.

## Tasks

- [ ] 1. Set up backend project structure and core infrastructure
  - [ ] 1.1 Initialize Python FastAPI project with dependencies and configuration
    - Create `backend/` directory with `requirements.txt` (fastapi, uvicorn, feedparser, pydantic, httpx, langdetect, boto3, openai, pytest, hypothesis)
    - Create `backend/main.py` with FastAPI app initialization and CORS middleware (allow localhost:5173 + CORS_ORIGINS env var, methods GET/POST/OPTIONS, headers Content-Type)
    - Create `backend/.env.example` with placeholders for AWS and OpenAI credentials
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ] 1.2 Create SQLite database schema and connection utilities
    - Create `backend/database.py` with SQLite connection management, table creation (items table with all fields, constraints, and indexes as per design), and helper functions for CRUD operations
    - Enforce UNIQUE constraint on url, CHECK constraints on category and relevance_score, NOT NULL on title/url/source/raw_text
    - Store all timestamps in ISO 8601 UTC format
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ] 1.3 Define Pydantic data models and shared types
    - Create `backend/models.py` with Item, IngestRequest, IngestResult, TranslateRequest, DigestResponse models
    - Include field validators for category (enum set), relevance_score (0.0-1.0 range), and target_language (en/fr/de)
    - _Requirements: 11.3, 11.4, 2.1, 2.2, 3.2_

- [ ] 2. Implement AI Provider abstraction with failover
  - [ ] 2.1 Create AI Provider class with Bedrock primary and OpenAI fallback
    - Create `backend/ai_provider.py` with AIProvider class implementing `invoke(prompt, system)` method
    - Implement Bedrock Claude call with 8-second timeout, catch errors/timeouts and fallback to OpenAI GPT-4o-mini
    - Raise AIUnavailableError if both providers fail
    - Implement `get_active_provider()` method that checks Bedrock (≤3s timeout) then OpenAI (≤3s timeout), returns "bedrock", "openai", or "none"
    - Ensure total failover decision completes within 10 seconds
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 2.2 Write property test for AI Provider failover timeout
    - **Property 16: AI Provider failover within timeout**
    - **Validates: Requirements 8.2, 8.4**

- [ ] 3. Implement RSS feed ingestion service
  - [ ] 3.1 Create Ingestion Service with feed fetching, parsing, and storage
    - Create `backend/ingest_service.py` with IngestService class
    - Implement default feeds list (reliefweb.int, devex.com, BBC Africa)
    - Fetch each feed with 30-second per-feed timeout using feedparser
    - Parse entries: extract title, url, source (domain), published_at, raw_text (content/description or title fallback)
    - Detect language using langdetect library (set to "unknown" if low confidence or failure)
    - Skip entries missing title or URL silently
    - Skip entries with duplicate URL (already in DB) without error
    - On feed-level failure (unreachable, timeout, invalid XML), add to errors array and continue
    - Validate max 20 feed URLs (return 400 if exceeded)
    - Return IngestResult with ingested count and errors array
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

  - [ ] 3.2 Create POST /ingest/rss API endpoint
    - Wire IngestService to FastAPI route in `backend/main.py` or `backend/routes/ingest.py`
    - Handle empty/missing feeds array → use defaults
    - Handle >20 feeds → HTTP 400
    - Return HTTP 200 with `{ ingested: int, errors: [...] }` even when all feeds fail
    - _Requirements: 1.1, 1.2, 1.6, 1.8, 1.9_

  - [ ]* 3.3 Write property tests for ingestion deduplication and all-feeds-fail
    - **Property 2: Ingestion deduplication by URL**
    - **Property 12: All-feeds-fail graceful response**
    - **Validates: Requirements 1.4, 1.9**

- [ ] 4. Implement AI-powered analysis service
  - [ ] 4.1 Create Analysis Service with summary, classification, scoring, and funding detection
    - Create `backend/analysis_service.py` with AnalysisService class
    - Implement `analyze_item(item_id)`: validate item exists (404), validate raw_text non-null/non-whitespace (400)
    - Generate summary via AI (max 200 chars, plain text, no markup)
    - Classify category (exactly one of: news, funding, policy, research, other)
    - Compute relevance_score using hybrid formula: 0.7 * ai_score + 0.3 * keyword_score
    - Detect funding opportunity (boolean), extract deadline if funding (ISO 8601 date or null)
    - Set deadline to null for non-funding items
    - Re-analysis overwrites all previous fields
    - AI provider failover: transparent fallback to OpenAI if Bedrock fails; 503 if both fail
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13_

  - [ ] 4.2 Implement keyword scoring algorithm
    - Create `backend/scoring.py` with TARGET_KEYWORDS list and `compute_relevance(text, title, ai_provider)` function
    - keyword_score = min(1.0, keyword_matches / 5)
    - Final score = 0.7 * ai_score + 0.3 * keyword_score
    - Fall back to keyword_score alone if AI scoring fails
    - _Requirements: 2.3, 2.11_

  - [ ] 4.3 Create POST /analyze/{id} API endpoint
    - Wire AnalysisService to FastAPI route
    - Return full updated Item on success (200)
    - Handle 400 (no text), 404 (not found), 503 (AI unavailable)
    - _Requirements: 2.9, 2.10, 2.13_

  - [ ]* 4.4 Write property tests for analysis output validity and keyword scoring
    - **Property 3: Analysis output validity**
    - **Property 4: Keyword scoring formula**
    - **Property 11: Relevance score bounds invariant**
    - **Property 13: Non-funding items have null deadline**
    - **Property 14: Re-analysis overwrites previous results**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6, 2.8, 2.12, 11.3**

- [ ] 5. Implement translation service
  - [ ] 5.1 Create Translation Service with language support and validation
    - Create `backend/translation_service.py` with TranslationService class
    - Implement `translate(item_id, target_language)`: validate item exists (404), validate raw_text non-null/non-whitespace (400), validate target_language in {en, fr, de} (400)
    - Translate via AI provider, store in translated_text (overwrite previous)
    - Do NOT modify raw_text
    - Perform translation even if target matches detected language
    - AI failover: transparent fallback; 503 if both fail; do not modify translated_text on failure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ] 5.2 Create POST /translate/{id} API endpoint
    - Wire TranslationService to FastAPI route
    - Handle missing target_language field or invalid JSON → 422
    - Handle invalid language → 400, null/whitespace text → 400, item not found → 404, AI unavailable → 503
    - Return full updated Item on success (200)
    - _Requirements: 3.1, 3.4, 3.5, 3.6, 3.7, 3.9_

  - [ ]* 5.3 Write property tests for translation validation
    - **Property 5: Translation is non-destructive**
    - **Property 6: Invalid translation inputs rejected**
    - **Validates: Requirements 3.1, 3.3, 3.4, 3.5, 3.9**

- [ ] 6. Implement items listing, digest, funding, and health endpoints
  - [ ] 6.1 Create GET /items endpoint with filtering and sorting
    - Return all Items ordered by created_at descending
    - Support `category` query param (case-insensitive filter, exclude null-category items)
    - Support `is_funding` query param (boolean filter: "true"/"false" only, else 422)
    - Combine filters with AND logic
    - Return empty array if no items match (200)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ] 6.2 Create GET /digest endpoint
    - Return only items with non-null summary, category, AND relevance_score
    - Sort by relevance_score descending, ties broken by created_at descending
    - Limit to 20 items
    - Generate AI summary (max 500 chars) highlighting key themes
    - Return DigestResponse with briefing_date (current UTC date ISO 8601), items array, and summary
    - Handle no analyzed items → empty items array + message indicating no data
    - Handle AI unavailable for summary → fallback message in summary field
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 6.3 Create GET /funding endpoint
    - Return only items where is_funding_opportunity is true
    - Sort by deadline ascending (null deadlines last)
    - Return empty array if no funding items
    - _Requirements: 6.1_

  - [ ] 6.4 Create GET /health endpoint
    - Check Bedrock reachability (≤3s timeout), then OpenAI (≤3s timeout)
    - Check SQLite connectivity with test query
    - Return { status: "ok", ai_provider: "bedrock"|"openai"|"none", db: "connected"|"disconnected" }
    - Always return HTTP 200 even if providers unavailable
    - Total response within 5 seconds; partial results if timeout exceeded
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 6.5 Write property tests for items listing, digest, and funding endpoints
    - **Property 7: Items listing sort order**
    - **Property 8: Filter correctness**
    - **Property 9: Digest completeness and ordering**
    - **Property 10: Funding endpoint filter and sort**
    - **Property 15: Data integrity — invalid scores/categories rejected**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 6.1, 11.3, 11.4**

- [ ] 7. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Set up frontend project structure
  - [ ] 8.1 Initialize React+Vite TypeScript project with dependencies
    - Create `frontend/` directory with Vite + React + TypeScript template
    - Install dependencies (react-router-dom, axios or fetch wrapper)
    - Configure proxy or API base URL pointing to backend (http://localhost:8000)
    - Set up basic routing: Dashboard (/), Digest (/digest), Funding (/funding)
    - _Requirements: 4.7, 4.8_

  - [ ] 8.2 Create shared TypeScript types and API client
    - Create `frontend/src/types.ts` with Item, IngestResult, DigestResponse interfaces matching backend models
    - Create `frontend/src/api.ts` with typed API functions: getItems, ingestFeeds, analyzeItem, translateItem, getDigest, getFunding, healthCheck
    - _Requirements: 4.7, 4.8_

- [ ] 9. Implement frontend Dashboard page
  - [ ] 9.1 Create Dashboard page with item list and filters
    - Create `frontend/src/pages/DashboardPage.tsx`
    - Fetch GET /items on mount, display items ordered by created_at descending
    - Display each item with: title, source, category badge (or "Not analyzed"), relevance_score (or "Not analyzed"), funding status indicator
    - Add category filter dropdown and is_funding toggle
    - Show empty state "No items yet — click Ingest to get started" when list is empty
    - _Requirements: 4.1, 4.7, 9.6_

  - [ ] 9.2 Create ItemCard component with Analyze and Translate actions
    - Create `frontend/src/components/ItemCard.tsx`
    - Display item details: title, source, category badge, relevance score, funding indicator
    - Add Analyze button: POST /analyze/{id}, show loading spinner, update item on success
    - Add Translate button with language picker (en/fr/de): POST /translate/{id}, show loading spinner, update item on success
    - _Requirements: 4.7, 4.8_

  - [ ] 9.3 Create IngestButton component
    - Create `frontend/src/components/IngestButton.tsx`
    - POST /ingest/rss on click, show loading state, disable button during request
    - Display ingested count and any feed errors on completion
    - _Requirements: 4.8, 9.1_

  - [ ] 9.4 Implement error and loading state handling for Dashboard actions
    - Show inline error messages on failed Analyze/Translate (503: "AI service unavailable", 400: validation error, 404: "Item not found", network error: "Server could not be reached")
    - Disable action buttons during requests to prevent duplicates
    - Clear previous error messages on retry or success
    - Hide loading spinner within 1 second of error response
    - _Requirements: 4.9, 9.1, 9.2, 9.3, 9.4, 9.5, 9.7, 9.8_

- [ ] 10. Implement frontend Digest and Funding pages
  - [ ] 10.1 Create Digest page
    - Create `frontend/src/pages/DigestPage.tsx`
    - Fetch GET /digest on mount
    - Display briefing_date, AI-generated summary, and list of top items sorted by relevance
    - Show loading state while fetching
    - Handle empty digest (no analyzed items message)
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 10.2 Create Funding page
    - Create `frontend/src/pages/FundingPage.tsx`
    - Fetch GET /funding on mount with loading indicator
    - Display each funding item: title, source, deadline (locale-formatted date or "No deadline"), relevance_score (or "Not analyzed")
    - Show empty state: "No funding opportunities currently available"
    - Show error state: "Funding data could not be loaded" on API failure or 10s timeout
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 10.3 Write property test for frontend error clear on retry
    - **Property 17: Frontend error clear on retry**
    - **Validates: Requirements 9.8**

- [ ] 11. Final checkpoint - Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Backend uses Python 3.11+ with FastAPI; Frontend uses React + Vite with TypeScript
- SQLite provides zero-config persistence suitable for the 2-day hackathon timeline
- AI provider failover is transparent to all consuming services

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "8.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "8.2"] },
    { "id": 2, "tasks": ["2.1", "3.1"] },
    { "id": 3, "tasks": ["2.2", "3.2", "3.3", "4.2"] },
    { "id": 4, "tasks": ["4.1", "5.1"] },
    { "id": 5, "tasks": ["4.3", "4.4", "5.2"] },
    { "id": 6, "tasks": ["5.3", "6.1", "6.2", "6.3", "6.4"] },
    { "id": 7, "tasks": ["6.5", "9.1"] },
    { "id": 8, "tasks": ["9.2", "9.3"] },
    { "id": 9, "tasks": ["9.4", "10.1", "10.2"] },
    { "id": 10, "tasks": ["10.3"] }
  ]
}
```
