# Architecture

## Repository
```
nevma-style/                 pnpm workspace (pnpm 10, Node 22)
├─ apps/web/                 Astro site (Vercel)
│  ├─ src/pages/             routes (docs/PAGES.md) + src/pages/api/*
│  ├─ src/components/ui/     Header, Footer, Announcement, EditionMeter, PieceCard, Countdown, Prose, …
│  ├─ src/components/blocks/ one component per designed block (data-block id)
│  ├─ src/lib/sanity/        client, GROQ queries, mappers, image URLs
│  ├─ src/lib/commerce/      provider interface + shopify | fixture | off, edition rules, formatting
│  ├─ src/lib/server/        sanity-write (forms, wishlist, alerts), resend, turnstile, rate limit, session crypto, webhooks
│  ├─ src/content/ui.ts      fixed interface wording (button labels, aria text, stock sentences)
│  ├─ src/styles/            style.css + page-*.css (copied from design/build/css) + fonts.css
│  ├─ fixtures/commerce.json mock data for COMMERCE_MOCK=1 (reproduces the design)
│  └─ tests/fidelity/        design fidelity suite (Playwright)
├─ apps/studio/              Sanity Studio (schemas ready, validated)
├─ design/                   the approved design: build/ (exact static pages, css, blocks), screenshots, source
├─ seed/                     Sanity seed (word-for-word design copy + photos), Shopify products CSV
├─ docs/ · prompts/ · scripts/
```

## Who owns what
| Data | Source of truth | Read by the site |
|---|---|---|
| Words, photos, film, drops, pieces (editorial), categories, policies, FAQ, navigation | Sanity (`production`, private) | GROQ with a Viewer token, ISR-cached, revalidated by webhook |
| Product, variants, collections (titles, handles, options, prices, status) | Shopify, mirrored into Sanity by **Sanity Connect** (read-only `product`, `productVariant`, `collection` docs) | Studio (editors link pieces to products); the site still reads commercial data live |
| Price, sizes, stock, availability, publishing time of a product | Shopify | Storefront API at request time (server islands, short cache) |
| Cart | Shopify Cart (Storefront API) | cart id in `ns_cart` cookie |
| Checkout, payment, order confirmation | Shopify checkout + Viva Smart Checkout app | redirect to `cart.checkoutUrl` |
| Customer, orders, addresses, email marketing consent | Shopify (Customer Account API) | per request with the customer's token, never cached |
| Edition numbers per order line (N° 3 of 5) | Shopify order metafield `nevma.numbers` (set by staff at packing) | Customer Account API |
| Wishlist (signed in), drop alerts / Moments preference, notify-me and newsletter requests, contact messages, alert log | Sanity documents written by the server (`customerProfile`, `formSubmission`, `alertLog`) | server routes with the Editor robot token; never cached; ignored by the revalidate webhook |
| Guest wishlist | browser (`ns_wishlist` cookie mirror of localStorage) | merged into the customer's Sanity profile on sign-in |

A piece in Sanity references its synced Shopify product (`piece.product` → `shopifyProduct-<id>`) and carries the same handle (`piece.handle`, which is also the URL and lets a page be built before the product exists). One colourway = one piece = one Shopify product with a Size option.

## Rendering
- Astro `output: 'server'` on Vercel with ISR for editorial routes (Home, drop, piece, all pieces, category, story, client care, legal). Sanity webhook → `/api/revalidate` → on-demand revalidation of the affected paths (see DEPLOY.md).
- Commerce parts are **server islands** (`server:defer`) with `Cache-Control: s-maxage=15, stale-while-revalidate=30` (stock) or `private, no-store` (bag, account): price + meter + stock line + size chips + buy button; home/drop/category/pieces meters; header bag/wishlist counts. Fallbacks reserve the exact designed size.
- Account, wishlist and bag pages: on-demand, `private, no-store`.
- Product changes in Shopify → Sanity Connect updates the synced `product` document → the Sanity webhook → `/api/revalidate` (piece, drop, category, `/pieces`, `/`). Stock changes are not synced by Sanity Connect, so a Shopify `inventory_levels/update` webhook → `/api/shopify/webhook` revalidates the piece and triggers last-piece wishlist alerts.

## Modes
| Env | Behaviour |
|---|---|
| `COMMERCE_ENABLED=true` (production from launch) | Live Shopify. |
| `COMMERCE_ENABLED=false` (emergency switch only) | No Shopify calls. Piece state from `piece.phase1State`; no prices; buy box replaced by the notify form; bag/account/wishlist routes return 404 and their header icons are hidden. |
| `COMMERCE_MOCK=1` | Fixture provider (`fixtures/commerce.json`, `nv_fixture` cookie). For local work and fidelity tests only; refused when `VERCEL_ENV=production`. |

## Time
All dates are rendered in Europe/London. `PUBLIC_FIXED_NOW` (mock mode only) freezes "now" on the server; Playwright freezes the browser clock. The design time is 2026-10-23T13:00:00Z.

## Performance budgets
LCP ≤ 2.0 s (4G, mid phone) on Home and piece pages · CLS ≤ 0.02 · JS ≤ 30 KB gz per page · fonts: 2 preloaded files · images: AVIF/WebP via Sanity CDN with exact `sizes`.

## Security
Server-only secrets, Turnstile + honeypot + rate limit on every form, webhook signature checks, encrypted HttpOnly session cookie, CSP (self, cdn.sanity.io, challenges.cloudflare.com, Shopify checkout domain for redirects), no PII in logs. See `.cursor/rules/50-security-api.mdc`.
