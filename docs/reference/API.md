# API

LexInsights uses a small set of internal Next.js routes, an optional remote RAG backend, and a bundled providerless local research engine. Providerless local research is the default runtime mode.

## Internal Routes

### `GET /api/version`

Returns app identity, package version, current deployment metadata, and optional commit comparison.

Useful checks:

```powershell
curl http://localhost:3000/api/version
curl "http://localhost:3000/api/version?expectedSha=<commit>"
```

### `GET /api/readiness`

Checks Supabase env values, Supabase key format, provider mode, and external backend health. In the default `local-providerless` mode, RAG DNS, direct health, and proxy health are reported as noncritical skipped checks. When `NEXT_PUBLIC_RAG_PROVIDER_MODE=remote-rag`, remote RAG health becomes part of readiness.

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

The route accepts JSON research objects with `query`, optional `user_id`, and optional `use_deep_search`. Requests are limited to 64KB, queries are limited to 4,000 characters, and unknown fields are dropped before forwarding. Upstream HTTP errors and malformed upstream payloads are converted into stable JSON errors.

### `POST /api/document-text`

Extracts text from PDF and Word uploads before local draft checking.

Request:

- Multipart form data with a `file` field.
- Supported file types: `.pdf`, `.docx`, `.doc`, `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, and `application/msword`.
- Maximum size: 5MB.
- The route checks PDF and Word file signatures before extraction and caps extracted text returned to the app.

Response:

```json
{
  "text": "normalized extracted text",
  "extractionMode": "server-pdf",
  "fileName": "draft.pdf",
  "warnings": []
}
```

Text and Markdown files are read in the browser and do not call this route.

## RAG Service Contracts

Client wrappers live in [rag-api.ts](../../src/lib/services/rag-api.ts) and [deep-search-api.ts](../../src/lib/services/deep-search-api.ts).

The default provider mode is `local-providerless`, so wrappers return deterministic local output from [local-legal-research.ts](../../src/lib/services/local-legal-research.ts) without calling an AI provider. If `NEXT_PUBLIC_RAG_PROVIDER_MODE` is set to `remote` or `remote-rag`, the wrappers try the configured RAG provider first and fall back locally on timeout, CORS/network failure, or upstream error. See [Providerless Research](./PROVIDERLESS-RESEARCH.md) for algorithm and corpus details.

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
  "processing_time_seconds": 1.2,
  "provider_mode": "local-providerless",
  "fallback_used": true,
  "confidence_score": 0.91,
  "retrieval_metadata": {
    "result_limit": 6,
    "total_candidates": 12,
    "top_score": 42.5,
    "score_threshold": 1.25,
    "citation_numbers": ["9003"],
    "known_citation_numbers": ["9003"],
    "unknown_citation_numbers": [],
    "source_type_counts": {
      "statute": 6
    },
    "provenance_coverage": {
      "seeded": 5,
      "verified": 1
    },
    "relation_paths": [
      {
        "source": "RA 9003",
        "relation_type": "workflow_related_to",
        "target": "RA 7160",
        "label": "Local solid waste planning and LGU implementation workflow"
      }
    ],
    "coverage_warnings": [
      "Local results are deterministic and should be checked against current official issuances."
    ],
    "local_corpus_limitations": [
      "Bundled local corpus only; no live web, agency-site crawl, court-decision crawl, or embedding provider was used."
    ],
    "processing_ms": 8
  },
  "matched_documents": [
    {
      "title": "RA 9003 - Ecological Solid Waste Management Act of 2000",
      "statute": "RA 9003",
      "source_name": "Lawphil",
      "source_url": "https://lawphil.net/statutes/repacts/ra2001/ra_9003_2001.html",
      "relevance_score": 0.95,
      "matched_terms": ["RA 9003", "solid waste"],
      "support_level": "direct",
      "authority_type": "statute",
      "source_tier": "official-primary",
      "source_last_verified": "2026-06-25",
      "provenance_status": "seeded",
      "supporting_fields": ["citation", "title", "topics"]
    }
  ]
}
```

When local fallback is used, `provider_mode` is `local-providerless`, `fallback_used` is `true`, and `fallback_reason` may describe the remote failure. Local responses may include `retrieval_metadata` so diagnostics can show candidate count, result limits, top score, score threshold, normalized citation numbers, known or unknown citation coverage, source type counts, provenance coverage, relation paths, coverage warnings, local corpus limits, and local processing time. `matched_documents` may also include local-only trust fields such as `support_level`, `authority_type`, `source_tier`, `source_last_verified`, `provenance_status`, `evidence_anchors`, `related_authorities`, and `supporting_fields`.

### Deep Search

Deep search uses the same upstream summary endpoint with:

```json
{
  "use_deep_search": true
}
```

The app maps the response into enhanced summary, related documents, insights, and cross references for the compliance UI. In providerless mode, Deep Search expands local cross-references only; it does not download PDFs or call an AI provider.

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

The response is consumed as green, amber, and red findings with recommendations and references. Plain text and Markdown drafts can be checked locally in the browser path. PDF and Word files are extracted through `/api/document-text`, then checked locally when providerless mode is active or the remote Draft Checker is unavailable.

### Health Checks

`checkRAGHealth()` and `checkDraftCheckerHealth()` return local providerless health by default. In remote mode, they return remote health when available. If the remote provider is unavailable but local fallback can run, they return:

```json
{
  "status": "healthy",
  "service": "providerless-local-legal-research",
  "provider_mode": "local-providerless",
  "degraded": true,
  "fallback_reason": "Remote health check failed"
}
```

## Configuration

RAG configuration is centralized in [rag-config.ts](../../src/lib/services/rag-config.ts).

- `NEXT_PUBLIC_USE_RAG_PROXY=true` means browser calls use `/api/rag-proxy`.
- `NEXT_PUBLIC_USE_RAG_PROXY=false` means browser calls go directly to `NEXT_PUBLIC_RAG_API_URL`.
- `NEXT_PUBLIC_RAG_PROVIDER_MODE=local-providerless` uses the bundled deterministic provider and is the default.
- `NEXT_PUBLIC_RAG_PROVIDER_MODE=remote-rag` opts into the remote provider first, with local fallback.
- Keep proxy mode enabled unless the RAG backend explicitly supports browser CORS.
- The app remains usable without a reachable RAG provider through local providerless research and draft checks.
