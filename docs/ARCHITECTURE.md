# Architecture

LexInSight is a single Next.js application in [lexiph](../lexiph). Runtime code is under [lexiph/src](../lexiph/src), while build scripts, tests, database scripts, and public assets stay at the app root.

## Source Layout

```text
lexiph/
├── database/              # Supabase SQL schema, storage, and seed scripts
├── public/                # Static assets served by Next.js
├── scripts/               # Local, CI, deployment, readiness, and docs checks
├── src/
│   ├── app/               # Next.js App Router pages and API routes
│   ├── components/        # Reusable React UI
│   ├── hooks/             # Shared client hooks
│   ├── lib/               # Auth, services, stores, Supabase client, utilities
│   ├── proxy.ts           # Clerk route protection proxy
│   └── types/             # Shared TypeScript domain types
└── tests/                 # Playwright and API test utilities
```

The TypeScript alias `@/*` resolves to `lexiph/src/*`. Keep application imports inside this boundary. Import project metadata or configuration outside `src` with explicit relative paths.

## App Routes

- `/` - entry page.
- `/auth/login`, `/auth/signup`, `/auth/callback`, `/auth/verify-email` - Clerk authentication flow.
- `/chat` - empty or active chat workspace.
- `/chat/[chatId]` - chat workspace with a selected chat.
- `/documents` - uploaded document management.
- `/test-rag` - manual RAG test surface.
- `/offline` - PWA offline page.

## Internal API Routes

- `/api/rag-proxy` - server-side proxy to the RAG backend. It prevents browser CORS failures and centralizes timeout and upstream error handling.
- `/api/readiness` - backend readiness checks for Supabase configuration, RAG health, and proxy health.
- `/api/version` - build and source metadata for deployment verification.

## Client State

Zustand stores under [lexiph/src/lib/store](../lexiph/src/lib/store) own client state:

- `auth-store` - authenticated user state.
- `chat-store` - chats, active chat, messages, and persistence to Supabase.
- `chat-mode-store` - general versus compliance mode.
- `file-upload-store` - uploaded file state.
- `rag-store` - RAG request state.
- `sidebar-store` - responsive sidebar state.
- `compliance-store` - compliance canvas and version history state.

Route-level duplication is intentionally kept low. Shared protected-route behavior lives in [use-protected-route.ts](../lexiph/src/hooks/use-protected-route.ts), responsive sidebar behavior lives in [use-responsive-sidebar.ts](../lexiph/src/hooks/use-responsive-sidebar.ts), and chat routes render through [chat-page-shell.tsx](../lexiph/src/components/chat/chat-page-shell.tsx).

## Backend Boundaries

The browser talks to Supabase through [client.ts](../lexiph/src/lib/supabase/client.ts) and to RAG through service wrappers in [lexiph/src/lib/services](../lexiph/src/lib/services). By default, browser RAG calls go through `/api/rag-proxy`; direct browser calls should only be used when the upstream backend is configured for CORS.

## Engineering Principles

- Keep route files thin; put reusable workflow logic in hooks or components.
- Keep shared service contracts in `src/lib/services` and shared domain shapes in `src/types`.
- Prefer one maintained guide over multiple implementation summaries.
- Do not add Markdown outside `docs/`.
- Keep SQL scripts in `lexiph/database/`, not mixed into source folders.
