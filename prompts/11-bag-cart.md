# 11 · Bag and cart API

Read COMMERCE.md §5.

1. `/api/cart` (POST add/remove/move-to-wishlist; JSON for JS, redirect for forms): one of each piece per customer (quantity 1, second size replaces the first), `ns_cart` cookie (HttpOnly, 14 days).
2. `/bag`: block your-bag — lines, summary, notes from shopPages.bag; sold-while-in-bag handling (remove from cart, show once via `ns_flash`, notice text with {piece}); empty state with {drop}/{left}/{nextDrop}/{nextDate}. "Checkout securely" → `/api/checkout` (re-validate lines, then 303 to cart.checkoutUrl).
3. Fixture carts `bag-normal`, `bag-sold-while-in-bag`, `bag-empty` via `nv_fixture`.

**Checks:** `FIDELITY_ONLY='^bag' pnpm test:fidelity` green (3 states) · API tests for the cart rules.
