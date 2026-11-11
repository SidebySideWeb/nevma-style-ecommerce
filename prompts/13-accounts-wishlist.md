# 13 · Accounts and wishlist

Read COMMERCE.md §6–7. Needs the Customer Account API client ID and an https tunnel for local callbacks.

1. Auth routes: `/api/account/login` (authorize URL with PKCE, state, nonce, login_hint; create-mode profile cookie), `/account/callback`, `/account/logout`, token refresh in middleware, `ns_session` encrypted cookie. Signed-out redirects with `next`.
2. Pages: `/account/sign-in` (auth: sign in / create tabs, why-have-an-account), `/account`, `/account/orders`, `/account/addresses` (create/edit/remove/default via Customer Account API), `/account/profile` (name, preferences: drop alerts + Moments in the Sanity `customerProfile`, letter = email marketing consent). Orders show N° per line from the `nevma.numbers` order metafield.
3. Wishlist: `/wishlist` (signed in: Sanity `customerProfile.wishlist`; guest: localStorage + `ns_wishlist`), `/api/wishlist` (add/remove), merge guest items on sign-in, header count.
4. Fixture `signed-in` reproduces the design's customer, orders, addresses, preferences and wishlist.

**Checks:** `FIDELITY_ONLY='^(sign-in|account|wishlist)' pnpm test:fidelity` green (8 states) · manual: sign in on the dev store, see a test order, add/remove an address, sign out.
