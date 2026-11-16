# Editor manual — NEVMA Style

How to add, change and remove content so the shop stays in sync. Written for editors (not developers).

## Where to work

| Tool | Link | What you do here |
| --- | --- | --- |
| **Website** | [nevma-style.vercel.app](https://nevma-style.vercel.app) | Check the live result after publish |
| **Sanity Studio** | [nevma-style.sanity.studio](https://nevma-style.sanity.studio) | Words, photos, drops, categories, pages, requests |
| **Shopify Admin** | [admin.shopify.com/store/nevma-style-shop-qvt07fuj](https://admin.shopify.com/store/nevma-style-shop-qvt07fuj) | Products, prices, stock, collections, orders, checkout |
| **Sanity Connect** | Shopify → Apps → Sanity Connect | Keeps Shopify products/collections mirrored into Studio (read-only copies) |

**Rule of thumb**

- **Shopify** = what you can buy: product, handle, price, sizes, inventory, when it goes live on the Headless channel.
- **Sanity** = what people read and see: copy, photos, drop pages, categories, story, client care.
- **Never type prices or stock into Sanity.** They always come from Shopify at request time.

One colourway = **one Shopify product** = **one Sanity piece**. The piece’s **handle** must match the Shopify product handle (URL = `/pieces/<handle>`).

---

## Correct order (new drop / products)

Do the steps in this order. Skipping steps is what breaks “coming” vs buyable states.

```text
1. Category in Sanity          (if it does not exist yet)
2. Drop in Sanity              (code, slug, opensAt — even before products)
3. Products in Shopify         (draft / not on Headless until open)
4. Collection in Shopify       (manual collection per drop, e.g. style-003)
5. Wait for Sanity Connect     (product + collection appear under Shopify in Studio)
6. Piece documents in Sanity   (link product, drop, category, copy, photos)
7. Link drop ↔ collection      (in the Drop document)
8. Site settings / Home        (announcement, hero, next-drop teaser if needed)
9. Publish in Sanity
10. At drop time: publish products to Headless in Shopify at the same moment as opensAt
```

### Why this order

- Sanity can show a **coming** piece (no price, notify form) before Shopify is buyable.
- The site only becomes **buyable** when the product is published to the **Headless** sales channel.
- `opensAt` in Sanity and the Shopify publish schedule must be the **same** London time.

---

## 1. Categories (Sanity only)

Studio → **Categories**.

| Field | Notes |
| --- | --- |
| Name | Shown as the big title (e.g. Tees, Outerwear) |
| Slug | URL `/categories/<slug>` — generate from name |
| Order | Chip order (1, 2, 3…) |
| Intro | Body copy under / next to the title |
| Coming text | Used when the category has no live piece yet |

**Add:** Create → fill fields → Publish.  
**Edit:** Open → change → Publish. Site updates via the revalidate webhook (usually within a minute).  
**Delete:** Only if no pieces still reference it. Reassign those pieces first, then delete.

There is **no** Shopify category type — chips and pages are Sanity-only.

---

## 2. Drops (Sanity + Shopify collection)

### In Sanity — Studio → Drops

| Field | Notes |
| --- | --- |
| Code | e.g. `STYLE 003` |
| Name | e.g. Signal |
| Slug | From code → `/drops/style-003` |
| Opens / released at | **Critical.** Countdown, “coming”, announcement. Europe/London on the site |
| Shopify collection handle | e.g. `style-003` until Connect syncs |
| Shopify collection | Pick the synced collection once it appears |
| Summary / intro / pieces / notes | Drop page and home teaser copy |
| Pieces | Ordered list of piece refs (N° 01, 02, …) |

### In Shopify — Collections

1. Products → **Collections** → Create collection.
2. Title e.g. `STYLE 003`, handle **`style-003`** (must match Sanity).
3. Manual collection; add the drop’s products when they exist.
4. Save. Sanity Connect creates a read-only `collection` in Studio.

**Edit drop copy:** Sanity only.  
**Edit which products are in the drop commercially:** Shopify collection + Sanity drop `pieces` list.  
**Delete a drop:** Remove or reassign pieces first; unpublish/archive related Shopify products carefully (sold history stays in Shopify).

---

## 3. Products / pieces (Shopify then Sanity)

### A. Create the product in Shopify

1. **Products** → Add product.
2. **Title** = piece title, e.g. `Definition Tee · White` (same wording you will use in Sanity).
3. **Handle** (Search engine listing → Edit website SEO): e.g. `definition-tee-white` — this becomes `/pieces/definition-tee-white`.
4. Option **Size** only (S / M / L / XL, or one value for accessories). Values must match the Sanity size guide.
5. **Inventory:** track quantity, one location, **do not** continue selling when out of stock. Set real counts (edition total ≤ edition size, usually 5).
6. **Price** in EUR (VAT-inclusive wording as agreed).
7. Metafields (namespace `nevma` — expose to Storefront if asked by a developer):
   - `edition_size` — integer, default `5`
   - `number` — archive N° (optional mirror of Sanity)
   - `drop` — e.g. `STYLE 001`
8. Sales channels: for a **future** drop, keep the product **off** the Headless channel (or draft) until `opensAt`. For a live drop, publish to **Headless**.
9. Add the product to the drop’s **collection**.
10. Save. Wait for **Sanity Connect** to show it under Studio → Shopify → Products.

Useful admin paths:

- All products: [Products](https://admin.shopify.com/store/nevma-style-shop-qvt07fuj/products)
- Collections: [Collections](https://admin.shopify.com/store/nevma-style-shop-qvt07fuj/collections)
- Inventory: [Inventory](https://admin.shopify.com/store/nevma-style-shop-qvt07fuj/products/inventory)

### B. Create / link the piece in Sanity

Studio → **Pieces** → Create (or open the draft).

| Field | Notes |
| --- | --- |
| Title | Same as Shopify title |
| Shopify product | Pick the synced product (required once it exists) |
| Handle | **Must equal** Shopify handle |
| N° | Archive number across all drops |
| Drop / Category | Required refs |
| Colour, swatch, reference | Display + SKU-style ref |
| Other colourways | Other piece refs (each colour is its own product) |
| Card story, lead, body, facts, size guide, care | Editorial |
| Gallery | Prefer 3 photo slots; first feeds cards if no card photo |
| Card photo | Optional override for lists/cards |
| Wear with | Optional styled photo + up to 2 pieces |

Studio warns if the piece handle ≠ Shopify handle — fix the handle, do not “force” a mismatch.

**Publish** the piece and ensure it appears on the Drop’s `pieces` list.

### C. Edit later

| Change | Where |
| --- | --- |
| Price, stock, sizes available | **Shopify** only |
| Title / handle | Shopify first, then match Sanity handle + title |
| Photos, story, facts, SEO | **Sanity** |
| Sold out / last piece / available | Automatic from Shopify stock + drop date |
| Coming / notify | Automatic while unpublished on Headless or before `opensAt` |

### D. Delete / retire a piece

1. Prefer **unpublish** from Headless and set inventory to 0 rather than hard-delete (orders and history stay clean).
2. In Sanity, unpublish or remove from drop lists; keep the document if you still want archive copy.
3. Never edit the read-only **Shopify (synced)** documents by hand — change Shopify and let Connect update them.

---

## 4. Opening a drop (go-live checklist)

1. Sanity `drop.opensAt` = intended London time.
2. Shopify: schedule **publish to Headless** for each product at the same time (or publish manually at that moment).
3. Collection contains every product of the drop.
4. Each Sanity piece linked to its product, with gallery/copy ready.
5. Home / Site settings announcement points at the right drop if needed.
6. After open: hard-refresh the site — prices and Add to bag should appear; countdown / notify should stop for those pieces.

---

## 5. Pages and site-wide copy (Sanity)

Studio sidebar:

| Item | Feeds |
| --- | --- |
| **Home** | `/` |
| **Story** | `/story` |
| **Shop pages** | All pieces intro, bag, account, wishlist, 404 texts |
| **Site settings** | Announcement, nav, footer, piece defaults, notify strings, SEO defaults |
| **Client care page** | FAQ + contact shell |
| **Policy and legal pages** | Shipping, returns, terms, privacy, cookies |

**Publish** after edits. Do not put product prices in these fields.

---

## 6. Photos

Each photo slot can be:

- a real image (alt text required; optional crop/hotspot and `position` like `center 42%`), or  
- a **placeholder** label + tone (black / ink / ink2 / bone) → site shows `[Photo · …]` until you upload.

For upcoming STYLE pieces it is normal to leave placeholders until shoot day.

---

## 7. Orders, packing, requests

| Task | Where |
| --- | --- |
| Orders, refunds, fulfilment | [Shopify Orders](https://admin.shopify.com/store/nevma-style-shop-qvt07fuj/orders) |
| Edition number on a line (packing) | Shopify order metafield `nevma.numbers` (when enabled) |
| Contact / notify / newsletter | Studio → **Requests and customers** |
| Wishlist / drop-alert prefs | Studio → Customers (site-written; do not invent rows) |

Contact messages: set status (e.g. new → replied) and internal notes in Studio.

---

## 8. What not to do

- Do not create or edit documents under **Shopify (synced, read-only)** in Studio.
- Do not put EUR prices or “3 of 5 left” into Sanity fields — the site computes those.
- Do not change a live handle without updating both Shopify SEO handle and the Sanity piece handle.
- Do not publish a future drop’s products to Headless early — they will become buyable before the story says so.
- Do not delete a category or drop that pieces still reference.

---

## 9. Quick “is it broken?” checks

| Symptom | Likely cause |
| --- | --- |
| Piece page 404 | Missing/unpublished Sanity piece or wrong handle |
| Always “coming”, never buyable | Product not on Headless, or `opensAt` still in the future |
| Buyable too early | Published to Headless before `opensAt` |
| No price | Upcoming state (expected) or product not linked / not on channel |
| Wrong stock text | Shopify inventory; wait a minute after stock change |
| Studio product missing | Sanity Connect not synced — open the app / re-sync |
| Copy not on site | Forgot **Publish** in Sanity, or webhook delay — refresh after ~1 min |

---

## 10. Related technical docs (optional)

- [CONTENT-MODEL.md](./CONTENT-MODEL.md) — field-level Sanity model  
- [COMMERCE.md](./COMMERCE.md) — Shopify + Viva setup  
- [PAGES.md](./PAGES.md) — which route shows which content  
- [DEPLOY.md](./DEPLOY.md) — environments and launch checklist  
