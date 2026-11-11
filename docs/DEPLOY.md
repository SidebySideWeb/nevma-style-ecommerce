# Deploy, environments and jobs

## Accounts (client pays running costs; see the NEVMA cost document)
Vercel (NEVMA team, Pro) · Sanity project "NEVMA Style" in the NEVMA organization (Free plan) · Shopify Basic · Viva (Smart Checkout app) · Resend (domain verified, sender e.g. style@<domain>) · Cloudflare Turnstile (site key for the domain) · GitHub repo `nevma-style`.

## Environment variables (`.env.example`)
| Name | Where | Notes |
|---|---|---|
| `PUBLIC_SITE_URL` | web | canonical origin |
| `PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET` | web | dataset `production` (private) |
| `SANITY_READ_TOKEN` | web (server) | Viewer robot token |
| `SANITY_REVALIDATE_SECRET` | web (server) | Sanity webhook secret |
| `COMMERCE_ENABLED` | web | `true` (shop live); `false` only as an emergency switch |
| `COMMERCE_MOCK` | web | `1` locally/tests only; refused in production |
| `SHOPIFY_STORE_DOMAIN` | web | `<shop>.myshopify.com` |
| `SHOPIFY_API_VERSION` | web | `2026-10` |
| `SHOPIFY_STOREFRONT_PUBLIC_TOKEN` | web | only if a browser call is ever needed |
| `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` | web (server) | Headless channel private token |
| `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` | web (server) | Customer Account API (public client, PKCE) |
| `SHOPIFY_SHOP_ID` | web (server) | for Customer Account discovery/endpoints |
| `SHOPIFY_WEBHOOK_SECRET` | web (server) | from the webhook app / store settings |
| `SHOPIFY_ADMIN_TOKEN` | scripts only | optional: drop schedule check, seeding |
| `SESSION_SECRET` | web (server) | 32+ bytes, encrypts ns_session / ns_flash |
| `SANITY_WRITE_TOKEN` | web (server) | Editor robot token: form submissions, customer wishlist/preferences, alert log |
| `RESEND_API_KEY`, `MAIL_FROM`, `CLIENT_CARE_TO` | web (server) | |
| `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | web | |
| `CRON_SECRET` | web (server) | Vercel cron auth |
| `PUBLIC_FIXED_NOW` | web | mock mode only |
| `SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET` | studio | |

## Vercel
Project root `apps/web`, framework Astro, Node 22, region `lhr1` (London). Production branch `main`; previews per PR (preview domain added to Shopify Customer Account callbacks). ISR bypass token = `SANITY_REVALIDATE_SECRET`-derived; on-demand revalidation per path from `/api/revalidate` and `/api/shopify/webhook`.

Crons (`vercel.json`): `/api/cron/drops` every 5 minutes (sends "it's open" emails once per drop, deletes the requests, revalidates) · `/api/cron/retention` daily 03:10 UTC · `/api/cron/wishlist-alerts` hourly fallback.

## Sanity
`pnpm --filter studio deploy` → `nevma-style.sanity.studio`. Webhook: on create/update/delete of all types except none → `https://<domain>/api/revalidate`, secret header, projection as in CONTENT-MODEL.md. CORS: site origin (no credentials). Weekly export job to the backup Drive folder (same job as the other NEVMA projects).

## Shopify webhooks
Product and collection changes reach the site through Sanity Connect → Sanity webhook. Register only `inventory_levels/update` (stock) → `https://<domain>/api/shopify/webhook` (JSON, API 2026-10). Include `product` and `collection` in the Sanity webhook filter. Register via the Admin API script `scripts/shopify-webhooks.mjs` (prompt 13) or a custom app.

## Launch checklist (one launch in December, shop live)
Content and site: fidelity green, `check-placeholders --strict` with agreed exceptions only, legal texts from NEVMA's lawyer, Turnstile live, Resend domain verified, analytics consent, noindex off on production only, redirects, 404, sitemap, robots.
Shop: Shopify live store with products, prices and stock checked against Sanity (`scripts/shopify-smoke.mjs` clean), Viva test order passed, checkout and order status page branded, Customer Account callbacks on the production domain, webhooks registered, drop schedule (STYLE 002 at its opensAt) set in both Shopify and Sanity, one real low-value order placed and refunded end to end.
