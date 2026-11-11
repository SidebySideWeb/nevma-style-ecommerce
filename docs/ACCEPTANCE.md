# Acceptance

| ID | Criterion | How to check |
|---|---|---|
| AC-01 | Every designed page and state matches the design at 1440 and 390 | `pnpm test:fidelity` green (81 checks) |
| AC-02 | Harness proven | `pnpm test:fidelity:self` green |
| AC-03 | Copy comes from Sanity / ui.ts; editing a Sanity field changes the page after publish (≤ 60 s) | edit hero intro, publish, reload |
| AC-04 | Prices and stock come from Shopify; changing stock in Shopify changes meter, tag and sentences within 60 s | test store |
| AC-05 | Edition wording rules | vitest `edition.test.ts` (all rows of COMMERCE.md §4) |
| AC-06 | Upcoming drop: no price, dashed meter, countdown, notify works; at opensAt the pieces become buyable without a deploy | scheduled publish on test store |
| AC-07 | Add to bag, one per customer, second size replaces first, drawer as designed | E2E on test store |
| AC-08 | Sold while in bag: line removed from cart, notice shown once, totals updated | buy the last piece in another browser |
| AC-09 | Checkout redirect lands on branded Shopify checkout; Viva payment completes; order status page branded | test order |
| AC-10 | Sign in / create account via Customer Account API; account pages show orders, numbers, addresses; sign out | test customer |
| AC-11 | Wishlist: guest saves, merges on sign-in, remove works, last-piece alert sent once | E2E + Studio (Customers) |
| AC-12 | Notify-me and contact forms: Turnstile, honeypot, rate limit, stored in Sanity (visible under Requests and customers), emails sent; notify requests deleted after the drop email | API tests + manual |
| AC-13 | Emergency switch works: no Shopify calls, states from Sanity, buy box replaced by notify, bag/account/wishlist hidden | `COMMERCE_ENABLED=false` on a preview |
| AC-14 | Performance: LCP ≤ 2.0 s, CLS ≤ 0.02, JS ≤ 30 KB gz per page | Lighthouse mobile, bundle report |
| AC-15 | Accessibility: keyboard paths, focus trap in drawer/menu, labels, contrast as designed, reduced motion | axe + manual |
| AC-16 | SEO: titles/descriptions from Sanity, canonical, sitemap (pieces, drops, categories, pages), Product JSON-LD with live price/availability, noindex on previews | crawl |
| AC-17 | Security: secrets server-only, webhook HMAC verified, account pages not cached | review + tests |
| AC-18 | No placeholders left except agreed ones | `node scripts/check-placeholders.mjs --strict` |
