# Content model (Sanity)

Studio: `apps/studio` (Sanity 6.23.0). Validated: `sanity schema validate` 0 errors / 0 warnings, `tsc` clean, `sanity build` passes. Seed: `seed/nevma-style-seed.tar.gz` (22 documents, 10 photos; the design copy word for word) — check with `pnpm --filter studio check-seed`, import with `pnpm --filter studio seed`.

**Rule:** Sanity holds words, photos, film and links. Prices, sizes and stock always come from Shopify (docs/COMMERCE.md). Fixed interface wording (button labels, aria text, stock sentences, form labels) lives in `apps/web/src/content/ui.ts`, taken from `design/build/text.json`.

## Singletons (fixed IDs)
| ID | Feeds | Main fields |
|---|---|---|
| `siteSettings` | every page | announcement (drop ref, link label) · mainNav · menuExtra · footer (tagline, newsletter, links, definition, closing line, legal links, payment note, copyright with {year}) · services strip · pieceDefaults (edition, delivery, payment texts, buy note, delivery line, keep-exploring cards, default film) · notify texts · client-care email · studio line · Music/Moments/Instagram URLs · SEO |
| `homePage` | `/` | hero (drop, title lines, intro, stat suffix, CTA labels, hero piece, photo) · pieces (title, link label) · next (drop, background, 3 teaser slots) · rules (title + muted part, 4 items) · story teaser · world (title, 2 cards) · SEO |
| `storyPage` | `/story` | hero · belief · 2 chapters (italic word allowed) · process steps · materials (text, 3 items, photo) · pillars (3, one marked "this site") · closing |
| `clientCarePage` | `/client-care/*`, `/legal/*` | eyebrow, title · FAQ (title, meta, Q&A) · contact (title, meta, intro, topics, privacy note, sent message, inbox) |
| `shopPages` | `/pieces`, `/bag`, `/account*`, `/wishlist`, 404 | all pieces title/intro · bag notes, sold-while-in-bag text ({piece}), empty state ({drop} {left} {nextDrop} {nextDate}), drawer note ({leftWords}) · account notes, benefits, photo, delete note · wishlist texts · 404 |

## Collections
| Type | ID pattern | Fields |
|---|---|---|
| `drop` | `drop-style-001` | code, name, slug, opensAt, collection (weak ref to the synced collection), shopifyCollectionHandle (until synced), summary (Home teaser), intro (italic allowed), pieces (ordered refs), definition band (word, pos, meaning, image), notes intro + notes (accordion), SEO |
| `piece` | `piece-<handle>` | title, **product (weak ref to the synced Shopify product; warning if its handle differs)**, **handle (= Shopify handle, = URL)**, number (N°), drop, category, colour, swatch, otherColours, reference, cardStory, lead, body, facts, sizeGuide (unit, sizes, rows), care, editionText override, gallery (photo slots), cardPhoto, film, wearWith (photo + ≤ 2 pieces), phase1State, SEO |
| `category` | `category-<slug>` | name, slug, order, intro, comingText, SEO |
| `product`, `productVariant`, `collection` | `shopifyProduct-<id>` … | **Written by Sanity Connect, read-only.** All data under `store` (title, slug = handle, status, isDeleted, priceRange, options, variants, metafields, shop.domain; variant: sku, price, option1–3, inventory.isAvailable). No stock quantities. Never created or edited by hand. |
| `formSubmission` | `submission.<uuid>` | **Written by the site.** Notify-me, contact and newsletter requests (see COMMERCE.md §7). Staff set status and notes. |
| `customerProfile` | `customer.<shopify id>` | **Written by the site.** Wishlist (weak refs to pieces) and drop-alert / Moments preferences per signed-in customer. |
| `alertLog` | `alert.<kind>.<slug>` | **Written by the site.** One per alert sent (last piece, drop open), so nothing is sent twice. |
| `infoPage` | `info-<slug>` | title, slug (shipping, returns · terms, privacy, cookies), section (care/legal), order, meta, body (prose: paragraph, h3, bullets, italic/bold, links, notice box, table with optional button), SEO |

### `photo` object
A slot that is either a real image (hotspot, alt required, `position` = the design's object-position such as "center 42%", optional `zoom` for the print close-up) or a designed placeholder (`placeholder` label → "[Photo · worn, on model]", `tone` black/ink/ink2/bone). The renderer reproduces the design's placeholder markup exactly while no image is set.

## What is computed, not stored
State of a piece and every stock sentence (Shopify + drop date), drop eyebrows ("Released 2 Oct 2026" / "Opens …"), counts in chips and eyebrows ("2 drops · 6 pieces · 30 numbered", "3 pieces · 2 available"), countdowns, previous/next drop, the announcement text, bag and wishlist counts.

## GROQ (shape, in `apps/web/src/lib/sanity/queries.ts`)
```groq
*[_type == "piece" && handle.current == $handle][0]{
  title, "handle": coalesce(product->store.slug.current, handle.current), "shopify": product->store{status, isDeleted, gid}, number, colour, swatch, reference, cardStory, lead, body, facts, sizeGuide, care,
  "editionText": coalesce(editionText, *[_id == "siteSettings"][0].pieceDefaults.editionText),
  gallery[]{..., image{asset->{_id, url, metadata{dimensions, lqip}}, hotspot, crop}},
  drop->{code, name, "slug": slug.current, opensAt}, category->{name, "slug": slug.current},
  otherColours[]->{title, "handle": handle.current, swatch, colour},
  film, wearWith{photo, pieces[]->{title, "handle": handle.current, drop->{code, opensAt}, gallery[0], cardPhoto}},
  phase1State, seo
}
```

## Webhook
Filter out site-written types: `!(_type in ["formSubmission", "customerProfile", "alertLog"])`.
Also include `product` and `collection` (synced by Sanity Connect): product → the piece that references it (`*[_type=="piece" && product._ref==$id]`) and its drop/category pages.
Sanity → `POST /api/revalidate` (projection `{_type, _id, "slug": coalesce(slug.current, handle.current)}`, secret header). Map: piece → its page, its drop, its category, `/pieces`, `/`; drop → drop page, its pieces, `/`, `/pieces`; category → its page; infoPage/clientCarePage → client-care and legal routes; siteSettings/homePage/storyPage/shopPages → all pages (full revalidate).
