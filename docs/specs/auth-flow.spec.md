# Authentication Flow Specification

Last verified: 2026-07-30.

## Overview

LexInsights uses Clerk for authentication and Supabase Third-Party Auth (Clerk) for database and storage authorization. Both are live in production. The product is guest-first: the chat interface works without an account, and signing in adds server-side persistence.

## User Stories

- As a guest, I can use the chat interface without signing in; my chats persist in this browser only.
- As a user, I can sign up and sign in through Clerk, from the in-chat dialog or the dedicated pages.
- As a user, I can sign out from the profile menu in the app header.
- As a signed-in user, my compliance reports are mirrored to Supabase and survive clearing browser storage.
- As a maintainer, I see a clear guest-mode notice when Clerk keys are missing, and the app keeps working.

## Authentication States

1. **Guest (unauthenticated)**: The chat shell renders normally. Sign-in/sign-up entrypoints are shown. Guest chats persist to `localStorage` (`GUEST_STORAGE_KEY` in `src/lib/store/chat-store.ts`); compliance-report server persistence is a silent no-op (`src/lib/services/compliance-persistence/factory.ts`).
2. **Authenticated**: Clerk user/session state is mirrored into the local auth store. Compliance reports dual-write: IndexedDB stays the local source of truth and Supabase receives a mirror (`src/lib/store/compliance-server-sync.ts`); a server failure never blocks the local save.
3. **Loading**: Show loading state while Clerk session state is resolving.
4. **Unconfigured**: When Clerk keys are missing, show `Account sign-in is unavailable` (`CLERK_SETUP_TITLE` in `src/lib/auth/clerk-config.ts`) and keep running in guest mode — `src/app/layout.tsx` renders the app without `ClerkProvider`.

## Entry Points and Routes

- In-chat `AuthDialog` (`src/components/auth/auth-dialog.tsx`, opened from the chat header) - the primary sign-in/sign-up path from the chat surface.
- `/auth/login` - Clerk sign-in page.
- `/auth/signup` - Clerk sign-up page.
- `/auth/callback` - Legacy route that redirects to `/chat`.
- `/auth/verify-email` - Legacy route that redirects to `/auth/signup`.
- `/` and `/chat` - The chat shell (`src/app/page.tsx` renders `ChatPageShell`). Public; usable as guest.
- `/documents` - Protected route (the only middleware-protected route).

On app-shell routes (`/`, `/chat`, `/documents`) the header shows the custom `UserMenu` wired to the auth store's `signOut` (`src/components/layout/user-menu.tsx`). On non-app-shell routes, Clerk's `UserButton` and sign-in/sign-up buttons render via `ClerkAuthHeader` (`src/components/auth/clerk-auth-header.tsx`). The legacy `login-form.tsx` and `signup-form.tsx` components are dead code (no imports).

## Session Management

- `ClerkProvider` is mounted inside `<body>` when Clerk keys are configured.
- `src/proxy.ts` uses `clerkMiddleware()` and protects only `/documents(.*)`. It also handles the `/__clerk(.*)` proxy routes, skips the Clerk middleware for requests without a Clerk session cookie (fast path), and falls back gracefully if the Clerk middleware throws: protected routes redirect to `/auth/login`, everything else passes through.
- `SessionProvider` mirrors Clerk user/session state into `useAuthStore` for existing client components.
- Supabase requests use the active Clerk session token through the Supabase client `accessToken` callback (`src/lib/supabase/client.ts`).
- Sign-out delegates to Clerk and clears private client state.

## Supabase Authorization

Clerk is configured as a Supabase Third-Party Auth provider in production. RLS policies compare `(SELECT auth.jwt()->>'sub')` (the Clerk user id, TEXT `user_...`) to app-owned user columns across all tables in `database/schema.sql` and the P0-1 report-persistence tables (`report_versions`, `report_findings`) added by `database/migrations/0001_compliance_report_persistence.sql`. `database/storage.sql` defines four `storage.objects` policies on the private `documents` bucket keyed to the Clerk user id as the top-level folder. See [supabase-schema.spec.md](supabase-schema.spec.md) and [docs/reference/DATABASE.md](../reference/DATABASE.md).

## Security Headers

The CSP in `next.config.ts` includes `worker-src 'self' blob:` because Clerk spawns blob workers; omitting it broke sign-in in production before the July 2026 fix.

## Error Handling

- Missing Clerk keys: show `Account sign-in is unavailable` notice; the app continues in guest mode.
- Signed-out access to `/documents`: redirect to `/auth/login` with a `redirect_url` back to the requested page.
- Compliance-report server sync failure: local save succeeds; a one-time toast informs the user.
- Missing Supabase env: show the existing Supabase client configuration error.
