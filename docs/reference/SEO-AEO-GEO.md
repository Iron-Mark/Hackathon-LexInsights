# SEO, AEO, and GEO

LexInsights keeps public discovery focused on the product entry points and legal trust pages, while keeping private workspaces, auth plumbing, APIs, and diagnostics out of indexing.

## Canonical Public URLs

- Home: `https://lexiph.vercel.app/`
- About / project profile: `https://lexiph.vercel.app/about`
- Chat entry: `https://lexiph.vercel.app/chat`
- Terms: `https://lexiph.vercel.app/terms`
- Privacy: `https://lexiph.vercel.app/privacy`
- Sitemap: `https://lexiph.vercel.app/sitemap.xml`
- Robots: `https://lexiph.vercel.app/robots.txt`
- Answer-engine brief: `https://lexiph.vercel.app/llms.txt`

The legacy showcase remains available at `https://lexinsights.vercel.app` only as an old public reference. New metadata should prefer `NEXT_PUBLIC_SITE_URL`, which defaults to `https://lexiph.vercel.app`.

## Search Engine Optimization

- `src/app/layout.tsx` defines global metadata, Open Graph, Twitter card metadata, app icons, geo tags, and base Organization/WebSite/SoftwareApplication structured data.
- `src/app/sitemap.ts` includes only public, indexable pages.
- `src/app/robots.ts` allows public routes and blocks APIs, auth routes, private chat URLs, document workspace routes, and diagnostic pages.
- Route pages define focused titles, descriptions, canonicals, and noindex metadata where needed.
- Legal pages include page-level WebPage structured data for trust and clarity.
- `/about` provides a crawlable project profile that connects the current app, public repository, Mark Siazon portfolio, case study, and legacy showcase.

## Answer Engine Optimization

- `/llms.txt` gives retrieval systems a concise source of truth for what LexInsights is, what it can do, what it is not, public URLs, official source orientation, portfolio attribution, and a suggested summary.
- `/ai.txt` serves the same guidance as `/llms.txt` for tools that look for a short AI-facing text endpoint.
- The app avoids claiming official legal authority. Public summaries consistently say generated legal analysis should be verified against official sources, counsel, or the relevant authority.

## Generative Engine Optimization

- Canonical facts live in `src/lib/seo.ts` so product name, current domain, old showcase URL, repository URL, portfolio URL, and source descriptions stay synchronized.
- Public structured data uses stable product and organization facts instead of route-wide FAQ markup.
- The About page emits AboutPage, Person, SoftwareSourceCode, and BreadcrumbList structured data to support portfolio and repository attribution without turning the chat homepage into a landing page.
- Private or user-specific pages are noindexed and excluded from the sitemap to reduce weak or misleading retrieval surfaces.
- The Terms and Privacy pages provide public trust context for data handling, acceptable use, provider processing, retention, and Philippine privacy rights.

## Verification

Before release, check:

- `/robots.txt` returns the expected allow/disallow policy.
- `/sitemap.xml` lists only canonical public URLs.
- `/llms.txt` returns plain text with current product facts.
- `/about` returns a public project profile with current app, portfolio, case study, legacy showcase, and repository links.
- `/terms` and `/privacy` return public legal pages with correct metadata.
- `/chat/[id]`, `/documents`, `/auth/login`, `/auth/signup`, diagnostics, and API routes are not listed in the sitemap.
