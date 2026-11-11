# Decisions

Status: **DECIDED** (by the user or NEVMA, with date) · **PROPOSED** (in this kit; confirm or change).

## Decided before this kit
- DECIDED 11 Nov (user, supersedes the 22 Oct two-phase plan): Style launches once, in December 2026, with the shop live (prices, bag, Shopify checkout, Viva, accounts, wishlist). No campaign-only phase.
- DECIDED: Shopify (Basic) is the commerce engine and checkout; Viva takes every payment (Smart Checkout app inside Shopify checkout).
- DECIDED: Astro on Vercel, Sanity for editorial content (own project, Free plan), English only, prices never in Sanity.
- DECIDED 22 Oct: the Nevma Music Home page shows a Style block read from Shopify (collection `music-home`).
- DECIDED (user, 9 Oct chat "Sanity CMS for ecommerce sites", confirmed 11 Nov): Shopify headless is the commerce engine and source of truth; **Sanity Connect** syncs products into Sanity, editors enrich them there; Astro reads both.
- DECIDED (user, Nov 2026): exact pixel-perfect build of the approved designs; Sanity + Shopify integration.
- DECIDED 11 Nov (tooling): Node >= 22.23.4. Astro 7.4.10 refuses older 22.x. `.nvmrc` pins 22.23.4.

## Proposed in this kit
1. **Repo:** standalone `nevma-style` workspace (apps/web + apps/studio), like the TEMS kit. The Shopify/edition modules are framework-free so the Music repo can copy them for its Style block.
2. **Exactness:** CSS generated from the canvas and used unchanged; one component per block with `data-block`; fidelity tests (text, styles, height ±2 %, pixels ≤ 0.1 %) at 1440 and 390 are the definition of done.
3. **Commerce modes:** `COMMERCE_ENABLED=true` in production (`false` = emergency switch: no Shopify calls, notify-only) and `COMMERCE_MOCK` (fixtures reproducing the design, for local work and tests).
4. **Routes:** `/drops/<slug>`, `/pieces/<handle>`, `/pieces` (filters `?filter=available|coming|sold-out`, `?view=gallery`), `/categories/<slug>`, `/bag`, `/account/sign-in`, `/account`, `/account/orders|addresses|profile`, `/wishlist`, `/story`, `/client-care/<slug>`, `/legal/<slug>`. Tabs and filters are real URLs (work without JS, linkable).
5. **One colourway = one Shopify product = one Sanity piece.** The piece references the product synced by Sanity Connect (and keeps the handle for URLs and pre-launch pages). Size is the only option. A separate `piece` document (instead of editorial fields on the synced product) keeps the seed, coming pieces not yet in Shopify, and the fidelity fixtures independent of Shopify IDs.
6. **Edition rules and every stock sentence** in one tested module (COMMERCE.md §4). Edition size from a product metafield, default 5.
7. **Drop timing** by Shopify scheduled publishing to the Headless channel at `drop.opensAt`; Sanity holds the same date.
8. **One per customer** enforced in our cart only (quantity 1, second size replaces the first). Inside Shopify checkout it is not enforced on Basic; Terms allow cancelling extras.
9. **Sold while in bag:** lines re-checked on every bag render and before checkout; unavailable lines are removed from the Shopify cart and shown once as in the design.
10. **Accounts:** Shopify new customer accounts via the Customer Account API (PKCE). Our sign-in page collects the email and hands it to Shopify's hosted code page (`login_hint`); the designed code step is Shopify's page, branded.
11. **Edition numbers per order line** in an order metafield `nevma.numbers`, filled by staff at packing.
12. DECIDED 11 Nov (user): **no Supabase on Style.** Wishlist, notify-me, newsletter sign-ups, drop-alert/Moments preferences, contact messages and the alert log are Sanity documents written by the server with an Editor robot token (`formSubmission`, `customerProfile`, `alertLog`; IDs with a "." so they stay private), like the Music site's forms. The privacy notice now reads "Sanity (website content, wishlist and requests)" (design/build and the seed updated).
13. **Guest wishlist** in localStorage + `ns_wishlist` cookie, merged on sign-in.
14. **Interface wording** in `apps/web/src/content/ui.ts`; editorial copy in Sanity (singletons with typed fields per block, no page builder).
15. **Policy pages** as Portable Text with a renderer that outputs the design's exact `.s-prose` markup (paragraph, h3, bullets, notice, table).
16. **Emergency switch:** with `COMMERCE_ENABLED=false` the bag, account and wishlist icons are hidden and their routes return 404; piece states come from `phase1State`.
17. **Not designed, built from existing parts:** 404 (empty-bag pattern), `/drops` and `/categories` redirects, cookie consent panel (bag drawer pattern), order detail lives inside Orders (as designed), no search.
18. **Analytics:** Vercel Web Analytics after consent (matches the Cookies table "[Analytics] · With consent").
19. **Checkout, thank-you, payment-not-completed and Viva handoff** boards are branding references for Shopify and Viva, not Astro pages.
