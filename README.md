# LexInsights

LexInsights is a Philippine legal research and compliance assistant for legal chat, document review, local providerless RAG research, citation discovery, and compliance-oriented reports.

- Live app: [lexiph.vercel.app](https://lexiph.vercel.app)
- Project profile: [About LexInsights](https://lexiph.vercel.app/about)
- Terms: [lexiph.vercel.app/terms](https://lexiph.vercel.app/terms)
- Privacy: [lexiph.vercel.app/privacy](https://lexiph.vercel.app/privacy)
- Maintainer portfolio: [marksiazon.dev](https://www.marksiazon.dev)
- Legacy showcase reference: [lexinsights.vercel.app](https://lexinsights.vercel.app)

LexInsights is not a lawyer, law firm, court, regulator, or official government source. Generated output should be checked against official sources, qualified counsel, or the relevant authority before use.

## Product Preview

Preview captures are kept as the README smoke-check pair.

![LexInsights desktop chat entry showing legal research prompt cards and the providerless assistant composer](docs/assets/lexinsights-chat-desktop.png)

![LexInsights mobile Help and Resources source directory](docs/assets/lexinsights-help-mobile.png)

## Visual Archive

![LexInsights archive cover showing legal chat, document review, source-first answers, and local RAG research](docs/assets/lexinsights-archive-cover.png)

Feature-by-feature screenshots, viewport coverage, light and dark theme captures, and showcase mockups are documented in [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md).

Repository visual assets:

- GitHub social preview: [docs/assets/lexinsights-github-social.png](docs/assets/lexinsights-github-social.png)
- Dark social preview variant: [docs/assets/lexinsights-github-social-dark.png](docs/assets/lexinsights-github-social-dark.png)
- Compliance report screenshot: [docs/assets/lexinsights-compliance-report.png](docs/assets/lexinsights-compliance-report.png)
- Light-mode desktop capture: [docs/assets/lexinsights-chat-desktop-light.png](docs/assets/lexinsights-chat-desktop-light.png)
- Light-mode compliance capture: [docs/assets/lexinsights-compliance-report-light.png](docs/assets/lexinsights-compliance-report-light.png)
- Light-mode mobile resources capture: [docs/assets/lexinsights-help-mobile-light.png](docs/assets/lexinsights-help-mobile-light.png)
- Providerless RAG flow diagram: [docs/assets/lexinsights-rag-flow.svg](docs/assets/lexinsights-rag-flow.svg)
- PWA screenshots: [public/screenshots/desktop-wide.png](public/screenshots/desktop-wide.png), [public/screenshots/mobile-chat.png](public/screenshots/mobile-chat.png)

## Project Trust

- Security policy: [SECURITY.md](SECURITY.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md)
- License posture: [LICENSE](LICENSE)
- Public source and legal directory: available inside Help & Resources in the app.

## What It Does

- Answers Philippine legal and compliance research questions through a chat-first interface.
- Reviews text, Markdown, PDF, Word, and legacy DOC content for compliance issues.
- Uses a bundled local corpus for providerless legal research when external AI/RAG providers are unavailable or disabled.
- Detects citations, source support, confidence signals, and practical compliance checklist items.
- Provides public source, terms, privacy, attribution, PWA, and answer-engine discovery surfaces.

## Reviewer Walkthrough

1. Open [lexiph.vercel.app](https://lexiph.vercel.app) and start from the chat prompt cards.
2. Ask a Philippine legal question that includes a statute or compliance scenario.
3. Switch into compliance mode and inspect the generated report, citations, research metadata, and export controls.
4. Open Help & Resources to review the primary-source directory used for verification.
5. Check `/about`, `/terms`, and `/privacy` for public context, legal notices, and data-handling posture.
6. Review the [screenshot catalog](docs/SCREENSHOTS.md) for captured desktop, tablet, mobile, light theme, dark theme, and small-phone states.

## What To Look For

- Philippine legal research flow: prompt cards, legal chat, and answer structure are tuned for local statutes and compliance questions.
- Compliance mode: the report view groups research metadata, status, confidence, sources, and generated analysis.
- Citation support: cited statutes are surfaced inline and backed by source metadata where available.
- Source metadata: retrieved documents, match reasons, confidence, local timing, and candidate counts are exposed for inspection.
- Providerless local RAG fallback: bundled local research still works when external providers are unavailable or disabled.
- Export and report workflow: compliance outputs include actions for history, editing, and downloadable formats.
- Mobile responsiveness: small-phone captures cover compact navigation, sticky areas, scrolled states, and theme behavior.
- Public trust pages: About, Terms, Privacy, Help & Resources, PWA fallback, crawler files, and attribution surfaces are included.

## Current Public Surfaces

- `/` and `/chat` open the usable assistant experience.
- `/about` connects the app, repository, maintainer portfolio, case study, and legacy showcase reference.
- `/terms` and `/privacy` provide public service and data-handling notices.
- `/robots.txt`, `/sitemap.xml`, `/llms.txt`, and `/ai.txt` support search, answer-engine, and crawler discovery.
- `/api/version` and `/api/readiness` support lean deployment and health verification without exposing secrets, raw targets, or repository ownership details.

## Quality And Release Checks

- CI runs lint, typecheck, production dependency audit, docs checks, release checks, PWA checks, screenshot validation, production bundle checks, build, and browser smoke tests.
- Local providerless RAG is covered by golden-query, answer-quality, source-freshness, performance, governance, and optional live-source audits.
- `/terms` and `/privacy` are public production notices for service use, data handling, retention, security, and Philippine privacy rights.
- Help & Resources keeps official source links close to the assistant so generated answers can be checked against primary authorities.
- Production deployments are verified against `/api/version` and `/api/readiness` so `lexiph.vercel.app` can be matched to the intended commit.

## Local Development

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

Copy `.env.example` to `.env.local` and fill provider values as needed. Providerless local research is the default mode.

## Verification

Use the same core gates as CI:

```powershell
npm run lint -- --max-warnings=0
npx tsc --noEmit
npm audit --omit=dev
npm run check:docs
npm run check:pwa
npm run check:release
npm run build
npm run smoke:browser
```

For the full local release gate:

```powershell
npm run check:local
```

For production:

```powershell
npm run check:deployment -- --base-url https://lexiph.vercel.app
npm run check:live -- --base-url https://lexiph.vercel.app
```

## Documentation

The documentation root is [docs/README.md](docs/README.md). Start there for setup, architecture, API behavior, UI rules, SEO/AEO/GEO notes, testing, deployment, and ship-readiness guidance.
