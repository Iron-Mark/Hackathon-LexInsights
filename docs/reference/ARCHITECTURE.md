# Architecture

LexInSight is a single Next.js application at the [repository root](../..). Runtime code is under [src](../../src), while build scripts, tests, database scripts, and public assets stay at the app root.

## Source Layout

```text
Hackathon-LexInsights/
|-- database/              # Supabase SQL schema, storage, and seed scripts
|-- public/                # Static assets served by Next.js
|-- scripts/               # Local, CI, deployment, readiness, and docs checks
|-- src/
|   |-- app/               # Next.js App Router pages and API routes
|   |-- components/        # Reusable React UI
|   |-- hooks/             # Shared client hooks
|   |-- lib/               # Auth, services, stores, Supabase client, utilities
|   |-- proxy.ts           # Clerk route protection proxy
|   `-- types/             # Shared TypeScript domain types
`-- tests/                 # Playwright and API test utilities
```

The TypeScript alias `@/*` resolves to `src/*`. Keep application imports inside this boundary. Import project metadata or configuration outside `src` with explicit relative paths.

## App Routes

- `/` - entry page.
- `/auth/login`, `/auth/signup`, `/auth/callback`, `/auth/verify-email` - Clerk authentication flow.
- `/chat` - empty or active chat workspace.
- `/chat/[chatId]` - chat workspace with a selected chat.
- `/documents` - uploaded document management.
- `/test-rag` - maintainer-only legal research diagnostic surface, available only when `ENABLE_DIAGNOSTIC_ROUTES=true`.
- `/test-document` - maintainer-only compliance document ingestion diagnostic surface, available only when `ENABLE_DIAGNOSTIC_ROUTES=true`.
- `/offline` - PWA offline page.

## Internal API Routes

- `/api/rag-proxy` - server-side proxy to the RAG backend. It prevents browser CORS failures and centralizes timeout and upstream error handling.
- `/api/document-text` - server-side PDF and Word text extraction for compliance document uploads.
- `/api/readiness` - backend readiness checks for Supabase configuration, RAG health, and proxy health.
- `/api/version` - build and source metadata for deployment verification.

## Client State

Zustand stores under [src/lib/store](../../src/lib/store) own client state:

- `auth-store` - authenticated user state.
- `chat-store` - chats, active chat, messages, and persistence to Supabase.
- `chat-mode-store` - general versus compliance mode.
- `file-upload-store` - uploaded file state.
- `rag-store` - RAG request state, response caching, and local fallback notifications.
- `sidebar-store` - responsive sidebar state.
- `compliance-store` - compliance canvas and version history state.

Route-level duplication is intentionally kept low. Shared protected-route behavior lives in [use-protected-route.ts](../../src/hooks/use-protected-route.ts), responsive sidebar behavior lives in [use-responsive-sidebar.ts](../../src/hooks/use-responsive-sidebar.ts), and chat routes render through [chat-page-shell.tsx](../../src/components/chat/chat-page-shell.tsx).

## Backend Boundaries

The browser talks to Supabase through [client.ts](../../src/lib/supabase/client.ts) and to legal research services through wrappers in [src/lib/services](../../src/lib/services).

By default, browser RAG calls go through `/api/rag-proxy`; direct browser calls should only be used when the upstream backend is configured for CORS.

Remote RAG is optional at runtime and opt-in through `NEXT_PUBLIC_RAG_PROVIDER_MODE=remote-rag`. [rag-api.ts](../../src/lib/services/rag-api.ts) uses [local-legal-research.ts](../../src/lib/services/local-legal-research.ts) by default, with corpus and framework data under [local-research-data](../../src/lib/services/local-research-data). Remote mode falls back locally when the provider is unavailable. Local mode provides deterministic research, Deep Search cross-reference expansion, ranking diagnostics, and draft checks without AI providers.

Compliance document ingestion is split between [document-text.ts](../../src/lib/utils/document-text.ts) for browser-readable text and [server-document-extraction.ts](../../src/lib/utils/server-document-extraction.ts) for PDF and Word extraction behind `/api/document-text`.

## Engineering Principles

- Keep route files thin; put reusable workflow logic in hooks or components.
- Keep shared service contracts in `src/lib/services` and shared domain shapes in `src/types`.
- Prefer one maintained guide over multiple implementation summaries.
- Do not add Markdown outside `docs/`.
- Keep SQL scripts in `database/`, not mixed into source folders.
