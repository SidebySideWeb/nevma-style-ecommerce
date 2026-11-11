# NEVMA Style — Cursor build kit (v1.2, 11 Nov 2026)

Everything Cursor needs to build the NEVMA Style shop (one launch in December, shop live) as an exact copy of the approved design, with Sanity for content and Shopify (Viva payments) for commerce.

| Folder | What it is |
|---|---|
| `AGENTS.md`, `.cursor/rules/` | Instructions Cursor loads automatically |
| `prompts/` | 18 build prompts in order (start with `00-how-to.md`) |
| `docs/` | Architecture, commerce (Shopify, Sanity Connect, Viva, forms and wishlist in Sanity), pages and blocks, content model, design system, fidelity, deploy, decisions, open questions, acceptance |
| `design/` | `index.html` (browse it), `build/` = the design as exact static pages + CSS + per-block markup, `screenshots/`, `source/` (canvas files) |
| `apps/web/tests/fidelity/` | Playwright suite that compares every page, block by block, with the design at 1440 and 390 |
| `apps/web/fixtures/commerce.json` | Mock Shopify data that reproduces the design (stock, bag, account, orders, wishlist) |
| `apps/studio/` | Sanity Studio, schemas ready (validated, builds) |
| `seed/` | Sanity seed with the design copy word for word + photos; Shopify products CSV |
| `scripts/check-placeholders.mjs` | Lists `[bracketed]` client placeholders; `--strict` before launch |

Start: open the folder in Cursor and run `prompts/01-workspace.md`.

Design source: canvas "NEVMA Style — Shop Design" (artifact JSY6vZCbGvt8P8DMJM4eCY, live version 1794405305-bbb7; privacy and flows wording updated 11 Nov for "no Supabase").
