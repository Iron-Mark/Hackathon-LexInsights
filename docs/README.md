# LexInsights Documentation

LexInsights is a Next.js app for Philippine legal compliance chat, Markdown/text/PDF/Word document review, RAG research, providerless local research, and draft checking. The repository root is the app root, with source code organized under [src](../src).

## Documentation Map

### Start Here

- [Setup](./guides/SETUP.md) - local installation and environment configuration.
- [Contributing](./guides/CONTRIBUTING.md) - engineering and documentation rules.

### Reference

- [Architecture](./reference/ARCHITECTURE.md) - source layout, runtime boundaries, and data flow.
- [API](./reference/API.md) - internal routes, RAG proxy behavior, providerless fallback, and upstream contracts.
- [Providerless Research](./reference/PROVIDERLESS-RESEARCH.md) - local fallback algorithm, corpus, draft checks, and limits.
- [Database](./reference/DATABASE.md) - Supabase schema, storage, and seed scripts.
- [UI](./reference/UI.md) - design system, accessibility, and responsive conventions.
- [SEO, AEO, and GEO](./reference/SEO-AEO-GEO.md) - public discovery, answer-engine files, structured data, and crawl policy.

### Operations

- [Testing](./operations/TESTING.md) - local and CI quality gates.
- [Deployment](./operations/DEPLOYMENT.md) - Vercel deployment and production checks.
- [Ship Readiness](./operations/SHIP-READINESS.md) - current release-candidate checklist and hold criteria.
- [App Root Migration](./operations/APP-ROOT-MIGRATION.md) - migration record and root-layout notes.
- [Troubleshooting](./operations/TROUBLESHOOTING.md) - common setup, backend, and deployment failures.
- [Maintainers](./operations/MAINTAINERS.md) - release checklist and ownership notes.

### Supporting Material

- [Specs](./specs) - historical product and implementation planning material. Use the guides, reference, and operations docs above as the current shipping source of truth.
- [Sample barangay disaster plan](./samples/sample-barangay-disaster-plan.md) - sample Markdown input for DRRM and imminent-disaster compliance review.

## Current Repository Shape

```text
Hackathon-LexInsights/
|-- database/
|-- docs/
|   |-- README.md
|   |-- guides/
|   |-- operations/
|   |-- reference/
|   |-- samples/
|   `-- specs/
|-- public/
|-- scripts/
|-- src/
|   |-- app/
|   |-- components/
|   |-- hooks/
|   |-- lib/
|   |-- proxy.ts
|   `-- types/
|-- tests/
`-- package.json
```

## Documentation Rules

All Markdown belongs under this root `docs/` directory. Keep setup and contribution docs in `docs/guides/`, runtime and implementation reference in `docs/reference/`, release and support docs in `docs/operations/`, sample upload documents in `docs/samples/`, and historical planning artifacts in `docs/specs/`. Avoid adding README files inside source, test, or library folders. When a guide becomes obsolete, update one of the curated docs instead of adding another summary file.
