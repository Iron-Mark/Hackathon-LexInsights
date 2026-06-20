# LexInSight Documentation

LexInSight is a Next.js app for Philippine legal compliance chat, document review, RAG research, and draft checking. The app code lives in [lexiph](../lexiph), with source code organized under [lexiph/src](../lexiph/src).

## Documentation Map

- [Architecture](./ARCHITECTURE.md) - source layout, runtime boundaries, and data flow.
- [Setup](./SETUP.md) - local installation and environment configuration.
- [API](./API.md) - internal routes, RAG proxy behavior, and upstream API contracts used by the app.
- [Database](./DATABASE.md) - Supabase schema, storage, and seed scripts.
- [Testing](./TESTING.md) - local and CI quality gates.
- [Deployment](./DEPLOYMENT.md) - Vercel deployment and production checks.
- [UI](./UI.md) - design system, accessibility, and responsive conventions.
- [Contributing](./CONTRIBUTING.md) - engineering and documentation rules.
- [Troubleshooting](./TROUBLESHOOTING.md) - common setup, backend, and deployment failures.
- [Maintainers](./MAINTAINERS.md) - release checklist and ownership notes.
- [Specs](./specs) - product and implementation specifications retained from the earlier planning work.
- [Sample barangay disaster plan](./sample-barangay-disaster-plan.md) - sample Markdown input for compliance review.

## Current Repository Shape

```text
Hackathon-LexInsights/
├── docs/
│   ├── *.md
│   └── specs/
└── lexiph/
    ├── database/
    ├── public/
    ├── scripts/
    ├── src/
    │   ├── app/
    │   ├── components/
    │   ├── hooks/
    │   ├── lib/
    │   ├── proxy.ts
    │   └── types/
    ├── tests/
    └── package.json
```

## Documentation Rules

All Markdown belongs under this root `docs/` directory. Keep specs under `docs/specs/` and avoid adding README files inside source, test, or library folders. When a guide becomes obsolete, update one of the curated docs instead of adding another summary file.
