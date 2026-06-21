# UI

The UI is a work-focused legal compliance tool. Keep pages dense, readable, and predictable instead of marketing-oriented.

## Design System

- Tailwind CSS is configured through the Next.js app styles in [globals.css](../../src/app/globals.css).
- Shared UI primitives live in [components/ui](../../src/components/ui).
- Use lucide-react icons for icon buttons and navigation affordances.
- Prefer small radius controls and panels over decorative rounded cards.

## Layout

- Chat routes share [chat-page-shell.tsx](../../src/components/chat/chat-page-shell.tsx).
- Desktop uses the app sidebar plus chat sidebar.
- Mobile uses an overlay sidebar and a fixed menu button.
- Keep route files thin and move repeated layout behavior into reusable components.

## Accessibility

- Use semantic buttons and form controls.
- Provide `aria-label` on icon-only controls.
- Preserve keyboard access for dialogs, menus, file upload, and sidebars.
- Keep visible focus states.
- Do not rely on color alone for compliance status; pair color with labels or structure.

## Responsive Rules

- Keep button text short and avoid viewport-scaled font sizes.
- Use stable dimensions for fixed controls.
- Avoid text overlap by constraining widths and allowing wrapping where needed.
- Verify both mobile and desktop chat layouts after major UI changes.

## Compliance Output

Compliance findings use green, amber, and red status language. The Markdown export path is handled by the compliance canvas and should remain compatible with `.md` downloads.
