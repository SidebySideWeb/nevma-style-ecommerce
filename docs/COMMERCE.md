# Commerce: Shopify + Viva

**How Sanity and Shopify work together** (as agreed in the earlier "Sanity CMS for ecommerce sites" chat): Shopify is the commerce engine and the source of truth for products, prices, stock, checkout and orders. **Sanity Connect for Shopify** (official app) syncs products, variants and collections into Sanity as read-only documents; editors enrich them in Sanity (a `piece` references its synced `product`) and build drops, campaigns and stories around them. The Astro site reads editorial content from Sanity and live price/stock/cart from the Storefront API. Stock quantities are not part of the sync, so they are always read live.

Pinned API version: **2026-10** (`SHOPIFY_API_VERSION`) for the Storefront and Customer Account APIs. Check the release notes before upgrading.

## 1. Shopify store setup (client + you; development store needed before prompt 12, live store before launch)
1. Shopify **Basic**, store currency GBP, taxes: prices include VAT (UK). Markets: United Kingdom primary; Europe and Rest of world per Shipping page.
2. Install the **Headless** sales channel. Create a storefront "nevma-style-web": copy the public and private Storefront tokens; enable permissions: products and collections, **product inventory** (needed for `quantityAvailable`), cart/checkout, customer (for buyer identity), metafields you expose.
3. In the same Headless storefront, open **Customer Account API**: client type public (PKCE). Callback URI `https://<domain>/account/callback` (plus the preview domain), JavaScript origin `https://<domain>`, logout URI `https://<domain>/`. Local testing needs an https tunnel (localhost is refused).
4. Settings → Customer accounts: **new customer accounts** (passwordless 6-digit code). Brand the login page (logo, colours) to match the design (`sign-in~code.html` is the reference).
5. Products: one product per colourway, option **Size** (values match `piece.sizeGuide.sizes`; accessories use one value), inventory tracked at one location, **continue selling when out of stock: off**. Quantities = real stock per size; total per product ≤ edition size. Metafields (product): `nevma.edition_size` (integer, default 5), `nevma.number` (integer, archive N°), `nevma.drop` (single line, e.g. "STYLE 001"). Expose them to the Storefront API.
6. Collections: one manual collection per drop (`style-001`, `style-002`) and `music-home` (the Nevma Music Home block, handles agreed with NEVMA).
7. Order metafield `nevma.numbers` (JSON: `{"<line item id>": 3}`), editable in admin, readable by the Customer Account API. Staff fill it at packing. (PROPOSED; alternative: a line-item note set by a small admin action.)
8. **Sanity Connect**: install the Sanity Connect app from the Shopify App Store, connect it to the Style Sanity project and the `production` dataset (test on a copy dataset first: it creates documents immediately). Choose **direct sync**, **sync data automatically**, **sync collections**, and **import metafields** for the namespace `nevma`. It creates `product` (`shopifyProduct-<id>`), `productVariant` and `collection` documents (schemas already in apps/studio). Then run `pnpm --filter studio link-shopify` to link each piece to its product by handle and each drop to its collection.
9. **Viva**: install Viva's official Smart Checkout app for Shopify, set it as the payment provider. Test order in December (see OPEN-QUESTIONS Q4).
10. Checkout editor (branding, `checkout.html` is the reference): logo (dark wordmark), background Bone `#ECE7DE`, main panel `#F5F2EC`, text Ink `#0B0B0C`, accent/buttons Ink, inputs border `#8A8274`, corner radius small (Shopify has no pill buttons), fonts Montserrat (headings) and Nunito Sans (body) if offered in Shopify's list, else the closest. Order status page uses the same branding; "Continue shopping" → the site.
11. Seed: import `seed/shopify/products.csv` (Products → Import) into a **development store** first. It creates the six pieces with sizes, SKUs and the design's stock. STYLE 002 products are drafts with `[price]`. Check inventory per size after import (CSV inventory columns depend on Shopify's import format and location; set by hand if they did not apply).

## 2. Drop timing
- A drop opens at `drop.opensAt` (Sanity). Its products are **unpublished from the Headless channel** until then, and scheduled to publish at the same time (Shopify scheduled publishing). Unpublished products are invisible to the Storefront API, so the site shows the upcoming state from Sanity (no price; "Price revealed at the drop").
- At open: Shopify publishes → `products/update` webhook → revalidate. A Vercel cron (`*/5 * * * *` around drop days, or one-off at opensAt) also revalidates and sends the notify-me emails (section 7).
- Keep Sanity `opensAt` and the Shopify schedule identical; `pnpm check:drops` (prompt 13) compares them through the Admin API if an Admin token is configured.

## 3. Reading products (Storefront API, server only)
```graphql
query Piece($handle: String!) {
  product(handle: $handle) {
    id handle title availableForSale publishedAt
    priceRange { minVariantPrice { amount currencyCode } }
    edition: metafield(namespace: "nevma", key: "edition_size") { value }
    options { name optionValues { name } }
    variants(first: 10) { nodes { id availableForSale quantityAvailable selectedOptions { name value } price { amount currencyCode } } }
  }
}
```
Batch for lists with `nodes(ids:)` or `products(query: "handle:a OR handle:b")`. Headers: `Shopify-Storefront-Private-Token`, `Shopify-Storefront-Buyer-IP: <client ip>`. Endpoint `https://<shop>.myshopify.com/api/2026-10/graphql.json`.

## 4. Edition states and wording (one module: `src/lib/commerce/edition.ts`, unit-tested)
`left = Σ variant.quantityAvailable` (never negative) · `size = edition_size ?? 5`.
| State | Rule | Meter | Card tag | Stock sentence (piece page) | Short (cards, lists) |
|---|---|---|---|---|---|
| upcoming | product not published or drop.opensAt in the future | 5 dashed pips | COMING | "Edition of 5" | "Edition of 5 · coming" |
| available | left ≥ 2 | left filled | "3 OF 5 LEFT" | "3 of 5 left" | "3 of 5 left" |
| last-piece | left = 1 | 1 filled | LAST PIECE | "Last piece of five" | "Last piece" |
| sold-out | left = 0 | 0 filled | SOLD OUT (bone) | "Sold out" | "Sold out" |
Size chip aria: "S, sold out" · "M, last one" · "L, 2 left". Size note: none chosen → "Crossed-out sizes are sold out."; chosen with 1 → "L · the last one in this size"; with n → "L · 2 left in this size".
Size summary (drop/category cards): sizes with stock → "Available in M (1) and L (2)." + sold sizes → " S and XL are gone." (drop page only); one left → "Last piece: size L."; none → "No sizes left. This piece will not be made again."
Drop totals: "4 of 15" = Σ left over the drop's live pieces / (pieces × size). Words for numbers: "five" only in "Last piece of five" and "All five have found a home".
Prices: whole pounds without decimals on the site ("£85"); order totals with decimals ("£166.00"). `Intl.NumberFormat('en-GB', {style:'currency', currency:'GBP'})`, strip ".00" for site prices.

## 5. Cart (Storefront Cart API)
- `cartCreate` on first add; id in `ns_cart` (HttpOnly, 14 days). `cartLinesAdd`, `cartLinesRemove`, `cartBuyerIdentityUpdate` (customer token after sign-in, country GB by default).
- **One of each piece per customer**: quantity always 1; adding another size of a piece already in the bag replaces that line. Enforced in `/api/cart`. Shopify Basic cannot enforce limits inside checkout without an app; the Terms allow cancelling extra orders (OPEN-QUESTIONS Q5).
- **A bag does not hold a piece.** On every bag render and before redirecting to checkout, re-read the cart lines' `merchandise { ... on ProductVariant { availableForSale quantityAvailable } }`. Lines now unavailable are removed from the Shopify cart and shown once, greyed, with "Sold out while in your bag" plus the notice (design `bag-sold.html`), via a one-time `ns_flash` cookie.
- Bag drawer after add: the server returns the updated cart summary; the drawer shows the added line and the note with `{leftWords}` = "This is the last one in your size." when the chosen size has quantityAvailable 1, else "Others can still buy this size."
- Checkout: `cart.checkoutUrl` (Shopify-hosted, branded). Viva is the payment step inside it. After payment the customer lands on Shopify's order status page; "Continue shopping" returns to the site.

## 6. Customer accounts (Customer Account API)
- Sign-in page (`/account/sign-in`): our designed email form posts to `/api/account/login`, which builds the authorize URL (discovery: `https://<shop domain>/.well-known/openid-configuration` and `/.well-known/customer-account-api`), scope `openid email customer-account-api:full`, `state`, `nonce`, PKCE `code_challenge` (S256), and `login_hint=<email>` so Shopify's hosted page goes straight to the code step. Verify `login_hint` support on the test store; without it the shopper types the email again on Shopify's page.
- Create account mode collects first/last name and email preferences, stores them in a 10-minute encrypted cookie, and after the callback applies them (`customerUpdate`, email marketing consent for the letter, `customerProfile.prefs` in Sanity for drop alerts and Moments).
- `/account/callback`: verify state, exchange code (`grant_type=authorization_code`, `code_verifier`), store access + refresh tokens and expiry in `ns_session` (encrypted, HttpOnly, Secure, SameSite=Lax, 30 days); refresh with `grant_type=refresh_token` when < 5 min left. `/account/logout`: clear cookie, redirect to the end-session endpoint with `id_token_hint`.
- Queries: customer (firstName, lastName, emailAddress, defaultAddress, addresses), orders (name, processedAt, financialStatus, fulfillmentStatus, totalPrice, totalTax, lineItems with variant + image, fulfillments + tracking, metafield `nevma.numbers`). Address create/update/delete and default via the API's mutations.
- Signed out → `/account*` redirects to `/account/sign-in?next=…`.

## 7. Requests and customer data in Sanity (server only, Editor robot token)
No separate database. The site writes these documents with `SANITY_WRITE_TOKEN` (never sent to the browser). IDs contain a "." so they are private even if the dataset were public. They appear in the Studio under **Requests and customers**; the revalidate webhook ignores them.
- `formSubmission` (`submission.<uuid>`): `form` = notify | contact | newsletter, email, name, topic, orderNumber, reference, message, drop/piece (weak refs), letterOptIn, status (contact: new → replied; notify: waiting → sent), createdAt, sentAt, internalNote (staff).
- `customerProfile` (`customer.<numeric Shopify customer id>`): customerId, email, wishlist [{piece (weak ref), addedAt}], prefs {dropAlerts, moments}, updatedAt. Created on first sign-in or first save. Orders, addresses and names stay in Shopify.
- `alertLog` (`alert.last-piece.<handle>`, `alert.drop-open.<drop slug>`): kind, piece/drop, recipients, sentAt — guarantees each alert goes out once (create with `createIfNotExists` before sending).
Writes are small mutations (create, patch with `setIfMissing` + `insert`/`unset` for the wishlist, delete). Duplicates are prevented by deterministic IDs where possible (`submission.notify.<sha256(email|drop|piece)>`).
Jobs (Vercel cron → `/api/cron/*` with `CRON_SECRET`):
- **drop-open**: when a drop has opened, email each `notify` submission for it (and its pieces) once, write the alert log, then **delete** those submissions ("We email you once, then delete the request").
- **retention**: delete contact submissions older than 24 months and newsletter submissions when someone unsubscribes.
- **wishlist-alerts** (fallback; the inventory webhook does it immediately): pieces at 1 left → email customers whose wishlist holds them, once per piece.
- The letter preference is Shopify email marketing consent (Q6); drop alerts and Moments live in `customerProfile.prefs`.
Data requests: deleting a customer's data = delete their `customerProfile` and submissions by email (Studio search), plus Shopify's own customer data request.
Sanity Free plan limits are ample here (documents and API requests); watch the usage page after the first drop.

