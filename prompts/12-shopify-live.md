# 12 · Live Shopify provider, webhooks, revalidation

Needs a Shopify **development store** with `seed/shopify/products.csv` imported and the Headless channel set up (COMMERCE.md §1). Ask me for the tokens.

0. Sanity Connect (COMMERCE.md §1 step 8): with me, install it on the dev store, connect it to a **copy** of the dataset first, check the synced products, then connect `production`. Run `pnpm --filter studio link-shopify --dry`, then without `--dry`. Every piece of STYLE 001 must show "Shopify active" in the Studio list.
1. `src/lib/commerce/shopify.ts`: Storefront API client (fetch, private token, buyer IP, API version from env, typed queries from COMMERCE.md §3, retries on 429/5xx with backoff, 5 s timeout), product batch loading, cart mutations, buyer identity. Map to the provider interface.
2. `/api/shopify/webhook` (topic `inventory_levels/update` only): HMAC verification on the raw body, map inventory item → product handle via the Storefront/Admin API, revalidate the piece, drop, category, /pieces, /, trigger last-piece wishlist alerts (prompt 15 implements the email). Product edits arrive through Sanity Connect → Sanity webhook.
3. `/api/revalidate` for Sanity (secret, path map from CONTENT-MODEL.md, including synced `product`/`collection` documents).
4. Drop timing: products unpublished until opensAt; verify the piece page flips from upcoming to available without a deploy (schedule a test product 10 minutes ahead).
5. Smoke script `scripts/shopify-smoke.mjs`: reads all piece handles from Sanity and reports any without a Shopify product, any price/size mismatch with sizeGuide, any edition total > 5.

**Checks:** with `COMMERCE_ENABLED=true` against the dev store: piece pages show live price/stock; editing stock in Shopify updates the page within 60 s; webhook tests (valid/invalid HMAC) pass; smoke script clean.
