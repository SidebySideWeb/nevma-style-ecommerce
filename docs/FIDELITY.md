# Fidelity: what "pixel perfect" means here, and how it is tested

## The reference
`design/build/` is the approved canvas frozen into static pages: **47 files**: 41 pages and states built in Astro (including interaction states such as "size chosen" and "bag drawer open") and 6 reference-only boards. Each was rendered from the canvas source at 1440 and 390 px and compared with the canvas runtime: **0 different pixels** on all of them (the phone-menu state at 390 only). Its CSS was then split into `css/style.css` + `css/page-<board>.css` and compared again: **0 different pixels**. So these files *are* the design.

- `design/build/<slug>.html` — open in a browser; every top-level block has `data-block`.
- `design/build/blocks/<slug>/NN-<id>.html` — each block's exact markup (271 snippets).
- `design/build/blocks.json` — pages, routes, block ids, heights at both widths. `text.json` — the words per block.
- `design/screenshots/{desktop,phone}/<slug>.png` — full-page captures.

## The tests (`apps/web/tests/fidelity`)
For each page/state in `pages.json` and for **desktop 1440×900** and **phone 390×844** (reduced motion, en-GB, Europe/London, clock fixed at 2026-10-23T13:00:00Z, site in `COMMERCE_MOCK=1`):
1. Same `data-block` ids in the same order as the design.
2. Each block's height within ±2 % (min 2 px).
3. Same text, word for word.
4. Same text styles in order: font family, size, weight, style, letter spacing, line height, case, colour, decoration — and the same background colours.
5. Pixels: at most **0.1 %** of the block's pixels differ (pixelmatch threshold 0.02), with photos hidden on both sides (photos come from Sanity's CDN with their own compression).
Interaction states are reached on the site by the steps in `pages.json` (click "L", "Add to bag", submit notify, open menu…); fixtures come from the `nv_fixture` cookie.

**Proof the harness works:** with the design served as the site (`pnpm test:fidelity:self`) all 81 checks pass (1 phone-only state skipped at 1440). Four deliberate one-detail changes on the product page each fail: a paragraph moved 1 px (pixels), the announcement link one shade lighter `#F5F5F7 → #F4F4F6` (text style), one capital letter in the copy (text), letter spacing +0.01em on the name (text style).

## Commands
```
pnpm test:fidelity                              # all pages, both widths (starts astro preview with COMMERCE_MOCK=1)
FIDELITY_ONLY='^product' pnpm test:fidelity     # one page family
pnpm test:fidelity --project=phone              # one width
pnpm test:fidelity:self                         # harness self-test (design vs design)
```
Failures attach `<block>-site.png`, `-design.png` and `-diff.png` to the HTML report (`apps/web/fidelity-report`).

## Rules
- Never edit `design/build`, `pages.json`, tolerances or the spec to pass. If the design needs to change, ask the user; the canvas is changed first and `design/build` regenerated.
- `data-fidelity-ignore` is reserved for third-party widgets that cannot be reproduced (Turnstile iframe). Nothing else.
- Fonts must be the self-hosted files; system fallback fonts will fail every text style check.
- When real photos replace stand-ins, the tests still pass (photos are hidden), but check crops by eye against the design screenshots.
