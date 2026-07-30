# LexInsights Image Notes

Assets refreshed on July 2, 2026. The source screenshots inside the composites predate the 2026-07-09 SEO/H1 changes and the 2026-07-12 empty-state/mobile polish, so a cover refresh is due before the next external showcase.

The current GitHub and archive cover images are deterministic composites built from real project assets. They are not AI mockups and should stay visually aligned with the shipped app.

## Current Cover Assets

### GitHub Social Preview

Path: `docs/assets/lexinsights-github-social.png`

Recommended use:
- GitHub repository social preview.
- Portfolio or release embeds where a compact, branded preview is needed.

Source inputs:
- `public/logo/LOGO-0.5-NOBG.png`
- `docs/assets/lexinsights-compliance-report.png`

### Archive Cover

Path: `docs/assets/lexinsights-archive-cover.png`

Recommended use:
- Repository archive banner.
- README/release hero image.
- Portfolio case-study supporting image.

Source inputs:
- `public/logo/LOGO-0.5-NOBG.png`
- `docs/assets/lexinsights-chat-desktop.png`
- `docs/assets/lexinsights-compliance-report.png`
- `docs/assets/lexinsights-help-mobile.png`

### Open Graph Image

Path: `public/og/lexinsights-og.png`

Recommended use:
- Link previews for the public LexInsights app.
- Search, social, and portfolio previews that should show the current product name.

Source inputs:
- `public/logo/LOGO-0.5-NOBG.png`
- `docs/assets/lexinsights-compliance-report.png`

### Other Assets In This Directory

- `lexinsights-github-social-dark.png` — dark variant of the GitHub social preview.
- `lexinsights-chat-desktop.png` / `lexinsights-chat-desktop-light.png` — desktop chat captures (dark/light); the dark one is a README Product Preview image validated by `npm run check:screenshots`.
- `lexinsights-help-mobile.png` / `lexinsights-help-mobile-light.png` — mobile Help & Resources captures (dark/light); the dark one is the second validated README Product Preview image.
- `lexinsights-compliance-report.png` / `lexinsights-compliance-report-light.png` — compliance report captures (dark/light), used as composite inputs above.
- `lexinsights-rag-flow.svg` — providerless research flow diagram.

## Refinement Direction

Use these notes if the covers need another visual pass:

```text
Keep the existing real LexInsights logo and real app screenshots. Do not invent UI, legal seals, government marks, flags, people, fake case citations, or fake agency branding. Improve only layout, spacing, scale, crop, contrast, and typography.
```

```text
For GitHub social preview: keep the title "LexInsights" and subtitle "Philippine Legal Compliance Assistant" readable at small size. Use a calm pastel iris background, one real product screenshot, and short proof labels such as "Verified sources", "Local RAG", and "Public proof".
```

```text
For archive cover: keep a 16:9 composition using real screenshots from desktop, compliance answer, and mobile Help & Resources. Preserve generous margins, avoid clipped text, and keep the page suitable for README and release documentation.
```
