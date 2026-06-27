# Requirements Document

## Introduction

The NGO Intelligence Dashboard is an AI-powered web application built for the AI 4 Good Hackathon (2-day build). It aggregates news and funding opportunities for two partner NGOs — Burundi Kids (education, child welfare in Burundi) and WTG (animal welfare, global) — and provides AI-driven analysis (summarization, classification, relevance scoring) and translation between English, French, and German. The system uses React+Vite for the frontend, Python FastAPI for the backend, SQLite for storage, and AWS Bedrock Claude (primary) or OpenAI GPT-4o-mini (fallback) for AI capabilities.

## Glossary

- **Dashboard**: The React web interface displaying aggregated intelligence items to users
- **Ingestion_Service**: The backend component responsible for fetching RSS feeds, parsing articles, and storing raw items in the database
- **Analysis_Service**: The backend component that uses AI to summarize, classify, score relevance, and detect funding opportunities in items
- **Translation_Service**: The backend component that translates item text between English, French, and German using AI
- **AI_Provider**: The abstraction layer that routes AI requests to AWS Bedrock Claude (primary) or OpenAI GPT-4o-mini (fallback)
- **Item**: A single piece of ingested content (news article or funding opportunity) stored in the database
- **Relevance_Score**: A float value between 0.0 and 1.0 indicating how relevant an item is to the partner NGOs
- **Digest**: A curated briefing view showing only high-relevance analyzed items ready for NGO consumption
- **Keyword_Score**: A float value computed as min(1.0, number_of_target_keyword_matches / 5), used as one component of Relevance_Score
- **Target_Keywords**: A predefined list of terms relevant to the partner NGOs, including geographic terms (burundi, bujumbura, gitega, east africa), domain terms (education, animal welfare, wildlife), and sector terms (funding, grants, ngo, humanitarian)
- **Frontend**: The React+Vite single-page application that communicates with the Backend via HTTP/JSON
- **Backend**: The Python FastAPI server exposing REST API endpoints and coordinating all services

## Requirements

### Requirement 1: RSS Feed Ingestion

**User Story:** As an NGO staff member, I want to ingest articles from RSS feeds, so that I have a fresh pool of news and funding items to analyze.

#### Acceptance Criteria

1. WHEN a POST request is made to `/ingest/rss` with a JSON body containing a `feeds` array (maximum 20 URLs), THE Ingestion_Service SHALL fetch each RSS feed with a per-feed timeout of 30 seconds, parse the articles, and store them as Items in the database
2. WHEN a POST request is made to `/ingest/rss` without specifying a `feeds` array or with an empty `feeds` array, THE Ingestion_Service SHALL use the preconfigured default RSS feed URLs: reliefweb.int updates, devex.com news, and BBC Africa world news feeds
3. THE Ingestion_Service SHALL store each ingested Item with the following fields: title (text), url (text, unique), source (feed domain name), published_at (timestamp or null), language (ISO 639-1 code detected from the raw_text content using a language detection library, or "unknown" if detection confidence is below threshold or detection fails), raw_text (full article text extracted from the feed entry content/description field, or the title if no content is available), and created_at (current UTC timestamp)
4. WHEN an Item with the same URL already exists in the database, THE Ingestion_Service SHALL skip that Item without creating a duplicate and without reporting it as an error
5. IF a specific RSS feed is unreachable, times out after 30 seconds, or returns data that cannot be parsed as valid RSS/Atom XML, THEN THE Ingestion_Service SHALL skip that feed, continue processing remaining feeds, and include an object with the feed_url and error description in the response errors array
6. WHEN ingestion completes, THE Ingestion_Service SHALL return an HTTP 200 response with a JSON body containing the count of newly ingested items in an `ingested` field and a list of feed-level errors in an `errors` array
7. IF a feed entry is missing a title or a URL, THEN THE Ingestion_Service SHALL skip that entry without storing it and without reporting an error
8. IF the POST request body contains a `feeds` array with more than 20 URLs, THEN THE Ingestion_Service SHALL return an HTTP 400 response indicating the maximum number of feeds is 20
9. IF all feeds in the request fail (all produce errors and zero items are ingested), THEN THE Ingestion_Service SHALL still return an HTTP 200 response with `ingested` set to 0 and the `errors` array populated with each feed's failure

### Requirement 2: AI-Powered Analysis

**User Story:** As an NGO staff member, I want to analyze an ingested item using AI, so that I get a summary, category classification, relevance score, and funding detection without reading the full article.

#### Acceptance Criteria

1. WHEN a POST request is made to `/analyze/{id}`, THE Analysis_Service SHALL generate a plain-text summary of the item text with a minimum length of 1 character and a maximum length of 200 characters, containing no markup or formatting
2. WHEN a POST request is made to `/analyze/{id}`, THE Analysis_Service SHALL assign exactly one category to the Item from the set: "news", "funding", "policy", "research", "other"
3. WHEN a POST request is made to `/analyze/{id}`, THE Analysis_Service SHALL compute a Relevance_Score as a float between 0.0 and 1.0 inclusive, using the formula: final_score = (0.7 × ai_score) + (0.3 × keyword_score), where ai_score is a float between 0.0 and 1.0 returned by the AI_Provider and keyword_score equals min(1.0, number_of_Target_Keywords found in the combined title and raw_text / 5)
4. WHEN a POST request is made to `/analyze/{id}`, THE Analysis_Service SHALL determine whether the Item is a funding opportunity and set the is_funding_opportunity field to true or false
5. WHEN an Item is identified as a funding opportunity (is_funding_opportunity is true), THE Analysis_Service SHALL attempt to extract a deadline date from the item text and store it as an ISO 8601 date string (YYYY-MM-DD) in the deadline field, or set the deadline field to null if no deadline date is found
6. WHEN an Item is identified as not a funding opportunity (is_funding_opportunity is false), THE Analysis_Service SHALL set the deadline field to null
7. IF the primary AI_Provider (AWS Bedrock Claude) is unavailable, THEN THE Analysis_Service SHALL transparently fall back to the secondary AI_Provider (OpenAI GPT-4o-mini) to complete the analysis without returning an error to the client
8. IF both AI providers are unavailable, THEN THE Analysis_Service SHALL return an HTTP 503 response with a message indicating the AI service is temporarily unavailable, without modifying the Item in the database
9. WHEN analysis completes successfully, THE Analysis_Service SHALL persist the updated Item in the database and return an HTTP 200 response containing the full Item object with summary, category, relevance_score, is_funding_opportunity, and deadline fields populated
10. IF a POST request is made to `/analyze/{id}` where no Item exists with the specified id, THEN THE Analysis_Service SHALL return an HTTP 404 response indicating the item was not found
11. IF the AI scoring component fails during relevance computation but the AI_Provider is available for other analysis tasks (summary, classification, funding detection), THEN THE Analysis_Service SHALL compute the Relevance_Score using keyword matching only: keyword_score = min(1.0, number_of_Target_Keywords found in combined title and raw_text / 5)
12. WHEN a POST request is made to `/analyze/{id}` for an Item that has already been analyzed, THE Analysis_Service SHALL re-run the full analysis and overwrite the previously stored summary, category, relevance_score, is_funding_opportunity, and deadline fields with the new results
13. IF a POST request is made to `/analyze/{id}` where the Item's raw_text field is null or contains only whitespace, THEN THE Analysis_Service SHALL return an HTTP 400 response indicating that the item has no text content available for analysis, without modifying the Item in the database

### Requirement 3: Multilingual Translation

**User Story:** As an NGO staff member, I want to translate an item's text into English, French, or German, so that I can share information with colleagues and partners who speak different languages.

#### Acceptance Criteria

1. WHEN a POST request is made to `/translate/{id}` with a JSON body containing a valid `target_language` field, THE Translation_Service SHALL translate the Item's raw_text field into the specified target language and return an HTTP 200 response containing the full updated Item with the translated_text field populated as a non-empty string
2. THE Translation_Service SHALL support exactly three target languages: English ("en"), French ("fr"), and German ("de")
3. WHEN translation completes successfully, THE Translation_Service SHALL store the translated text in the Item's translated_text field (overwriting any previously stored translation) and SHALL NOT modify the original raw_text field
4. IF the `target_language` value is not one of "en", "fr", or "de", THEN THE Translation_Service SHALL return an HTTP 400 response with a message indicating the unsupported language value
5. IF the Item's raw_text field is null or contains only whitespace characters, THEN THE Translation_Service SHALL return an HTTP 400 response with a message indicating no text is available for translation
6. IF both AI providers (Bedrock Claude primary and OpenAI fallback) are unavailable, THEN THE Translation_Service SHALL return an HTTP 503 response indicating the translation service is temporarily unavailable and SHALL NOT modify the Item's existing translated_text field
7. IF no Item exists with the specified id, THEN THE Translation_Service SHALL return an HTTP 404 response indicating the item was not found
8. WHEN translation is requested and the `target_language` matches the Item's detected language field, THE Translation_Service SHALL still perform the translation and store the result in the translated_text field
9. IF the request body is missing the `target_language` field or the request body is not valid JSON, THEN THE Translation_Service SHALL return an HTTP 422 response indicating the required field is missing

### Requirement 4: Dashboard Item Listing

**User Story:** As an NGO staff member, I want to browse all ingested items with filtering options, so that I can find relevant articles and trigger analysis or translation actions.

#### Acceptance Criteria

1. WHEN a GET request is made to `/items` with no query parameters, THE Backend SHALL return an HTTP 200 response with a JSON array of all stored Items ordered by created_at descending (newest first), where each Item object contains the fields: id, title, url, source, published_at, language, raw_text, summary, category, relevance_score, is_funding_opportunity, deadline, translated_text, and created_at
2. WHEN a GET request to `/items` includes a `category` query parameter, THE Backend SHALL return only Items whose category field matches the specified value using case-insensitive comparison, and Items with a null category field SHALL NOT be included in the results
3. WHEN a GET request to `/items` includes an `is_funding` query parameter set to true or false, THE Backend SHALL return only Items where the is_funding_opportunity field matches the specified boolean value
4. WHEN a GET request to `/items` includes both `category` and `is_funding` query parameters, THE Backend SHALL apply both filters using logical AND and return only Items matching both conditions
5. IF the `/items` endpoint is called and no Items exist in the database or no Items match the specified filters, THEN THE Backend SHALL return an HTTP 200 response with an empty JSON array
6. IF a GET request to `/items` includes an `is_funding` query parameter with a value that is not parseable as a boolean (i.e., not "true" or "false" case-insensitive), THEN THE Backend SHALL return an HTTP 422 response with an error message indicating the invalid parameter value
7. THE Frontend SHALL display each Item with: title, source name, category badge (or "Not analyzed" if category is null), relevance_score as a numeric value between 0.0 and 1.0 (or "Not analyzed" if null), and a funding status indicator (boolean badge showing true or false based on is_funding_opportunity)
8. THE Frontend SHALL provide per-item actions: an Analyze button that sends POST `/analyze/{id}` and a Translate button with a language picker (en/fr/de) that sends POST `/translate/{id}`, each displaying a loading spinner while the request is in progress and updating the displayed Item data upon successful response
9. IF a POST `/analyze/{id}` or POST `/translate/{id}` request initiated from the Frontend returns an error response (HTTP 503 or 400), THEN THE Frontend SHALL display an inline error message on the affected Item indicating the failure reason and SHALL hide the loading spinner within 1 second of receiving the error response

### Requirement 5: Digest Briefing

**User Story:** As an NGO director, I want a curated digest of the most relevant analyzed items, so that I can quickly review what matters most for our organization.

#### Acceptance Criteria

1. WHEN a GET request is made to `/digest`, THE Backend SHALL return an HTTP 200 response containing only Items that have non-null values for all three fields: summary, category, and relevance_score
2. WHEN a GET request is made to `/digest`, THE Backend SHALL return the digest response as a JSON object containing: a `briefing_date` field (ISO 8601 date string of the current UTC date), an `items` array of full Item objects sorted by relevance_score descending (with ties broken by created_at descending) with a maximum of 20 items, and a `summary` field containing AI-generated text of no more than 500 characters that highlights key themes across the returned items
3. IF no Items with non-null summary, category, and relevance_score exist in the database, THEN THE Backend SHALL return a digest with an empty `items` array, the current `briefing_date`, and a `summary` field containing a message indicating no analyzed items are available
4. IF the AI_Provider is unavailable when generating the digest summary text, THEN THE Backend SHALL return the digest with items populated but with the `summary` field containing a fallback message indicating the AI summary could not be generated

### Requirement 6: Funding Opportunities Page

**User Story:** As an NGO program manager, I want a dedicated view showing only funding opportunities, so that I can quickly review available grants and their deadlines.

#### Acceptance Criteria

1. WHEN a GET request is made to `/funding`, THE Backend SHALL return an HTTP 200 response with a JSON array containing only Items where is_funding_opportunity is true (including Items with past deadlines), sorted by deadline ascending with Items having a null deadline appearing last
2. THE Frontend SHALL display each funding Item with: title, source name, deadline (formatted as a locale-appropriate date such as "Mar 15, 2025" if present, or "No deadline" placeholder text if null), and Relevance_Score (displayed as a numeric value between 0.0 and 1.0 if analyzed, or "Not analyzed" placeholder text if null)
3. IF no Items with is_funding_opportunity equal to true exist in the database, THEN THE Frontend SHALL display an empty-state message: "No funding opportunities currently available"
4. IF the GET `/funding` endpoint fails to respond within 10 seconds or returns an HTTP error status (4xx or 5xx), THEN THE Frontend SHALL display an error message: "Funding data could not be loaded"
5. WHILE the GET `/funding` request is in progress, THE Frontend SHALL display a loading indicator to inform the user that funding data is being retrieved

### Requirement 7: Health Check Endpoint

**User Story:** As a developer demoing the application, I want a health check endpoint, so that I can verify the system is running and confirm which AI provider is active.

#### Acceptance Criteria

1. WHEN a GET request is made to `/health`, THE Backend SHALL return an HTTP 200 response with a JSON body (content-type `application/json`) containing: "status" set to "ok", "ai_provider" set to the currently active provider name, and "db" set to the database connection status, within 5 seconds of receiving the request
2. WHEN determining the AI provider status, THE Backend SHALL check AWS Bedrock reachability first (with a timeout of no more than 3 seconds), and set "ai_provider" to "bedrock" if reachable; otherwise check OpenAI reachability (with a timeout of no more than 3 seconds), and set "ai_provider" to "openai" if reachable; otherwise set "ai_provider" to "none"
3. WHEN checking database connectivity, THE Backend SHALL set "db" to "connected" if a test query to SQLite completes successfully, or "disconnected" if the test query fails or the database file is inaccessible
4. IF neither Bedrock nor OpenAI is reachable, THEN THE Backend SHALL still return HTTP 200 with "status" set to "ok" and "ai_provider" set to "none"
5. IF the combined provider and database checks exceed 5 seconds, THEN THE Backend SHALL return the response with whatever status values have been determined so far, setting any unchecked fields to "none" for "ai_provider" or "disconnected" for "db"

### Requirement 8: AI Provider Failover

**User Story:** As a developer, I want the system to automatically fall back from AWS Bedrock to OpenAI when the primary provider is unavailable, so that the demo continues working regardless of individual provider outages.

#### Acceptance Criteria

1. WHEN the AI_Provider receives a request and AWS Bedrock Claude is available, THE AI_Provider SHALL route the request to Bedrock Claude as the primary provider
2. IF AWS Bedrock Claude returns an HTTP error status (4xx or 5xx), a connection timeout (exceeding 8 seconds), or is unreachable for an AI request, THEN THE AI_Provider SHALL automatically retry the same request using OpenAI GPT-4o-mini without requiring user intervention
3. IF both AWS Bedrock Claude and OpenAI GPT-4o-mini are unavailable for an AI request, THEN THE AI_Provider SHALL raise an AIUnavailableError that propagates to the calling service
4. THE AI_Provider SHALL complete the failover decision (attempt primary, detect failure, route to fallback) within 10 seconds per request to avoid blocking the API response

### Requirement 9: Frontend Error and Loading States

**User Story:** As an NGO staff member, I want clear feedback when actions are in progress or fail, so that I understand the system status and can take corrective action.

#### Acceptance Criteria

1. WHILE an API request is in progress (ingest, analyze, or translate), THE Frontend SHALL display a loading indicator adjacent to the element that triggered the action and SHALL disable that element to prevent duplicate submissions
2. IF an API request to the Backend returns an HTTP 503 status, THEN THE Frontend SHALL display an inline error message adjacent to the triggering element indicating the AI service is temporarily unavailable and suggest retrying later
3. IF an API request to the Backend fails due to a network error (server unreachable), THEN THE Frontend SHALL display a message adjacent to the triggering element indicating the server could not be reached
4. IF an API request to the Backend returns an HTTP 404 status, THEN THE Frontend SHALL display an inline error message indicating the requested item was not found
5. IF an API request to the Backend returns an HTTP 400 status, THEN THE Frontend SHALL display an inline error message showing the validation error returned by the Backend
6. IF the Dashboard page loads and the GET `/items` response contains an empty array, THEN THE Frontend SHALL display an empty-state message prompting the user to click the Ingest button to get started
7. WHEN an Analyze or Translate action completes successfully, THE Frontend SHALL immediately update the displayed Item data with the response values without requiring a full page reload
8. WHEN a previously displayed error message exists on an element and a new action is triggered on that element or the action succeeds, THE Frontend SHALL clear the previous error message

### Requirement 10: CORS and API Communication

**User Story:** As a developer, I want the backend to allow cross-origin requests from the frontend dev server, so that the React application can communicate with the FastAPI backend during development and demo.

#### Acceptance Criteria

1. THE Backend SHALL include CORS headers allowing requests from the Frontend development origin (http://localhost:5173) and any additional origins specified via an environment variable
2. THE Backend SHALL allow the HTTP methods GET, POST, and OPTIONS in CORS responses
3. THE Backend SHALL allow the Content-Type header in CORS requests
4. IF a preflight OPTIONS request is received, THEN THE Backend SHALL respond with an HTTP 200 status and include the Access-Control-Allow-Origin, Access-Control-Allow-Methods, and Access-Control-Allow-Headers response headers matching the values configured in criteria 1, 2, and 3

### Requirement 11: Data Integrity Constraints

**User Story:** As an NGO staff member, I want the system to maintain consistent and valid data, so that I can trust the information displayed in the dashboard.

#### Acceptance Criteria

1. THE Backend SHALL enforce a UNIQUE constraint on the Item url field at the database level to prevent duplicate entries
2. THE Backend SHALL enforce that every stored Item has non-null and non-empty (not whitespace-only) values for title, url, source, and raw_text fields
3. WHEN an Item's relevance_score is stored, THE Backend SHALL ensure the value is a float within the range 0.0 to 1.0 inclusive; IF a value outside this range is provided, THEN THE Backend SHALL reject the operation and return an HTTP 400 response
4. WHEN an Item's category is stored, THE Backend SHALL ensure the value is exactly one of: "news", "funding", "policy", "research", "other"; IF an invalid category value is provided, THEN THE Backend SHALL reject the operation and return an HTTP 400 response
5. THE Backend SHALL store all timestamp fields (created_at, published_at) in ISO 8601 format with UTC timezone designation
