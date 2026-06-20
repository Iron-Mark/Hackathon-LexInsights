# Deployment

LexInSight is deployed as the [lexiph](../lexiph) app.

## Vercel Settings

- Framework: Next.js
- Root directory: `lexiph`
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
```

## Optional Remote RAG Environment

Configure these when a remote provider is available. The app still serves providerless local research without them.

```text
NEXT_PUBLIC_RAG_API_URL
NEXT_PUBLIC_RAG_WS_URL
NEXT_PUBLIC_USE_RAG_PROXY=true
```

## Pre-Deployment

```powershell
cd "C:\Users\ultim\_ Local Codes\Hackathon-LexInsights\lexiph"
npm ci
npm run check:local
```

If backend credentials are not available locally, at minimum run:

```powershell
npm run lint -- --max-warnings=0
npx tsc --noEmit
npm run check:docs:self-test
npm run check:docs
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
- `https://lexiph.vercel.app/api/rag-proxy?endpoint=/api/research/health`

If `/api/version` returns 404, the deployment is likely not serving the current `lexiph` app root.
