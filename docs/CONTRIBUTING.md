# Contributing

## Local Workflow

```powershell
cd "C:\Users\ultim\_ Local Codes\Hackathon-LexInsights\lexiph"
npm ci
npm run lint -- --max-warnings=0
npx tsc --noEmit
npm run check:docs
npm run build
```

## Source Organization

- Put app source under `lexiph/src`.
- Put reusable client hooks under `lexiph/src/hooks`.
- Put shared services under `lexiph/src/lib/services`.
- Put shared domain types under `lexiph/src/types`.
- Put SQL under `lexiph/database`.
- Put all Markdown under root `docs`.

## Code Style

- Prefer existing components and store patterns over new abstractions.
- Extract shared logic when two routes or components reimplement the same workflow.
- Keep route files focused on routing and composition.
- Keep service wrappers responsible for network behavior and response translation.
- Keep stores responsible for client state, not UI rendering.

## Documentation Style

- Update one existing curated guide instead of adding a one-off summary file.
- Keep specs in `docs/specs`.
- Do not add `README.md` files inside source, tests, public assets, or library directories.
- Run `npm run check:docs` after moving or linking Markdown.

## Pull Request Checklist

- Lint passes.
- Typecheck passes.
- Docs link check passes.
- Build passes.
- Browser smoke passes when the change affects navigation, auth, chat, uploads, or layout.
- Database docs are updated when SQL changes.
