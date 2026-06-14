# Maintainers

LexInSight is maintained from the standalone repository at `Iron-Mark/lexinsights`.

## Source Of Truth

- App root: `lexiph`
- Default branch: `main`
- Package manager: `npm`
- Required local gates:
  - `npm run lint -- --max-warnings=0`
  - `npx tsc --noEmit`
  - `npm audit --omit=dev`
  - `npm run build`

## Maintenance Priorities

1. Keep dependencies patched and audit-clean.
2. Keep Supabase and RAG environment setup documented in `lexiph/.env.example`.
3. Preserve zero-warning lint as the baseline.
4. Replace mock compliance analysis with real backend-backed document analysis.
5. Keep README clone/deploy instructions aligned with the standalone repo.

## Release Checklist

- Confirm `main` is clean.
- Run all required local gates.
- Verify key routes: `/`, `/auth/login`, `/chat`, `/test-rag`.
- Commit with a clear Conventional Commit message.
- Push to `origin/main`.
