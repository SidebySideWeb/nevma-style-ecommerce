# 06 · Foundation: layout, announcement, header, footer

Read .cursor/rules/20-css-exact.mdc and 25-design-fidelity.mdc.

1. `src/layouts/Base.astro`: `<html lang="en-GB">`, head (title/meta from SEO, preload the two above-the-fold font files, fonts.css, style.css, the page's `page-<board>.css` passed as a prop), body with the `.s-root` wrapper and its inline style exactly as in the design (`background: #ECE7DE; color: #0B0B0C; font-family: 'Nunito Sans', …; font-size: 17px; line-height: 1.6; min-height: 100vh; overflow-x: clip`), skip link.
2. Components with `data-block`: `Announcement` (announcement), `Header` (header) with the phone menu (`src/scripts/menu.ts`: toggle, aria-expanded, Escape, focus trap, return focus), bag/wishlist counts as server islands with exact-size fallbacks, `Footer` (footer) with the newsletter form posting to /api/subscribe (stub returns success in mock mode).
3. Build them inside the real Home route (`src/pages/index.astro`). The other Home blocks come in prompt 07, so in this prompt only announcement, header and footer are expected to pass; do not add empty placeholder sections to fake block order.
4. Run `FIDELITY_ONLY='^home$' pnpm test:fidelity` and make **announcement, header and footer** pass at both widths (other blocks will fail until prompt 07). Then check `home~menu` (phone).

**Checks:** those three blocks pass on `home` at 1440 and 390 · menu state passes on phone · no JS errors in console.
