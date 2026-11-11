# 17 · Deploy, Shopify and Viva setup

Read docs/DEPLOY.md and COMMERCE.md §1.

1. Vercel project (root apps/web, region lhr1), all env vars per environment, crons, preview protection. Production runs with `COMMERCE_ENABLED=true` (the shop is live at launch); `false` is only the emergency switch.
2. Sanity webhook to `/api/revalidate`; Studio deployed; CORS for the production origin.
3. `scripts/shopify-webhooks.mjs` (Admin token): register the webhook topics for production and preview; list and remove stale ones.
4. Walk me through the Shopify checklist (COMMERCE.md §1 steps 1–9) and the Viva test order (OPEN-QUESTIONS Q4); record results in docs/DECISIONS.md.
5. Domain, HTTPS, redirects (www → apex or as NEVMA prefers), security headers and CSP.

**Checks:** production URL serves the live shop; Sanity publish updates a page within 60 s; webhook deliveries succeed in Shopify admin; one real low-value order placed and refunded end to end.
