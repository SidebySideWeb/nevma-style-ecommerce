# NEVMA Style — agent guide

You are building **NEVMA Style**, a limited-edition shop (up to five pieces of each colourway, never restocked) for NEVMA, a London music company. Front end: **Astro on Vercel**. Editorial content: **Sanity** (`apps/studio`). Commerce: **Shopify** headless (Storefront API for products, stock and cart; Customer Account API for sign-in, orders, addresses), Shopify-hosted checkout with **Viva** as the payment method. Wishlist, preferences and form requests: **Sanity** documents written by the server (no separate database). Email: **Resend**. Bot protection: **Cloudflare Turnstile**.

The job is an **exact, pixel-perfect build of the approved designs** in `design/build/`. The design is the spec. Do not redesign, "improve", round values or swap components.

## Read first
1. `docs/FIDELITY.md` — how exactness is defined and tested. Non-negotiable.
2. `docs/PAGES.md` — every route, block, data source and behaviour.
3. `docs/ARCHITECTURE.md` and `docs/COMMERCE.md` — how Sanity, Shopify (with Sanity Connect) and the site fit together.
4. `docs/CONTENT-MODEL.md` — Sanity documents and what comes from where.
5. `docs/DESIGN-SYSTEM.md` — tokens, the shared `.s-*` classes, type, motion.
6. `docs/DECISIONS.md`, `docs/OPEN-QUESTIONS.md`, `docs/ACCEPTANCE.md`.

Then run the prompts in `prompts/` in order (see `prompts/00-how-to.md`). One prompt per session; finish its checks before the next.

## Hard rules
- **Markup and CSS come from the design.** Each block's markup is in `design/build/blocks/<page>/NN-<block>.html`; the CSS is `design/build/css/style.css` (shared) plus `css/page-<board>.css` (per page). Copy them into the app unchanged (`apps/web/src/styles/`). Inline styles in the snippets move into the component as-is (a `style` attribute or a scoped class with the same declarations). Same element types, same class names, same order.
- **Every top-level block carries `data-block="<id>"`** with the id from `design/build/blocks.json`. The fidelity tests find blocks by it.
- **Prices and stock never live in Sanity.** They come from Shopify at request time (server islands). Sanity holds words, photos and links.
- **Words come from Sanity or `src/content/ui.ts`**, never typed into components. The seed reproduces the design copy word for word.
- `pnpm test:fidelity` must pass (desktop 1440 and phone 390) before a page is called done. Never loosen a threshold, skip a block or add `data-fidelity-ignore` to pass. Fix the page.
- Secrets only in env vars; never in client bundles. The Shopify private Storefront token, the Customer Account client secret (if any), Sanity write token, Resend and Turnstile secrets are server-only.
- English (UK) only. Dates and times in Europe/London, written as in the design ("Fri 4 Dec, 18:00 GMT").
- Accessibility as designed: skip link, landmarks, labels, focus styles, `aria-*` values from the design, reduced motion.
- Text in square brackets (`[style@nevma…]`) is a placeholder the client will replace. Keep it until the content changes; `scripts/check-placeholders.mjs --strict` blocks launch while any remain.

## Commands
```
pnpm install
pnpm dev                 # web on :4321, studio on :3333
pnpm test:fidelity       # design fidelity, both widths (COMMERCE_MOCK=1)
pnpm test                # unit + API tests
pnpm check               # astro check, tsc, eslint, placeholders
```
