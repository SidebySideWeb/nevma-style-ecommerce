# Editor manual — NEVMA Style

Day-to-day guide for editors: categories, products, drops, and **orders** end to end. Written for people using Studio and Shopify Admin (not developers).

## Contents

1. [Where to work](#1-where-to-work)
2. [Who owns what](#2-who-owns-what)
3. [Correct order for a new drop](#3-correct-order-for-a-new-drop)
4. [Categories (add / edit / delete)](#4-categories-add--edit--delete)
5. [Products — Shopify walkthrough](#5-products--shopify-walkthrough)
6. [Pieces — Sanity walkthrough](#6-pieces--sanity-walkthrough)
7. [Drops and collections](#7-drops-and-collections)
8. [Orders — full walkthrough](#8-orders--full-walkthrough)
9. [Pages, photos, requests](#9-pages-photos-requests)
10. [What not to do](#10-what-not-to-do)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Where to work

| Tool | Link | Use for |
| --- | --- | --- |
| **Website** | [nevma-style.vercel.app](https://nevma-style.vercel.app) | Check the live result |
| **Sanity Studio** | [nevma-style.sanity.studio](https://nevma-style.sanity.studio) | Categories, pieces, drops, pages, photos, contact/notify |
| **Shopify Admin** | [admin.shopify.com/store/nevma-style-shop-qvt07fuj](https://admin.shopify.com/store/nevma-style-shop-qvt07fuj) | Products, prices, stock, collections, **orders**, customers |
| **Products** | […/products](https://admin.shopify.com/store/nevma-style-shop-qvt07fuj/products) | Add / edit products |
| **Collections** | […/collections](https://admin.shopify.com/store/nevma-style-shop-qvt07fuj/collections) | Drop collections (`style-001`, …) |
| **Inventory** | […/products/inventory](https://admin.shopify.com/store/nevma-style-shop-qvt07fuj/products/inventory) | Stock per size |
| **Orders** | […/orders](https://admin.shopify.com/store/nevma-style-shop-qvt07fuj/orders) | Pack, fulfil, refund |
| **Customers** | […/customers](https://admin.shopify.com/store/nevma-style-shop-qvt07fuj/customers) | Shopify customer records |
| **Sanity Connect** | Shopify → **Apps** → Sanity Connect | Syncs products/collections into Studio (read-only copies) |

After you **Publish** in Sanity, the site usually updates within about a minute (revalidate webhook). Hard-refresh the page to check.

---

## 2. Who owns what

| Data | System |
| --- | --- |
| Category pages and chips | **Sanity only** (no Shopify “category”) |
| Product title, handle, price, sizes, stock, Headless publish | **Shopify** |
| Story, photos, drop copy, SEO, size-guide table text | **Sanity** |
| Orders, payments, fulfilment, refunds | **Shopify** (+ **Viva** for payment) |
| Contact / notify-me / newsletter | **Sanity** (Requests) |

**Golden rule:** one colourway = **one Shopify product** = **one Sanity piece**. The piece **handle** must equal the Shopify product handle. URL = `https://nevma-style.vercel.app/pieces/<handle>`.

**Never type prices or stock into Sanity.** The site reads them live from Shopify.

---

## 3. Correct order for a new drop

Do these steps in order. Wrong order is the usual reason pieces stay “coming” or become buyable too early.

```text
1. Category in Sanity          (if new)
2. Drop in Sanity              (code, slug, opensAt)
3. Products in Shopify         (draft / off Headless until open)
4. Collection in Shopify       (e.g. style-003) + add products
5. Wait for Sanity Connect     (products + collection appear in Studio)
6. Piece documents in Sanity   (link product, drop, category, copy, photos)
7. On the Drop: link collection + order the pieces list
8. Home / Site settings        (announcement / next-drop if needed)
9. Publish everything in Sanity
10. At opensAt: publish products to the Headless channel in Shopify
```

---

## 4. Categories (add / edit / delete)

Categories live **only in Sanity**. They power `/categories/<slug>` and the filter chips (Tees, Outerwear, …).

### Add a category

1. Open [Studio](https://nevma-style.sanity.studio) → **Categories** → Create.
2. Fill:

   | Field | Example | Notes |
   | --- | --- | --- |
   | Name | `Silk` | Big title on the page |
   | Slug | `silk` | Generate from name → `/categories/silk` |
   | Order | `4` | Chip order (1 = first) |
   | Intro | Short paragraph | Shown next to / under the title |
   | Coming text | Optional | When the category has no live piece yet |

3. **Publish**.
4. Check [nevma-style.vercel.app/categories/silk](https://nevma-style.vercel.app/categories/silk) (use your slug).

### Edit a category

1. Studio → **Categories** → open the document.
2. Change name, intro, order, etc.
3. Changing the **slug** changes the URL — update any bookmarks/links.
4. **Publish** → hard-refresh the site.

### Delete a category

1. Open every **Piece** in that category and move it to another category (or unpublish those pieces).
2. Then delete the category document.
3. Do **not** delete while pieces still reference it.

---

## 5. Products — Shopify walkthrough

### 5.1 Add a product

1. Go to [Products → Add product](https://admin.shopify.com/store/nevma-style-shop-qvt07fuj/products/new).
2. **Title** — same words you will use in Sanity, e.g. `Definition Tee · White`.
3. **Description** — optional in Shopify; the site’s long copy comes from Sanity.
4. **Media** — optional here; the Style site gallery is managed in Sanity.
5. **Category** (Shopify’s own product taxonomy) — optional for Shopify reports; it does **not** drive the Style category pages. Style categories are Sanity-only (§4).
6. **Price** — EUR. Use the agreed VAT-inclusive amount.
7. **Inventory**
   - Track quantity: **on**
   - Location: your main location
   - **Continue selling when out of stock: off**
   - Set quantity **per size** so the **total** ≤ edition size (usually 5 for the whole colourway).
8. **Variants / options**
   - Option name: **Size**
   - Values: `S`, `M`, `L`, `XL` (or one value for accessories such as a cap)
   - These labels must match the Sanity size guide later.
9. **SKU** — optional but useful (e.g. `NS-001-TEE-WHT-M`).
10. **Search engine listing** → Edit website SEO → **URL and handle**
    - Handle e.g. `definition-tee-white`
    - This **must** become the Sanity piece handle.
11. **Metafields** (namespace `nevma`, if configured on the store):
    - `edition_size` → `5` (integer)
    - `number` → archive N° (optional)
    - `drop` → e.g. `STYLE 001`
12. **Sales channels / publishing**
    - **Coming drop:** do **not** publish to the **Headless** channel yet (leave draft or Headless unchecked).
    - **Live drop:** publish to **Headless**.
13. **Collections** — add to the drop collection (e.g. `STYLE 001` / handle `style-001`).
14. **Save**.
15. Wait for **Sanity Connect** — Studio → **Shopify (synced)** → **Products** should show the new product.

### 5.2 Edit a product

| You want to change… | Do this in Shopify |
| --- | --- |
| Price | Product → Price → Save |
| Stock | [Inventory](https://admin.shopify.com/store/nevma-style-shop-qvt07fuj/products/inventory) or product → variants → quantities |
| Available sizes | Variants: add/remove size values; set qty `0` for sold sizes |
| Title | Change title → then update the Sanity piece **title** to match |
| Handle / URL | SEO handle → then update Sanity piece **handle** to match (or site links break) |
| Publish / unpublish on the site | Product → sales channels → **Headless** on/off |
| Which drop collection | Product → Collections |

After stock or publish changes, wait about a minute and refresh the piece page. Stock sentences (“3 of 5 left”, “Sold out”) update from Shopify automatically.

### 5.3 Retire or remove a product

1. Prefer: set all variant quantities to **0**, and/or remove from **Headless** (site shows sold out / not buyable).
2. Keep the Shopify product for order history.
3. In Sanity, keep the piece for archive copy, or unpublish it from public lists.
4. Avoid hard-deleting products that already have orders.

---

## 6. Pieces — Sanity walkthrough

A **piece** is the editorial document for one colourway. It must link to the Shopify product.

### 6.1 Add a piece (after the product exists in Connect)

1. Studio → **Pieces** → Create.
2. Fill **Main**:

   | Field | Notes |
   | --- | --- |
   | Title | Same as Shopify title |
   | Shopify product | Pick the synced product |
   | Handle | Generate/copy — **must equal** Shopify handle |
   | N° | Archive number (1, 2, 3…) |
   | Drop | Required |
   | Category | Required (Sanity category) |
   | Colour / swatch / reference | Display + internal ref |
   | Other colourways | Other piece refs (each colour = its own product) |
   | Card story | Short line for cards |

3. **Details** — lead, body, facts, size guide, care.
4. **Photos and film** — gallery (ideally 3 slots); optional card photo and film.
5. **Related** — “wear with” optional.
6. Fix any Studio warning that the handle ≠ Shopify handle.
7. **Publish**.
8. Open the **Drop** → add this piece to the **Pieces** list (display order).
9. Check `/pieces/<handle>` on the site.

### 6.2 Edit a piece

| Change | Where |
| --- | --- |
| Photos, story, facts, SEO, size-guide table | Sanity piece → Publish |
| Price / stock / Headless | Shopify product (§5.2) |
| Category chip membership | Sanity piece → Category field |
| Drop membership (editorial list) | Sanity Drop → Pieces array **and** Shopify collection |

### 6.3 Coming vs buyable (automatic)

| Site shows | When |
| --- | --- |
| Coming, no price, notify | Before `drop.opensAt`, **or** product not on Headless |
| Price + Add to bag | Product on Headless **and** drop has opened **and** stock &gt; 0 |
| Last piece / sold out | From live Shopify quantities |

---

## 7. Drops and collections

### 7.1 Add a drop (Sanity)

1. Studio → **Drops** → Create.
2. Code e.g. `STYLE 003`, name, slug, **Opens / released at** (London time on the site).
3. Set **Shopify collection handle** e.g. `style-003`.
4. Add summary / intro / notes as needed.
5. Publish (pieces list can be filled after pieces exist).

### 7.2 Add the Shopify collection

1. [Collections → Create](https://admin.shopify.com/store/nevma-style-shop-qvt07fuj/collections).
2. Manual collection; title `STYLE 003`; handle **`style-003`**.
3. Add the drop’s products.
4. Save → wait for Connect → on the Sanity Drop, pick **Shopify collection**.

### 7.3 Open the drop (go live)

1. Sanity `opensAt` = go-live time.
2. Shopify: publish each product to **Headless** at that same time (schedule or do it live).
3. Confirm collection membership and Sanity piece links.
4. Refresh the drop and piece pages — buy box should appear; notify/countdown for those pieces should stop.

---

## 8. Orders — full walkthrough

Orders live **only in Shopify**. Sanity does not store orders. Payment is **Viva** inside Shopify Checkout.

### 8.1 What the customer experiences

1. On the Style site they choose a **size** and **Add to bag** (quantity is always 1; one of each colourway).
2. Bag → **Checkout** → they leave the Style site for **Shopify Checkout** (branded).
3. They pay with **Viva** (Smart Checkout).
4. Shopify shows the **order status / thank-you** page. “Continue shopping” returns to the Style site.
5. If they have a Style account (Shopify new customer accounts), they can open [Account → Orders](https://nevma-style.vercel.app/account/orders) later and see the same order (read from Shopify).

**Note:** A bag does not reserve stock. If the last unit sells while someone still has it in the bag, that line is removed and they see a “sold while in bag” notice.

**Note:** Shopify Basic cannot hard-block a second checkout for the same piece. The site cart enforces one-per-colourway; extras may be **cancelled** under the Terms if needed.

### 8.2 When a new order appears

1. Open [Orders](https://admin.shopify.com/store/nevma-style-shop-qvt07fuj/orders).
2. Open the order (e.g. `#1001`).
3. Check:
   - Payment status (paid via Viva)
   - Line items: product title, **size**, quantity `1`
   - Shipping address and method
   - Customer email / account
4. Inventory for those variants was already reduced by Shopify when the order was placed.

### 8.3 Packing (edition numbers)

Each colourway is an edition of five (unless you set another `edition_size`). At packing you assign the physical **N°** for that unit.

1. Pick the garment / object for that line and size.
2. Hand-number it (or use your packing card) with the next free number for that colourway (1–5).
3. Record the number on the order:
   - Preferred: order metafield **`nevma.numbers`** — JSON map of line item id → number, e.g. `{ "gid://shopify/LineItem/123": 3 }`  
     (Exact UI depends on how the metafield is registered in Admin; if you do not see it yet, keep numbers on a packing sheet until ops enables it — see OPEN-QUESTIONS Q3.)
4. Include the signed card / packaging as per NEVMA process.

### 8.4 Fulfil the order

1. On the order → **Fulfill item(s)**.
2. Enter tracking number / carrier if you have one.
3. Customer gets Shopify’s shipping notification (and can see status on the order status page / account orders).
4. Mark remaining items fulfilled when the whole order is shipped.

### 8.5 Refunds and cancellations

1. Open the order → **Refund** or **Cancel**.
2. Choose whether to restock. For true limited editions, restock only if the unit returns to sellable inventory and you intend to sell it again (usually you do **not** restock a damaged return as a new edition number).
3. Viva/Shopify handle the money movement according to the payment capture.
4. If someone placed a duplicate order for the same colourway, cancel the extra per Terms and message the customer.

### 8.6 Customer asks about an order

| Channel | What to do |
| --- | --- |
| Email / phone | Look up the order in [Shopify Orders](https://admin.shopify.com/store/nevma-style-shop-qvt07fuj/orders) by name, email, or order number |
| Site Contact form | Studio → **Requests and customers** → Contact messages (may include an order number field) — reply and set status |
| Signed-in site account | They already see order status from Shopify; you still manage fulfilment in Admin |

### 8.7 What never happens in Sanity for orders

- No “create order” in Studio.
- No editing payment or fulfilment in Studio.
- Stock corrections after a mistake → Shopify **Inventory**, not Sanity.

---

## 9. Pages, photos, requests

### Pages (Sanity)

| Studio item | Site |
| --- | --- |
| Home | `/` |
| Story | `/story` |
| Shop pages | All pieces intro, bag, account, wishlist, 404 |
| Site settings | Announcement, nav, footer, defaults |
| Client care + policy pages | `/client-care/*`, `/legal/*` |

Publish after edits. No product prices in these fields.

### Photos

Each slot is either a real image (alt required) or a **placeholder** label + tone until the shoot is ready.

### Requests (not orders)

Studio → **Requests and customers**: contact, notify-me, newsletter. Set status / notes on contact messages.

---

## 10. What not to do

- Do not edit documents under Studio → **Shopify (synced, read-only)**.
- Do not put prices or “3 of 5 left” into Sanity.
- Do not change a live handle in only one system.
- Do not publish a future drop’s products to Headless before `opensAt`.
- Do not delete a category or drop that pieces still reference.
- Do not treat Sanity contact requests as Shopify orders.

---

## 11. Troubleshooting

| Symptom | Likely fix |
| --- | --- |
| Category page missing | Create/publish category in Sanity; check slug |
| Piece 404 | Publish Sanity piece; handle must match URL |
| Always “coming” | Publish product to **Headless**; check `opensAt` is past |
| Buyable too early | Remove from Headless until drop time |
| Wrong / missing price | Shopify price + Headless publish; wait ~1 min |
| Wrong stock text | Fix [Inventory](https://admin.shopify.com/store/nevma-style-shop-qvt07fuj/products/inventory) |
| Product missing in Studio | Open Sanity Connect app → sync |
| Copy not on site | Click **Publish** in Sanity; hard-refresh |
| Order not in Studio | Expected — orders are Shopify-only |
| Customer can’t see order on site | They must be signed in with the same customer account; order must exist in Shopify |

---

## Related docs (technical)

- [CONTENT-MODEL.md](./CONTENT-MODEL.md) — Sanity fields  
- [COMMERCE.md](./COMMERCE.md) — Shopify + Viva setup  
- [PAGES.md](./PAGES.md) — routes  
- [DEPLOY.md](./DEPLOY.md) — launch / env  
