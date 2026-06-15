# RAG API Testing Guide

## Overview

This directory contains tests for the Philippine Legislative Research RAG API integration.

## API Details

- **Default Base URL**: `https://devkada.resqlink.org`
- **Main Endpoint**: `POST /api/research/rag-summary`
- **WebSocket**: `wss://devkada.resqlink.org/api/research/ws/rag-summary`
- **Timeout**: 300 seconds (5 minutes)
- **Expected Response Time**: 50-90 seconds

Use `http://localhost:8000` and `ws://localhost:8000` only when running a compatible self-hosted backend and after updating `.env.local`.

## Pipeline Stages

1. **Query Generation** (1-2 seconds) - Converts question into 3-7 optimized search queries
2. **Database Search** (20-30 seconds) - Searches 33,562+ documents via semantic search + reranking
3. **AI Summarization** (30-60 seconds) - Generates 8-section markdown summary

## Testing Methods

For the full sequential local gate, run:

```bash
npm run check:local
```

This is the pre-push maintainer path. It includes Markdown link parser self-tests and repo-local Markdown link validation. The methods below remain useful when debugging one specific docs, readiness, deployment, proxy, or browser layer.

### Markdown Link Check

Run this after editing repo-local Markdown links:

```bash
npm run check:docs:self-test
npm run check:docs
```

The self-test covers parser edge cases such as titled links, angle-bracket paths with spaces, reference links, HTML `href`/`src` attributes, and fenced code blocks. The check scans Markdown files from the repository root, skips generated dependency/build folders, and fails on broken local inline, reference, or HTML attribute links.

### Method 0: Readiness Check

Run this before claiming a true backend E2E pass:

```bash
npm run check:readiness
```

When the app is running locally, include route checks:

```bash
npm run dev -- -p 3000
npm run check:readiness -- --base-url http://localhost:3000
```

The command prints non-secret status for Supabase env/key checks, Supabase DNS, direct RAG health, the Next.js RAG proxy, and the key app routes. It exits nonzero when critical backend readiness is blocked. Supabase key checks validate public key format, anon role, and legacy JWT issuer/project-ref alignment without printing the raw key. For fast backend probes, the HTTP endpoint also accepts `/api/readiness?timeoutMs=2000`; that timeout is forwarded to the RAG proxy health call so blocked upstream checks return quickly with structured `502` or `504` errors. For browser route-shape smoke only, `/api/readiness?externalChecks=skip` skips Supabase DNS and RAG health fetches as non-blocking checks, so it proves route shape but not backend E2E readiness. RAG proxy `endpoint` values must stay on the configured RAG API origin.

For offline/local-tuning workflows, you can also skip external dependency probes in the script runner:

```bash
npm run check:readiness -- --skip-external-checks
npm run check:readiness -- --base-url http://localhost:3000 --skip-external-checks
```

That mode keeps local env/key checks intact while marking DNS and upstream health probes as non-blocking.

### Method 1: Readiness Helper Self-Test

Run this after changing readiness parsing or Supabase key checks:

```bash
npm run check:readiness:self-test
```

The self-test is offline and deterministic. It covers matching anon JWTs, mismatched project refs, legacy service-role JWTs, `sb_secret_` keys, publishable keys, unknown keys, and raw-key redaction.

### Method 2: Deployment Preflight Helper Self-Test

Run this after changing deployment preflight parsing, Vercel project visibility checks, or output redaction:

```bash
npm run check:deployment:self-test
```

The self-test is offline and deterministic. It covers GitHub origin parsing, commit SHA comparison, Vercel alias/project matching, safe Vercel project summaries, and secret-safe public output projection.

### Method 3: Live Deployment Helper Self-Test

Run this after changing live route, source-only, commit comparison, or public output behavior:

```bash
npm run check:live:self-test
```

The self-test is offline and deterministic. It covers argument parsing, URL handling, commit SHA comparison, route path joining, and secret-safe public output projection.

### Method 4: RAG Proxy Helper Self-Test

Run this after changing RAG proxy timeout, endpoint-origin, or error-classification behavior:

```bash
npm run check:rag-proxy:self-test
```

The self-test is offline and deterministic. It covers timeout clamping, same-origin endpoint resolution, cross-origin endpoint rejection, upstream timeout classification, upstream fetch failure classification, public upstream-error redaction, bounded proxy log summaries, and secret-safe helper output.

### Method 4: Deployment Preflight

After a production deployment, run the preflight first to verify app-root assumptions, clean worktree status, local Vercel linkage status, `/api/version`, `/api/readiness`, and RAG proxy route presence:

```bash
npm run check:deployment -- --base-url https://lexiph.vercel.app
```

Use `--with-vercel-cli` when you also need to confirm the current shell has an authenticated Vercel CLI session. The command does not print raw env values or provider secrets.

Use `--discover-vercel-scopes` with the CLI check to print safe team-scope slugs available to the current Vercel account:

```bash
npm run check:deployment -- --base-url https://lexiph.vercel.app --with-vercel-cli --discover-vercel-scopes
```

Use `--vercel-scope <team>` with `--with-vercel-cli` when the deployment may live under a team account:

```bash
npm run check:deployment -- --base-url https://lexiph.vercel.app --with-vercel-cli --discover-vercel-scopes --vercel-scope marksiazon-dev
```

When the repo or live URL is still not visible, the preflight prints a non-critical `vercel.recovery_hint` with the next scoped command or provider action.

Use `--source-only` or `--skip-backend` to check app-root assumptions, clean worktree status, Vercel linkage, and commit freshness without calling Supabase/RAG route health:

```bash
npm run check:deployment -- --base-url https://lexiph.vercel.app --source-only
npm run check:deployment -- --base-url https://lexiph.vercel.app --skip-backend
```

For diagnostics only, add `--allow-dirty` to inspect live state while local changes are still uncommitted. Do not use it for release readiness.

### Method 5: Live Deployment Check

After a production deployment, verify that the public URL serves the expected commit and exposes the backend readiness routes:

```bash
npm run check:live -- --base-url https://lexiph.vercel.app
```

Use `--source-only` or `--skip-backend` to check only route availability and commit freshness while Supabase/RAG are still down:

```bash
npm run check:live -- --base-url https://lexiph.vercel.app --source-only
npm run check:live -- --base-url https://lexiph.vercel.app --skip-backend
```

Full mode verifies clean worktree status, compares `GET /api/version` against local `HEAD`, then checks `/api/readiness` and the RAG proxy health path. A `404` for `/api/version` or `/api/readiness` means the live project is stale or not serving this codebase.

For diagnostics only, add `--allow-dirty` to inspect live state while local changes are still uncommitted. Do not use it for release readiness.

### Method 6: Browser Smoke

Run focused Playwright checks for public pages, protected-route redirects, version metadata, and the readiness endpoint response shape:

```bash
npm run smoke:browser
```

By default, Playwright starts its own Next.js dev server on `127.0.0.1:3100` so it does not reuse an unrelated app already listening on port `3000`. To test a running app or a deployed URL, pass `PLAYWRIGHT_BASE_URL`:

```powershell
$env:PLAYWRIGHT_BASE_URL='http://localhost:3000'; npm run smoke:browser; Remove-Item Env:PLAYWRIGHT_BASE_URL
```

Browser smoke proves route behavior, version metadata, readiness response shape, RAG proxy same-origin handling, and RAG proxy upstream-error redaction. In the default managed-local run, Playwright uses `/api/readiness?externalChecks=skip` and points `NEXT_PUBLIC_RAG_API_URL` at its own dev server so smoke does not depend on external Supabase or RAG availability. Full backend E2E still requires `npm run check:readiness` to pass against real Supabase and RAG services.

The managed-local Playwright server also blanks Clerk keys and uses a non-secret Supabase publishable-key placeholder on purpose. That keeps smoke checks deterministic and verifies the missing-Clerk setup blocker instead of depending on real Clerk or Supabase tenants. To verify real Clerk signup/login, start the app with `.env.local` and run smoke against that app with `PLAYWRIGHT_BASE_URL`, then complete the interactive signup/login flow in the browser.

### Method 7: Browser-Based Test Page

1. Start your Next.js development server:
   ```bash
   npm run dev
   ```

2. Navigate to the test page:
   ```
   http://localhost:3000/test-rag
   ```

3. Features:
   - Health check button
   - Query input with sample queries
   - Real-time loading indicators
   - Response metadata display
   - Full summary preview

### Method 8: Legacy Node.js Test Script

Prefer `npm run check:readiness` for maintained backend readiness checks. This legacy script is still useful for ad hoc RAG query experiments, but it uses a transient TypeScript runner rather than a committed package script.

1. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

2. Run the test script:
   ```bash
   npx ts-node tests/rag-api-test.ts
   ```

3. The script will:
   - Check API health
   - Run multiple test queries
   - Display timing information
   - Save full responses to files
   - Show success/failure summary

### Method 9: Direct API Testing with cURL

Test the health endpoint:
```bash
curl https://devkada.resqlink.org/api/research/health
```

Test a query:
```bash
curl -X POST https://devkada.resqlink.org/api/research/rag-summary \
  -H "Content-Type: application/json" \
  -d '{"query": "What is RA 9003?", "user_id": "test"}' \
  --max-time 300
```

### Method 10: Using the Chat Interface

1. Start the development server
2. Navigate to `/chat`
3. Switch to "Compliance Mode"
4. Enter a query about Philippine legislation
5. The RAG API will be called automatically

## Sample Queries

Use these queries to test different aspects of the API:

1. **Simple Law Query**:
   ```
   What is RA 9003 and its main requirements?
   ```

2. **Complex Multi-Law Query**:
   ```
   What are the workplace safety requirements under Philippine law and what penalties apply for non-compliance?
   ```

3. **Specific Topic**:
   ```
   What is the Data Privacy Act of 2012 (RA 10173) and what are the requirements for businesses?
   ```

4. **Compliance Question**:
   ```
   What documents are required for environmental compliance certificate?
   ```

5. **Penalty Information**:
   ```
   What are the penalties for violating solid waste management laws?
   ```

## Expected Response Format

```json
{
  "status": "completed",
  "query": "What is RA 9003?",
  "summary": "# EXECUTIVE SUMMARY\n\nRA 9003 is...",
  "search_queries_used": [
    "RA 9003 solid waste management",
    "Republic Act 9003 requirements",
    "ecological solid waste management act"
  ],
  "documents_found": 42,
  "processing_stages": {
    "query_generator": "completed",
    "search_executor": "completed",
    "summarizer": "completed"
  }
}
```

## Troubleshooting

### API Not Responding

1. Check if the RAG API server is running:
   ```bash
   curl https://devkada.resqlink.org/api/research/health
   ```

2. Verify the API URL in your `.env.local` file:
   ```
   NEXT_PUBLIC_RAG_API_URL=https://devkada.resqlink.org
   NEXT_PUBLIC_USE_RAG_PROXY=true
   ```

3. Check the API server logs for errors

### Timeout Errors

- The API has a 300-second (5 minute) timeout
- If queries consistently timeout:
  - Check server resources (CPU, memory)
  - Verify database is running
  - Check network connectivity
  - Review API server logs

### Empty or Invalid Responses

- Ensure your query is at least 5 characters
- Check that the query is related to Philippine legislation
- Verify the API returned a 200 status code
- Check browser console for errors

### WebSocket Connection Issues

- Ensure WebSocket URL uses `ws://` not `http://`
- Check firewall settings
- Verify WebSocket endpoint is available
- Try HTTP endpoint first to isolate the issue

## Environment Variables

Create a `.env.local` file in the project root:

```env
# RAG API Configuration
NEXT_PUBLIC_RAG_API_URL=https://devkada.resqlink.org
NEXT_PUBLIC_RAG_WS_URL=wss://devkada.resqlink.org
NEXT_PUBLIC_USE_RAG_PROXY=true

# Clerk authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Supabase database and storage
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

## Performance Benchmarks

Expected performance for typical queries:

| Stage | Duration | Description |
|-------|----------|-------------|
| Query Generation | 1-2s | AI generates search queries |
| Database Search | 20-30s | Semantic search + reranking |
| Summarization | 30-60s | AI generates summary |
| **Total** | **50-90s** | End-to-end pipeline |

## API Documentation

For complete API documentation, see:
- `API_INSTRUCTIONS_NEW.md` in the project root
- API server's `/docs` endpoint (if available)
- `README_RAG_SYSTEM.md` for full system documentation

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review API server logs
3. Verify all environment variables are set correctly
4. Ensure the RAG API server is running and accessible
