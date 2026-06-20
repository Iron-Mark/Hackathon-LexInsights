# Authentication Flow Specification

## Overview

LexInSight uses Clerk for authentication and Supabase Third-Party Auth for database and storage authorization.

## User Stories

- As a user, I can sign up through Clerk.
- As a user, I can sign in through Clerk.
- As a user, I can sign out from the Clerk profile menu.
- As a user, I see the Clerk profile icon when signed in.
- As a maintainer, I see a clear setup blocker when Clerk keys are missing.

## Authentication States

1. **Unauthenticated**: Show Clerk sign-in/sign-up entrypoints.
2. **Authenticated**: Sync Clerk user state into the local auth store and redirect protected work to `/chat`.
3. **Loading**: Show loading state while Clerk session state is resolving.
4. **Unconfigured**: Show `Clerk setup required` until Clerk keys are present.

## Routes

- `/auth/login` - Clerk sign-in page.
- `/auth/signup` - Clerk sign-up page.
- `/auth/callback` - Legacy route that redirects to `/chat`.
- `/auth/verify-email` - Legacy route that redirects to `/auth/signup`.
- `/chat` - Protected route.
- `/documents` - Protected route.
- `/` - Landing page.

## Session Management

- `ClerkProvider` is mounted inside `<body>` when Clerk keys are configured.
- `proxy.ts` uses `clerkMiddleware()` and protects `/chat(.*)` and `/documents(.*)`.
- `SessionProvider` mirrors Clerk user/session state into `useAuthStore` for existing client components.
- Supabase requests use the active Clerk session token through the Supabase client `accessToken` callback.
- Sign-out clears private client state and delegates to Clerk.

## Error Handling

- Missing Clerk keys: show `Clerk setup required`.
- Signed-out protected route access: redirect to `/auth/login`.
- Missing Supabase env: show the existing Supabase client configuration error.
