# UI Design System

LexInsights is a work-focused Philippine legal research and compliance assistant. The product should feel like a quiet professional tool: dense enough for repeated legal work, readable under pressure, and mobile-friendly enough to demo as a PWA.

## Product Principles

- Put the usable chat interface first. Do not gate exploration behind authentication.
- Prefer calm hierarchy over marketing composition. The first screen is the product, not a landing page.
- Keep legal output scannable: headings, source groups, checklist rows, badges, and export actions should help users review quickly.
- Make demos realistic: responses may stream, show loading states, and reveal structured reports progressively.
- Treat legal limitations as persistent but unobtrusive. Use short disclaimers near the composer or as dismissible/floating notices.

## Source Of Truth

- Global tokens and app-level utilities live in [globals.css](../../src/app/globals.css).
- Theme bootstrapping lives in [theme.ts](../../src/lib/theme.ts).
- Shared primitives live in [components/ui](../../src/components/ui).
- Chat shell and responsive behavior live in [chat-page-shell.tsx](../../src/components/chat/chat-page-shell.tsx).
- Main header branding and auth entry points live in [chat-header.tsx](../../src/components/layout/chat-header.tsx).

## Brand Assets

- Primary logo: `public/logo/LOGO-0.5-woBG.svg`.
- PWA icons: `public/icons/`.
- Open Graph image: `public/og/lexinsights-og.png`.
- Use the actual brand logo in headers, favicon, PWA icons, and OG images. Do not replace it with generic icons.
- In dark mode, place the logo in a subtle light or translucent chip so the mark stays legible.

## Color System

Use Tailwind classes backed by the CSS variables in [globals.css](../../src/app/globals.css). Avoid raw hex values inside components unless adding a new token.

### Core Palette

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| App background | `#FFFFFF` | `neutral-900` | Main surface |
| Primary text | `neutral-900` | `slate-50` | Headings and important body text |
| Secondary text | `neutral-600` | `slate-300` | Supporting labels and helper copy |
| Primary action | `iris-600` | `iris-400` | Main CTA, active states, focus |
| Borders | `neutral-300` | `neutral-700` | Dividers, cards, inputs |
| Elevated surfaces | `white` | `neutral-800`/`neutral-900` | Dialogs, chat cards, menus |

### Semantic Tones

- Green/emerald: acceptable/compliant or AML controls.
- Amber: caution, child-safety review, partial coverage.
- Red: destructive actions, errors, missing/failed compliance.
- Sky: legal process, LGU checklist, neutral informational grouping.
- Iris: default brand emphasis, selected state, primary action.

Color must not be the only status indicator. Pair status color with text, icons, borders, or structure.

## Typography

- Body font: Manrope via `--font-manrope`.
- Display font: Outfit via `--font-outfit`.
- Body copy minimum: `text-base` on mobile inputs and long reading surfaces.
- Use `font-semibold` or `font-bold` for legal section headings; avoid oversized hero type inside compact tools.
- Letter spacing stays normal. Do not use negative tracking.
- Long legal prose should stay readable: prefer max-width containers and `leading-relaxed`.

## Shape, Elevation, And Density

- Default radius is `0.625rem`; most repeated cards and controls should use `rounded-md`, `rounded-lg`, or `rounded-xl`.
- Avoid extra-large pill shapes for core app surfaces. Save rounded-full for badges and chips.
- Use cards only for discrete items: prompt suggestions, chat bubbles, dialogs, menus, and report blocks.
- Do not nest decorative cards inside cards.
- Shadows should be subtle and functional. Dark mode should rely more on borders and surface contrast than heavy shadows.

## Layout System

### Desktop

- Large screens keep persistent navigation available: app rail, chat sidebar, main chat/report area.
- Compliance canvas may split the screen, but long report text must remain readable and scrollable without horizontal overflow.
- Header actions wrap or move into secondary rows when space is tight.

### Tablet And Mobile

- Use mobile-first spacing and touch targets.
- Hamburger mode must not leave hidden sidebars with invisible hit areas.
- Composer stays reachable near the bottom and respects safe-area padding.
- Suggested prompts must fit 320px width without horizontal scrolling.
- Avoid large empty gesture regions that navigate or focus unexpectedly.

## Interaction Rules

- Every interactive control needs a visible hover/focus/pressed state.
- Minimum touch target: 44px, preferably 48px for icon buttons.
- Icon-only controls need `aria-label`.
- Destructive actions require a confirmation state with a clear cancel affordance.
- Menus and dialogs must have keyboard focus behavior, escape routes, and high-contrast overlays.
- Prefer Lucide icons for system actions. Do not use emoji as structural icons.

## Chat And Composer

- General mode placeholder: short legal research prompt, e.g. `Ask about PH law...`.
- Compliance mode placeholder: upload/review language, e.g. `Upload or ask...`.
- Mode switcher belongs near the composer, not as a separate tab strip.
- Composer outer click may focus the textarea only when the click is inside the intentional input shell.
- The send button and research button must clearly distinguish standard send from deeper analysis.
- Keep disclaimer copy below the composer, not as a large blocking panel.

## Empty State And Prompt Cards

- Prompt cards should look like compact briefs, not generic list items.
- Each card should show an eyebrow, legal scope chip, icon, and action affordance.
- Use different semantic tones for different demo prompts to prevent a one-note palette.
- Preserve the product feeling: useful example prompts are better than feature explanations.

## Message And Report Rendering

- User message bubbles should use subtle gradients only; avoid saturated blocks.
- Assistant reports should prioritize readable legal structure over decorative chrome.
- Streaming should reveal text progressively and feel plausible, while respecting reduced motion.
- `Practical Checklist` bullets render as checkbox-style rows.
- Providerless reports should not repeat `Query:` inside the answer body because the user message already shows the query.
- Export actions should wrap on 320px screens and preserve `.docx` wording.

## Auth, Help, And Resources

- Sign in and sign up open a dialog overlay so exploration remains uninterrupted.
- Dialog overlays use a strong scrim and blur to isolate the foreground.
- Resources dialogs should be wider on desktop, full-height constrained, and column-based so headers/footers do not squeeze content.
- Sidebar header icons need custom tooltips on hover/focus.

## Accessibility Checklist

- Primary and secondary text contrast must pass in both themes.
- Focus rings remain visible across buttons, menus, dialogs, file uploads, and sidebars.
- Inputs use labels or accessible names; placeholder text is not the only label.
- Color-coded legal status always includes text/icon/structure.
- Motion respects `prefers-reduced-motion`.
- Keyboard users can open/close dialogs, menus, sidebar, and destructive confirmations.

## Responsive QA Matrix

Check these before shipping a UI change:

| Viewport | Must verify |
| --- | --- |
| 320px phone | No horizontal overflow; message actions wrap; prompt cards fit |
| 375px phone | Composer/disclaimer safe area; auth buttons legible |
| 548px tall phone | Header alignment; dark-mode contrast; mode menu width |
| 729px tablet | Sidebar overlay behavior; logo contrast; report readability |
| 1024px tablet/desktop | Resources dialog, compliance canvas, header action wrapping |
| 1280px desktop | Persistent sidebars, chat history, report split view |

## Pre-Ship UI Gate

Run or manually verify:

```powershell
npm run lint -- --max-warnings=0
npx tsc --noEmit
npm run check:docs
npm run check:pwa
npm run build
npm run smoke:browser
```

For production:

```powershell
npm run check:deployment -- --base-url https://lexiph.vercel.app
npm run check:live -- --base-url https://lexiph.vercel.app
```
