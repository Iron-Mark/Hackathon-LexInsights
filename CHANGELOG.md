# Changelog

## [Unreleased]

Merged to `main` between 2026-07-02 and 2026-07-29, plus the 2026-07-30 batch below.

### Added (2026-07-30)

- Corpus growth batch (P1-2): 34 curated statutes (labor, AML/financial-crime, consumer finance, SME, LGU/public-health, tax, transport) bring the local corpus to 305 authorities with 188 curated relations; new entries carry seeded provenance pending live URL verification.
- Free-tier daily quota metering (P2-1): compliance analyses capped at 20/day per browser, with a live usage meter in the plan panel; only successful analyses count.
- Retention decision implemented (PRD §11): cloud reports are kept until the user deletes them; new "Delete cloud report data" control in the profile dialog removes all server rows while keeping browser-local copies.
- Composite-evidence score floor for compliance-framework pack members in deep search, so corpus growth cannot silently push pack members out of workflow results.

### Fixed (2026-07-30)

- Scanned/image-only PDFs now get a specific error explaining OCR is unsupported (dedicated `document_no_readable_text` API error type), instead of a generic extraction failure; extraction error bodies also surface their human-readable message correctly in the UI.
- README preview screenshots recaptured against the current UI (dark chat desktop, mobile Help & Resources with the live corpus-coverage panel).

### Added

- Server-side compliance report persistence for signed-in users (P0-1): reports, versions, and findings mirror to Supabase (`database/migrations/0001_compliance_report_persistence.sql`) behind Clerk-sub row-level security and survive clearing browser storage; guests stay local-only.
- Supabase third-party auth with Clerk, live in production.
- IndexedDB persistence for compliance reports as the local source of truth.
- Vitest unit-test layer (`npm run test` / `npm run test:watch`) wired into CI and `check:local`.
- PDF export for compliance reports via jsPDF (P1-1).
- A.M. No. 25-11-28-SC AI-use disclosure appended to all compliance report exports (P0-3).
- Explicit "no supporting authority in the local corpus" notice on any answer that resolves to no corpus authority (P0-2 citation-traceability guarantee).
- Corpus coverage metadata panel (P1-2) and matter workspace with rename, tags, and document association (P1-3).
- Plan/limits surface, framework checklist templates, and report progress indicators (P2 tier).
- Explicit matched framework ids from local research, threaded through the chat store and template detection (P2-2 follow-up).
- Supabase keep-alive workflow (`.github/workflows/supabase-keepalive.yml`).
- About-page media section with the CodeKada YouTube demo, VideoObject and ImageGallery structured data, and an event gallery in the attribution dialog.
- Vercel Web Analytics.
- PRD, competitive brief, competitive battlecard, SEO/GEO/AEO audit, manual QA checklist, and AGENTS.md docs.

### Fixed

- CSP now allows `worker-src 'self' blob:` for Clerk workers; profile dialog scrolls correctly.
- Production `npm audit --omit=dev` cleared (remaining advisories are devDependency-only) and stricter react-hooks lint satisfied.
- Mobile UX: compliance header compacts on scroll, sidebar offset and blank-space fixes, composer sizing, citation chip stability during reveal, auth buttons collapse at narrow widths.
- Browser e2e specs realigned with the current UI.

### Changed

- README screenshot catalog polished; social preview and archive visual assets refreshed.
- Chat composer controls restacked; trust and disclaimer surfaces polished.

## 0.5.2 - 2026-07-01

- Polished LexInsights public discovery, Help & Resources, legal pages, mobile behavior, and theme adaptability.
- Aligned production naming to `LexInsights` across app metadata, PWA checks, CI output, and deployment diagnostics.
- Added public Terms, Privacy, About, `llms.txt`, `ai.txt`, robots, sitemap, and source-directory surfaces.
- Hardened CI/CD with deployment, live, PWA, local RAG, document extraction, release, and browser smoke checks.
- Kept providerless local research as the default production mode while preserving optional remote RAG configuration.

## 0.1.0 - 2026-06

- Initial hackathon-era LexInsights release baseline.
