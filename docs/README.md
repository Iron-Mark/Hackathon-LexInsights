# LexInsights Documentation

LexInsights is a Next.js app for Philippine legal compliance chat, Markdown/text/PDF/Word document review, RAG research, providerless local research, and draft checking. The repository root is the app root, with source code organized under [src](../src).

For the public GitHub project overview, use the repository root [README](../README.md). This documentation directory remains the source of truth for deeper setup, reference, operations, and historical planning material.

## Documentation Map

### Start Here

- [Setup](./guides/SETUP.md) - local installation and environment configuration.
- [Contributing](./guides/CONTRIBUTING.md) - engineering and documentation rules.

### Product

- [Product Requirements (PRD)](./PRD.md) - product vision, personas, competitive landscape, positioning, and the prioritized P0/P1/P2 requirement backlog. Carries dated per-requirement status updates and is the source of truth for current feature status.
- [Competitive Brief](./COMPETITIVE-BRIEF.md) - market analysis, competitor profiles, messaging comparison, positioning gaps, opportunities, and threats.
- [Competitive Battlecard](./COMPETITIVE-BATTLECARD.md) - one-page sales reference: per-rival pitch, weaknesses, our differentiators, objection handling, and landmines.

### Reference

- [Architecture](./reference/ARCHITECTURE.md) - source layout, runtime boundaries, and data flow.
- [API](./reference/API.md) - internal routes, RAG proxy behavior, providerless fallback, and upstream contracts.
- [Providerless Research](./reference/PROVIDERLESS-RESEARCH.md) - local fallback algorithm, corpus, draft checks, and limits.
- [Philippine Compliance Mapping](./reference/PH-COMPLIANCE-MAPPING.md) - product controls mapped to privacy, ICT, accessibility, and research-integrity expectations.
- [Database](./reference/DATABASE.md) - Supabase schema, numbered migrations (report persistence tables with Clerk-sub RLS), storage, and seed scripts.
- [UI](./reference/UI.md) - design system, accessibility, and responsive conventions.
- [SEO, AEO, and GEO](./reference/SEO-AEO-GEO.md) - public discovery, answer-engine files, structured data, and crawl policy.
- [SEO / GEO / AEO Audit](./SEO-GEO-AEO-AUDIT.md) - dated audit of technical SEO, generative-engine, and answer-engine readiness, with a remediation log.

### Operations

- [Handoff](./operations/HANDOFF.md) - start here if you are new to the project: live service state, what is still unverified, and the traps that cost real debugging time.
- [Testing](./operations/TESTING.md) - local and CI quality gates, including the Vitest unit-test layer (`npm run test`).
- [Manual QA Checklist](./operations/MANUAL-QA-CHECKLIST.md) - authenticated click-through for the UI surfaces added in the 2026-07-08 build cycle.
- [Deployment](./operations/DEPLOYMENT.md) - Vercel deployment and production checks.
- [RAG QA](./operations/RAG-QA.md) - source freshness, answer-quality, and citation trust gates.
- [Incident Response](./operations/INCIDENT-RESPONSE.md) - security, privacy, availability, and data-handling incident workflow.
- [Production Release 569983a](./operations/RELEASE-2026-07-01-569983a.md) - verified 0.5.2 production release note.
- [Ship Readiness](./operations/SHIP-READINESS.md) - current release-candidate checklist and hold criteria.
- [App Root Migration](./operations/APP-ROOT-MIGRATION.md) - migration record and root-layout notes.
- [Troubleshooting](./operations/TROUBLESHOOTING.md) - common setup, backend, and deployment failures.
- [Maintainers](./operations/MAINTAINERS.md) - release checklist and ownership notes.

### Supporting Material

- [Screenshot Catalog](./SCREENSHOTS.md) - feature, viewport, and theme captures plus showcase mockups and repository visual assets.
- [Image Prompts](./assets/IMAGE-PROMPTS.md) - provenance and usage notes for the cover and social preview assets.
- [Specs](./specs) - historical records of designs that have since shipped, kept as-is for context. Use the guides, reference, and operations docs above as the current shipping source of truth.
- [Sample barangay disaster plan](./samples/sample-barangay-disaster-plan.md) - sample Markdown input for DRRM and imminent-disaster compliance review.

## Current Repository Shape

See [Architecture](./reference/ARCHITECTURE.md) for the current source layout, runtime boundaries, and data flow. Database schema and numbered migrations live in [database/](../database), and CI plus the Supabase keep-alive workflow live in [.github/workflows/](../.github/workflows).

## Documentation Rules

All detailed Markdown belongs under this root `docs/` directory, except the repository root `README.md` used by GitHub. Keep setup and contribution docs in `docs/guides/`, runtime and implementation reference in `docs/reference/`, release and support docs in `docs/operations/`, sample upload documents in `docs/samples/`, and historical planning artifacts in `docs/specs/`. Avoid adding README files inside source, test, public asset, or library folders. When a guide becomes obsolete, update one of the curated docs instead of adding another summary file.
