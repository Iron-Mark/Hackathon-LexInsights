# API

LexInSight uses a small set of internal Next.js routes and a separate RAG backend.

## Internal Routes

### `GET /api/version`

Returns app identity, package version, current deployment metadata, and optional commit comparison.

Useful checks:

```powershell
curl http://localhost:3000/api/version
curl "http://localhost:3000/api/version?expectedSha=<commit>"
```

### `GET /api/readiness`

Checks Supabase env values, Supabase key format, RAG DNS, direct RAG health, and RAG proxy health.

Query parameters:

- `timeoutMs` - clamps between 500 and 60000 ms.
- `externalChecks=skip` - skips external network checks for local smoke checks only.

Examples:

```powershell
curl "http://localhost:3000/api/readiness?timeoutMs=10000"
curl "http://localhost:3000/api/readiness?externalChecks=skip"
```

### `GET /api/rag-proxy`

Default upstream endpoint: `/api/research/health`.

Query parameters:

- `endpoint` - upstream path to call.
- `timeoutMs` - bounded timeout.

Example:

```powershell
curl "http://localhost:3000/api/rag-proxy?endpoint=/api/research/health"
```

### `POST /api/rag-proxy`

Default upstream endpoint: `/api/research/rag-summary`.

The body is forwarded as JSON to the upstream RAG backend. Upstream HTTP errors and malformed upstream payloads are converted into stable JSON errors.

## RAG Service Contracts

Client wrappers live in [rag-api.ts](../lexiph/src/lib/services/rag-api.ts) and [deep-search-api.ts](../lexiph/src/lib/services/deep-search-api.ts).

### Standard RAG

Upstream endpoint:

```text
POST /api/research/rag-summary
```

Request:

```json
{
  "query": "What is RA 9003?",
  "user_id": "optional-user-id",
  "use_deep_search": false
}
```

Response shape used by the app:

```json
{
  "status": "completed",
  "query": "What is RA 9003?",
  "summary": "string",
  "search_queries_used": ["string"],
  "documents_found": 3,
  "processing_time_seconds": 1.2
}
```

### Deep Search

Deep search uses the same upstream summary endpoint with:

```json
{
  "use_deep_search": true
}
```

The app maps the response into enhanced summary, related documents, insights, and cross references for the compliance UI.

### Draft Checker

Upstream endpoint:

```text
POST /api/legislation/draft-checker
```

Request:

```json
{
  "draft_markdown": "# Draft title\n\nDraft content",
  "user_id": "optional-user-id",
  "include_summary": true
}
```

The response is consumed as green, amber, and red findings with recommendations and references.

## Configuration

RAG configuration is centralized in [rag-config.ts](../lexiph/src/lib/services/rag-config.ts).

- `NEXT_PUBLIC_USE_RAG_PROXY=true` means browser calls use `/api/rag-proxy`.
- `NEXT_PUBLIC_USE_RAG_PROXY=false` means browser calls go directly to `NEXT_PUBLIC_RAG_API_URL`.
- Keep proxy mode enabled unless the RAG backend explicitly supports browser CORS.
