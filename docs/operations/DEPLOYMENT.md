# Deployment

LexInsights is deployed from the [repository root](../..).

## Vercel Settings

- Framework: Next.js
- Root directory: repository root
- Install command: `npm ci`
- Build command: `npm run build`
- Output: default Next.js output

## Required Environment

Configure these in Vercel:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/signup
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/chat
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/chat
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENABLE_DIAGNOSTIC_ROUTES=false
```

`ENABLE_DIAGNOSTIC_ROUTES` controls `/test-rag` and `/test-document`. Keep it `false` or unset for public production deployments.

`DIAGNOSTIC_DETAIL_TOKEN` is optional. Set it only when maintainers need token-gated detailed `/api/version` and `/api/readiness` output. The public response stays lean so live deployment checks can pass without exposing branch names, repository ownership, upstream health targets, or raw diagnostic payloads.

## Optional Remote RAG Environment

Configure these when a remote provider is available and should be used before local fallback. The app serves providerless local research without them.

```text
NEXT_PUBLIC_RAG_PROVIDER_MODE=remote-rag
NEXT_PUBLIC_RAG_API_URL
NEXT_PUBLIC_RAG_WS_URL
NEXT_PUBLIC_USE_RAG_PROXY=true
```

Leave `NEXT_PUBLIC_RAG_PROVIDER_MODE` unset or set to `local-providerless` for the production default. In that mode, `/api/readiness` and `npm run check:live` skip remote RAG health as noncritical providerless checks.

## Pre-Deployment

```powershell
cd "C:\Users\ultim\_ Local Codes\Hackathon-LexInsights"
npm ci
npm run check:local
```

If backend credentials are not available locally, at minimum run:

```powershell
npm run lint -- --max-warnings=0
npx tsc --noEmit
npm run check:docs:self-test
npm run check:docs
npm run check:release
npm run build
```

## Post-Deployment

```powershell
npm run check:deployment -- --base-url https://lexiph.vercel.app
npm run check:live -- --base-url https://lexiph.vercel.app
```

When Vercel project ownership or aliases are unclear:

```powershell
npm run check:deployment -- --base-url https://lexiph.vercel.app --with-vercel-cli --discover-vercel-scopes
npm run check:deployment -- --base-url https://lexiph.vercel.app --with-vercel-cli --discover-vercel-scopes --vercel-scope marksiazon-dev
```

## Production Smoke URLs

- `https://lexiph.vercel.app/api/version`
- `https://lexiph.vercel.app/api/readiness`

These endpoints are intentionally public but minimal. They report app version, deployment commit match, readiness state, provider mode, and check status summaries. Detailed diagnostics are restricted to local `?details=1` checks or requests carrying the private diagnostics token.

`NEXT_PUBLIC_SITE_URL` controls canonical metadata, sitemap URLs, and structured data. Keep it pointed at the current LexInsights production app. The older `https://lexinsights.vercel.app` URL is kept only as a legacy showcase reference, not as the canonical production URL.

Maintainer diagnostics are available only when `ENABLE_DIAGNOSTIC_ROUTES=true` for that deployment:

- `https://lexiph.vercel.app/test-rag`
- `https://lexiph.vercel.app/test-document`

If `/api/version` returns 404, the deployment is likely not serving the current repository app root.
