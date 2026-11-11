# 03 · Server utilities (forms, email, sessions, Sanity writes)

Read docs/COMMERCE.md §7 and .cursor/rules/50-security-api.mdc. There is no separate database: requests, wishlist and preferences are Sanity documents written by the server.

1. Create an **Editor** robot token in the Sanity project (only for the site's server): `SANITY_WRITE_TOKEN`. Never import it in client code.
2. In `apps/web/src/lib/server/`:
   - `sanity-write.ts` — write client (useCdn false, API 2026-10-01) and typed helpers: `createSubmission()` (`submission.<uuid>`, or deterministic `submission.notify.<sha256(email|drop|piece)>` so a repeat notify request is not stored twice), `getProfile(customerId)`, `addToWishlist / removeFromWishlist` (patch with setIfMissing + insert / unset by _key), `setPrefs`, `deleteSubmissions(filter)`, `logAlertOnce(kind, slug)` (createIfNotExists; returns false if it already existed). Server-only import guard.
   - `turnstile.ts` — verify with secret + remote IP; accept Cloudflare's test keys in dev and COMMERCE_MOCK.
   - `ratelimit.ts` — sliding window per IP + route (in memory per instance is fine at this scale; interface ready for a KV store).
   - `resend.ts` — send with MAIL_FROM; plain text + simple HTML.
   - `session.ts` — encrypt/decrypt JSON cookies with SESSION_SECRET (JWE A256GCM via `jose`).
   - `http.ts` — form parsing, zod helpers, responses that work with and without JS (JSON or 303 redirect with `?sent=1`).
3. In COMMERCE_MOCK mode the write helpers do nothing and return success (fidelity tests must not write to Sanity).
4. Unit tests: turnstile (mocked fetch), ratelimit, session round-trip and tamper rejection, sanity-write helpers (mocked client: correct IDs, patches, createIfNotExists).

**Checks:** `pnpm test` green · a test submission created with the real token appears in the Studio under Requests and customers, then is deleted.
