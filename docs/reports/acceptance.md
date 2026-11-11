# Acceptance results — prompt 18

Date: **11 Nov 2026**  
Environment: local mock (`COMMERCE_MOCK=1`, `PUBLIC_FIXED_NOW=2026-10-23T13:00:00Z`) unless noted. Production URL: https://nevma-style.vercel.app (commerce stub still blocks live shop).

## Suite gates

| Gate | Result | Evidence |
|---|---|---|
| `pnpm check` | **PASS** | astro check / tsc / eslint / JS budget green (1 zod `.email` deprecation hint only) |
| `pnpm test` | **PASS** | 102 / 102 vitest |
| `pnpm test:fidelity` | **PASS** | **81 passed**, 1 skipped (width-only state) |
| `pnpm test:fidelity:self` | **PASS** | **81 passed**, 1 skipped |
| `node scripts/check-placeholders.mjs --strict` | **FAIL** | 50 distinct placeholders remain (client content — see list below) |

## AC-01 … AC-18

| ID | Result | Evidence / notes |
|---|---|---|
| AC-01 | **PASS** | `pnpm test:fidelity` → 81 checks green at 1440 + 390 |
| AC-02 | **PASS** | `pnpm test:fidelity:self` → 81 green |
| AC-03 | **PASS (partial)** | Copy path: Sanity / `ui.ts` wired; `/api/revalidate` smoke on prod returned `{"ok":true,"revalidated":["/"]}` (prompt 17). Full “edit hero → publish ≤60s” not re-timed in this session — webhook registered |
| AC-04 | **FAIL** | Live Shopify Storefront provider still stubbed (prompt 12); `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` empty on Vercel. Production piece/drop routes 404 or fall back when mock is off |
| AC-05 | **PASS** | `edition.test.ts` green (COMMERCE.md §4 rows) |
| AC-06 | **FAIL** | Needs live scheduled publish + Storefront; upcoming UI exists under mock / Sanity only |
| AC-07 | **PASS (mock)** | Keyboard QA: size chip + Add opens bag drawer under mock. Live E2E blocked by AC-04 |
| AC-08 | **PASS (mock / unit)** | Bag sold-while-in-bag path covered by fidelity fixture + cart unit tests; live dual-browser not run |
| AC-09 | **FAIL** | Shopify checkout + Viva test order not available (OPEN-QUESTIONS Q4 / prompt 17) |
| AC-10 | **PASS (mock)** | Sign-in + account fidelity green with `signed-in` fixture; live Customer Account not exercised end-to-end |
| AC-11 | **PASS (mock)** | Wishlist guest + signed-in fidelity green; last-piece alert job unit-tested; live email not sent (no Resend key) |
| AC-12 | **PASS (unit + mock UI)** | `form-handlers.test.ts`, cron/job tests green; Turnstile/honeypot/rate-limit coded. Real Resend + Studio “Requests” visibility needs `RESEND_API_KEY` |
| AC-13 | **FAIL (not re-run)** | Emergency switch implemented; no dedicated preview deploy with `COMMERCE_ENABLED=false` verified this session |
| AC-14 | **FAIL (local)** | Lighthouse mobile on `astro dev`: perf ~69–72, LCP ~5 s, CLS 0 (see `docs/reports/lighthouse.md`). JS budget ≤30 KB gz **PASS**. Re-run LH against production/preview for the ≥95 gate |
| AC-15 | **PASS with known design findings** | Keyboard: menu trap/Escape, size picker, bag drawer, bag, sign-in, contact all **PASS** (`docs/reports/keyboard.json`). axe on every route (`docs/reports/axe.json`): remaining **serious** = `label-content-name-mismatch` on logo (`aria-label="NEVMA Style home"` vs visible “NEVMA / STYLE”) and richer card `aria-label`s — matches design markup; **not** loosened. Story placeholder contrast (`#615D55` on `#D9D3C8`) flagged. Contact `role=radio`+`aria-pressed` critical fixed to match design (`aria-pressed` only) |
| AC-16 | **PASS (code)** | Titles/canonical/OG/JSON-LD/sitemap/robots/`llms.txt` shipped (prompt 16). Product JSON-LD live price needs Storefront (AC-04). Production crawl smoke: home 200 with Organization/WebSite JSON-LD |
| AC-17 | **PASS (review + tests)** | Secrets server-only; Shopify HMAC tests green; account routes `noindex` / private caching patterns in place; CSP/HSTS on production headers |
| AC-18 | **FAIL** | `--strict` exits 1 — 50 placeholders (agreed client backlog per OPEN-QUESTIONS Q8/Q10); listed below |

## Cross-browser (eye / screenshots)

Against local mock, spot pages `/`, piece, bag, sign-in, contact at **1440 / 1024 / 768 / 390**:

| Engine | Status |
|---|---|
| Chromium (Chrome/Edge stand-in) | **PASS** — `docs/reports/cross-browser/` |
| Firefox | **PASS** — same widths/routes |
| WebKit (Safari stand-in) | **PASS** — Playwright WebKit on Windows |
| Safari macOS + iOS (real devices) | **Not run** — needs Mac / device lab |

Fidelity already locks pixel match to design screenshots at 1440 and 390 for Chromium.

## Placeholders remaining (`--strict`)

50 distinct — all expected client replacements unless marked:

- Contacts / legal: `[style@nevma…]`, `[privacy@nevma…]`, `[NEVMA company name]`, `[legal entity]`, `[registered address]`, `[number]`, `[com]`, `[NEVMA Style studio address, London]`, `[date]`
- Domain / sister sites: `[nevma-music]`, `[nevma-moments]`, `[nevma-music-domain]`
- Commerce / shipping: `[confirm DDP or DAP]`, `[we pay duties…]`, `[£18]`, `[£25]`, `[confirm the methods enabled on the Viva account]`
- Product copy / facts: `[Fabric…]`, `[Colour]`, `[country]`, `[Print method]`, `[Country and workshop]`, size numbers `[54]`…`[76]`, second paragraphs for bone/wordmark tees
- Photos / film slots without assets: `[Photo · …]`, `[Film · 0:24…]`, workshop/mill/printer/tannery labels
- Misc: `[Analytics]`, `[13 months]`, `[404 text: not designed yet — built from the empty-bag pattern.]`

## Scripts added this prompt

- `scripts/qa-axe.mjs` — axe scan all routes  
- `scripts/qa-keyboard.mjs` — keyboard paths  
- `scripts/qa-cross-browser.mjs` — multi-width screenshots  

## Bottom line

Fidelity + unit/check gates are green. Launch blockers for a full AC walk: **prompt 12 live Shopify**, **Resend/Turnstile real keys**, **Viva test order**, **placeholder content**, **Lighthouse on a production URL**, **real Safari / Firefox device pass**.
