# Contributing

## Local Workflow

From the repository root:

```bash
npm ci
npm run lint -- --max-warnings=0
npx tsc --noEmit
npm run test
npm run check:docs
npm run build
```

`npm run check:local` runs the full pre-PR gate in one command. CI ([.github/workflows/ci.yml](../../.github/workflows/ci.yml)) enforces the same gate — lint and unit tests through `npm audit --omit=dev`, the self-test battery, build, and browser smoke — on every push to `main` and every pull request targeting `main`.

## Source Organization

- Put app source under `src`.
- Put reusable client hooks under `src/hooks`.
- Put shared services under `src/lib/services`.
- Put shared domain types under `src/types`.
- Put SQL under `database`. `database/schema.sql` is the baseline; put schema changes in numbered files under `database/migrations`.
- Put all Markdown under root `docs`.
- Put setup and contribution docs under `docs/guides`.
- Put runtime and implementation reference under `docs/reference`.
- Put release, testing, deployment, and support docs under `docs/operations`.
- Put sample upload documents under `docs/samples`.

## Unit Tests

- Run with `npm run test` (single pass) or `npm run test:watch` (vitest, configured in [vitest.config.mts](../../vitest.config.mts)).
- Co-locate tests with their module as `src/**/*.test.ts`; standalone suites can live under `tests/unit`. Playwright specs stay in `tests/e2e`.
- Tests run in the `node` environment by default; a DOM-dependent file can opt into jsdom with a `// @vitest-environment jsdom` pragma.
- New service and persistence logic is expected to ship with unit coverage.

## Code Style

- Prefer existing components and store patterns over new abstractions.
- Extract shared logic when two routes or components reimplement the same workflow.
- Keep route files focused on routing and composition.
- Keep service wrappers responsible for network behavior and response translation.
- Keep stores responsible for client state, not UI rendering.

## Documentation Style

- Update one existing curated guide instead of adding a one-off summary file.
- Keep historical planning specs in `docs/specs`.
- Do not add `README.md` files inside source, tests, public assets, or library directories. The repository root `README.md` is the only public GitHub overview exception.
- Run `npm run check:docs` after moving or linking Markdown.

## Pull Request Checklist

- Lint passes.
- Typecheck passes.
- Unit tests pass (`npm run test`).
- `npm audit --omit=dev` reports no production advisories.
- Docs link check passes.
- Build passes.
- Browser smoke passes when the change affects navigation, auth, chat, uploads, or layout.
- Database docs are updated when SQL changes.
