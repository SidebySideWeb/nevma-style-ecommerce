# 04 · Commerce layer: interface, fixtures, edition rules

Read docs/COMMERCE.md fully.

1. `src/lib/commerce/types.ts`: `PieceCommerce {handle, published, price (amount, currency), editionSize, variants[{id,size,quantityAvailable,availableForSale}]}`, `Cart`, `CartLine`, `Customer`, `Order`, `Address`.
2. `src/lib/commerce/edition.ts`: state (upcoming/available/last-piece/sold-out) from commerce data + drop.opensAt + now; every sentence in COMMERCE.md §4 (meter, card tag, piece stock line, short line, size chip aria, size note, size summaries, drop totals). `format.ts`: prices (site "£85", orders "£166.00"), dates and times in Europe/London exactly as in the design ("Fri 4 Dec, 18:00 GMT", "Released 2 Oct 2026", "Friday 2 October 2026", "23 Oct 2026"), countdown parts and its aria sentence. **Unit-test every row** against `design/build/text.json` strings.
3. `src/lib/commerce/provider.ts`: interface `{getPieces(handles), getCart(), addLine(variantId), removeLine(lineId), checkoutUrl(), getCustomer(), …}` and a factory choosing `off` (COMMERCE_ENABLED=false: states from Sanity phase1State, no prices), `fixture` (COMMERCE_MOCK=1, reads `apps/web/fixtures/commerce.json` and the `nv_fixture` cookie, refuses production) and `shopify` (stub for prompt 12).
4. `src/lib/now.ts`: server "now" (PUBLIC_FIXED_NOW in mock mode, else Date.now()).

**Checks:** vitest green, including a test that the fixture provider throws when VERCEL_ENV=production · `edition.ts` / `format.ts` / `shopify.ts` import nothing from Astro.
