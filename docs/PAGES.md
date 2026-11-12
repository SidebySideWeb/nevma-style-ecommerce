# Pages, routes and blocks

Every designed page and state, its route, the design file it must match and its blocks in order. Block ids are the `data-block` values. Built from `design/build/blocks.json`; heights are from the design at 1440 / 390 (px).

**Board** = which `css/page-<board>.css` the route loads in addition to `css/style.css`.

## Route map

| Route | Design file(s) | Board | Notes |
|---|---|---|---|
| `/` | `home.html`, `home~notified.html`, `home~menu.html` | Main | Home; Home · notify form sent; Home · phone menu open |
| `/drops/style-001` | `drop.html` | Drop | Drop · STYLE 001 |
| `/pieces/definition-tee-white` | `product.html`, `product~size.html`, `product~added.html`, `product~saved.html`, `product-last.html`, `product-sold.html`, `product-sold~notified.html` | Product | Product · available; Product · size L chosen; Product · added, bag drawer open; Product · saved to wishlist; Product · last piece; Product · sold out; Product · sold out, notify sent |
| `/pieces/suede-cap-sand` | `product-upcoming.html` | Product | Product · upcoming |
| `/pieces` | `pieces.html` | Archive | All pieces · index |
| `/pieces?view=gallery` | `pieces~gallery.html` | Archive | All pieces · gallery view |
| `/pieces?filter=available` | `pieces~available.html` | Archive | All pieces · filter available |
| `/pieces?filter=coming` | `pieces~coming.html` | Archive | All pieces · filter coming |
| `/pieces?filter=sold-out` | `pieces~sold.html` | Archive | All pieces · filter sold out |
| `/categories/tees` | `category.html` | Category | Category · Tees |
| `/categories/outerwear` | `category-outerwear.html` | Category | Category · Outerwear |
| `/categories/headwear` | `category-headwear.html` | Category | Category · Headwear |
| `/categories/silk` | `category-silk.html` | Category | Category · Silk |
| `/bag` | `bag.html`, `bag-sold.html`, `bag-empty.html` | Bag | Bag; Bag · sold while in bag; Bag · empty |
| `(reference only)` | `checkout.html`, `thank-you.html`, `payment-incomplete.html`, `viva-handoff.html`, `sign-in~code.html`, `user-flows.html` | Checkout, Flows, Payment, SignIn | Shopify checkout (branding reference); Thank you (Shopify, branding reference); Payment not completed (reference); Viva handoff (reference); Sign in · code step (Shopify-hosted, reference); User flows & data (documentation board) |
| `/account/sign-in` | `sign-in.html` | SignIn | Sign in |
| `/account/sign-in?mode=create` | `sign-in~create.html` | SignIn | Create account |
| `/account` | `account.html` | Account | Account · overview |
| `/account/orders` | `account-orders.html` | Account | Account · orders |
| `/account/addresses` | `account-addresses.html` | Account | Account · addresses |
| `/account/profile` | `account-profile.html` | Account | Account · profile and emails |
| `/wishlist` | `wishlist.html`, `wishlist-guest.html` | Wishlist | Wishlist · signed in; Wishlist · guest |
| `/story` | `story.html` | About | Story |
| `/client-care/shipping` | `care-shipping.html` | Legal | Shipping and delivery |
| `/client-care/returns` | `care-returns.html` | Legal | Returns and exchanges |
| `/client-care/faq` | `care-faq.html` | Legal | Questions |
| `/client-care/contact` | `care-contact.html`, `care-contact~sent.html` | Legal | Contact; Contact · message sent |
| `/legal/terms` | `care-terms.html` | Legal | Terms of sale |
| `/legal/privacy` | `care-privacy.html` | Legal | Privacy notice |
| `/legal/cookies` | `care-cookies.html` | Legal | Cookies |

Other routes (not designed; build from existing parts, see docs/DECISIONS.md): `/drops` → redirect to the current drop · `/categories` → first category · `/account/callback`, `/account/logout` (no UI) · `404` · `/api/*`.

Reference-only boards are configured in Shopify / Viva, not built in Astro: **checkout** (Shopify checkout editor: logo, colours, fonts, corner radius), **thank-you** (Shopify order status page), **payment-incomplete** (Shopify checkout error state after Viva), **viva-handoff** (Viva Smart Checkout branding), **sign-in~code** (Shopify hosted login), **user-flows** (documentation). See docs/COMMERCE.md.

## Blocks by page

### Home — `home.html`
Route `/` · board `Main`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | siteSettings.announcement → drop (code, name, opensAt). Hidden when disabled or no future drop. | Text "STYLE 002 · Signal · drops Fri 4 Dec, 18:00 GMT" (code+name in yellow #F0E81C). Link → the drop's notify form (/#notify on Home, else /drops/<slug>#notify). |
| 2 | `header` | 77 | 77 | siteSettings.mainNav, menuExtra; bag count = cart line count (server island); wishlist count = wishlist size. | Sticky. Phone (<768): menu button toggles #menu (.s-pop), aria-expanded, Escape closes, focus trapped. Icons: account (/account or /account/sign-in), wishlist ("Wishlist, N pieces"), bag ("Bag, N piece(s)", .s-count hidden at 0). |
| 3 | `hero` | 821 | 1180 | homePage.hero + hero drop + Shopify stock for the drop's pieces. | Eyebrow "STYLE 001 · Definition · Available now" (drop open & any stock) / "… · Sold out". "4 of 15" = Σ left / (pieces × edition). Hero card meter shows the hero piece's left count. CTAs → drop page, /story. |
| 4 | `the-pieces` | 903 | 1941 | homePage.pieces + hero drop pieces (Sanity order) + Shopify price/stock. | Eyebrow "STYLE 001 · Definition · Released 2 Oct 2026". Cards: tag (3 OF 5 LEFT / LAST PIECE / SOLD OUT on bone), grayscale photo when sold out, meter + sentence, aria-label "<name>, €85, 3 of 5 left". Link → /pieces/<handle>. |
| 5 | `signal` | 666 | 910 | homePage.next (drop, background, teaser slots) + drop.summary + siteSettings.notify.homeNote. | Countdown to opensAt: days/hours/minutes/"18:00"/"GMT", ticks every 30 s, aria-label "STYLE 002 opens in 42 days, 5 hours and 0 minutes". Notify form (id notify) → /api/notify {drop}; success swaps the button to "You’re on the list" (state home~notified). Hidden when there is no future drop. |
| 6 | `five-then-never-again` | 489 | 1094 | homePage.rules. | Static. |
| 7 | `story-teaser` | 663 | 765 | homePage.story. | Link → /story. |
| 8 | `the-world-of-nevma` | 706 | 817 | homePage.world.cards. | External links (new tab, rel="noopener"), aria-label from the card. |
| 9 | `footer` | 483 | 854 | siteSettings.footer; newsletter form → /api/subscribe (Sanity formSubmission, form=newsletter). | Two link columns filled in pairs; external links get " ↗". {year} in copyright = current year (London). |

### Home · notify form sent — `home~notified.html`
Route `/` · board `Main`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `hero` | 821 | 1180 | (as above) | (as above) |
| 4 | `the-pieces` | 903 | 1941 | (as above) | (as above) |
| 5 | `signal` | 666 | 910 | (as above) | (as above) |
| 6 | `five-then-never-again` | 489 | 1094 | (as above) | (as above) |
| 7 | `story-teaser` | 663 | 765 | (as above) | (as above) |
| 8 | `the-world-of-nevma` | 706 | 817 | (as above) | (as above) |
| 9 | `footer` | 483 | 854 | (as above) | (as above) |

### Home · phone menu open — `home~menu.html`
Route `/` · board `Main`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | – | 84 | (as above) | (as above) |
| 2 | `header` | – | 364 | (as above) | (as above) |
| 3 | `hero` | – | 1180 | (as above) | (as above) |
| 4 | `the-pieces` | – | 1941 | (as above) | (as above) |
| 5 | `signal` | – | 910 | (as above) | (as above) |
| 6 | `five-then-never-again` | – | 1094 | (as above) | (as above) |
| 7 | `story-teaser` | – | 765 | (as above) | (as above) |
| 8 | `the-world-of-nevma` | – | 817 | (as above) | (as above) |
| 9 | `footer` | – | 854 | (as above) | (as above) |

### Drop · STYLE 001 — `drop.html`
Route `/drops/style-001` · board `Drop`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `breadcrumb` | 46 | 46 | Route. | Home / Drops / STYLE 001 (drop) · Home / All pieces / Tees (category). |
| 4 | `drop-intro` | 576 | 839 | drop (code, name, opensAt, intro) + Shopify stock. | Eyebrow "Drop · Released Friday 2 October 2026" (past) / "Drop · Opens Friday 4 December 2026, 18:00 GMT" (future). Stats: Pieces 03 · Edition 5 each · Left 04 of 15. |
| 5 | `drop-pieces` | 2605 | 2975 | drop.pieces (order) + piece.cardStory + Shopify. | Alternating layout (odd: photo left; even: photo right) exactly as the design. Status line: "3 of 5 left" / "Last piece of five" / "Sold out · in the archive"; size sentence from per-size stock (docs/COMMERCE.md). Sold-out CTA "See it in the archive" (outline) → /pieces?filter=sold-out. |
| 6 | `the-definition` | 460 | 460 | drop.definition. | Static band. |
| 7 | `drop-notes` | 542 | 627 | drop.notesIntro, drop.notes. | <details> accordion, first open, exactly as designed. |
| 8 | `other-drops` | 219 | 349 | Previous/next drop by opensAt. | "← All drops / The archive" → /pieces. Next drop link shown only when one exists. |
| 9 | `footer` | 483 | 854 | (as above) | (as above) |

### Product · available — `product.html`
Route `/pieces/definition-tee-white` · board `Product`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `piece` | 840 | 1226 | piece (Sanity) + Shopify product (price, variants, quantityAvailable) + drop. | Gallery (3 slots, scroll-snap on phone, thumbnails on desktop). Buy box: wishlist toggle (aria-pressed, "Save to wishlist"/"Remove from wishlist"), meter + stock line, colour swatches (other colourways link to their piece), size chips (sold-out sizes: class out, aria-disabled, "S, sold out"/"M, last one"/"L, 2 left"), size note, Add button disabled until a size is chosen ("Select a size" → "Add to bag · €85"), notes. Sold out: notify form instead of buy ("Hear first about the next drop"). Upcoming: price line "Price revealed at the drop", dashed meter, countdown, notify form with letter opt-in + Turnstile note. Add → bag drawer (product~added). |
| 4 | `about-this-piece` | 629 | 946 | piece.lead/body/facts/reference/sizeGuide/care + siteSettings.pieceDefaults (delivery, edition, payment). | <details> accordions as designed ("Size and fit" open). "Contact client care" → /client-care/contact?topic=A%20piece&ref=<reference>. |
| 5 | `one-number-written-by-hand` | 1052 | 591 | piece.film or siteSettings.pieceDefaults.filmDefault. | Poster + play button; plays muted with captions when a video exists. Placeholder caption while none. |
| 6 | `wear-it-with` | 1021 | 962 | piece.wearWith (photo + up to 2 pieces) + Shopify for those pieces. | Hidden when empty. Upcoming piece card shows date + "Notify me". |
| 7 | `keep-exploring` | 619 | 1160 | siteSettings.pieceDefaults.keepExploring. | "All pieces" link → /pieces. |
| 8 | `our-services` | 202 | 591 | siteSettings.services. | Static strip. |
| 9 | `footer` | 483 | 854 | (as above) | (as above) |

### Product · size L chosen — `product~size.html`
Route `/pieces/definition-tee-white` · board `Product`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `piece` | 840 | 1226 | (as above) | (as above) |
| 4 | `about-this-piece` | 629 | 946 | (as above) | (as above) |
| 5 | `one-number-written-by-hand` | 1052 | 591 | (as above) | (as above) |
| 6 | `wear-it-with` | 1021 | 962 | (as above) | (as above) |
| 7 | `keep-exploring` | 619 | 1160 | (as above) | (as above) |
| 8 | `our-services` | 202 | 591 | (as above) | (as above) |
| 9 | `footer` | 483 | 854 | (as above) | (as above) |

### Product · added, bag drawer open — `product~added.html`
Route `/pieces/definition-tee-white` · board `Product`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `piece` | 840 | 1226 | (as above) | (as above) |
| 4 | `about-this-piece` | 629 | 946 | (as above) | (as above) |
| 5 | `one-number-written-by-hand` | 1052 | 591 | (as above) | (as above) |
| 6 | `wear-it-with` | 1021 | 962 | (as above) | (as above) |
| 7 | `keep-exploring` | 619 | 1160 | (as above) | (as above) |
| 8 | `our-services` | 202 | 591 | (as above) | (as above) |
| 9 | `footer` | 483 | 854 | (as above) | (as above) |
| 10 | `bag-scrim` | 900 | 844 | — | Overlay behind the bag drawer; click closes. |
| 11 | `bag-drawer` | 900 | 844 | Cart (after add) + shopPages.bag.drawerNote. | Dialog (role=dialog, aria-modal), focus trapped, Escape closes. "Checkout" → cart.checkoutUrl; "View bag" → /bag. Note wording: "Others can still buy this size." / "This is the last one in your size." |

### Product · saved to wishlist — `product~saved.html`
Route `/pieces/definition-tee-white` · board `Product`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `piece` | 840 | 1226 | (as above) | (as above) |
| 4 | `about-this-piece` | 629 | 946 | (as above) | (as above) |
| 5 | `one-number-written-by-hand` | 1052 | 591 | (as above) | (as above) |
| 6 | `wear-it-with` | 1021 | 962 | (as above) | (as above) |
| 7 | `keep-exploring` | 619 | 1160 | (as above) | (as above) |
| 8 | `our-services` | 202 | 591 | (as above) | (as above) |
| 9 | `footer` | 483 | 854 | (as above) | (as above) |

### Product · last piece — `product-last.html`
Route `/pieces/definition-tee-white` · board `Product`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `piece` | 840 | 1226 | (as above) | (as above) |
| 4 | `about-this-piece` | 629 | 946 | (as above) | (as above) |
| 5 | `one-number-written-by-hand` | 1052 | 591 | (as above) | (as above) |
| 6 | `wear-it-with` | 1021 | 962 | (as above) | (as above) |
| 7 | `keep-exploring` | 619 | 1160 | (as above) | (as above) |
| 8 | `our-services` | 202 | 591 | (as above) | (as above) |
| 9 | `footer` | 483 | 854 | (as above) | (as above) |

### Product · sold out — `product-sold.html`
Route `/pieces/definition-tee-white` · board `Product`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `piece` | 840 | 1079 | (as above) | (as above) |
| 4 | `about-this-piece` | 629 | 946 | (as above) | (as above) |
| 5 | `one-number-written-by-hand` | 1052 | 591 | (as above) | (as above) |
| 6 | `wear-it-with` | 1021 | 962 | (as above) | (as above) |
| 7 | `keep-exploring` | 619 | 1160 | (as above) | (as above) |
| 8 | `our-services` | 202 | 591 | (as above) | (as above) |
| 9 | `footer` | 483 | 854 | (as above) | (as above) |

### Product · sold out, notify sent — `product-sold~notified.html`
Route `/pieces/definition-tee-white` · board `Product`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `piece` | 840 | 908 | (as above) | (as above) |
| 4 | `about-this-piece` | 629 | 946 | (as above) | (as above) |
| 5 | `one-number-written-by-hand` | 1052 | 591 | (as above) | (as above) |
| 6 | `wear-it-with` | 1021 | 962 | (as above) | (as above) |
| 7 | `keep-exploring` | 619 | 1160 | (as above) | (as above) |
| 8 | `our-services` | 202 | 591 | (as above) | (as above) |
| 9 | `footer` | 483 | 854 | (as above) | (as above) |

### Product · upcoming — `product-upcoming.html`
Route `/pieces/suede-cap-sand` · board `Product`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `piece` | 840 | 1204 | (as above) | (as above) |
| 4 | `about-this-piece` | 629 | 922 | (as above) | (as above) |
| 5 | `one-number-written-by-hand` | 1052 | 591 | (as above) | (as above) |
| 6 | `wear-it-with` | 1021 | 962 | (as above) | (as above) |
| 7 | `keep-exploring` | 619 | 1160 | (as above) | (as above) |
| 8 | `our-services` | 202 | 591 | (as above) | (as above) |
| 9 | `footer` | 483 | 854 | (as above) | (as above) |

### All pieces · index — `pieces.html`
Route `/pieces` · board `Archive`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `all-pieces` | 378 | 513 | shopPages.allPieces + counts from Sanity pieces and Shopify states. | Eyebrow "2 drops · 6 pieces · 30 numbered". Filter chips (All/Available/Coming/Sold out with counts) = links ?filter=available/coming/sold-out (aria-pressed); view toggle Index/Gallery = ?view=gallery. JS switches instantly and updates the URL; live region "6 pieces shown". |
| 4 | `pieces` | 812 | 783 | All pieces (Sanity, newest N° first) + Shopify. | Index table rows or gallery cards; coming pieces have dashed meters and "—" price; sold out grayscale. Rows link to the piece. |
| 5 | `footer` | 483 | 854 | (as above) | (as above) |

### All pieces · gallery view — `pieces~gallery.html`
Route `/pieces?view=gallery` · board `Archive`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `all-pieces` | 378 | 513 | (as above) | (as above) |
| 4 | `pieces` | 1258 | 3370 | (as above) | (as above) |
| 5 | `footer` | 483 | 854 | (as above) | (as above) |

### All pieces · filter available — `pieces~available.html`
Route `/pieces?filter=available` · board `Archive`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `all-pieces` | 378 | 513 | (as above) | (as above) |
| 4 | `pieces` | 360 | 331 | (as above) | (as above) |
| 5 | `footer` | 483 | 854 | (as above) | (as above) |

### All pieces · filter coming — `pieces~coming.html`
Route `/pieces?filter=coming` · board `Archive`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `all-pieces` | 378 | 513 | (as above) | (as above) |
| 4 | `pieces` | 473 | 444 | (as above) | (as above) |
| 5 | `footer` | 483 | 854 | (as above) | (as above) |

### All pieces · filter sold out — `pieces~sold.html`
Route `/pieces?filter=sold-out` · board `Archive`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `all-pieces` | 378 | 513 | (as above) | (as above) |
| 4 | `pieces` | 247 | 218 | (as above) | (as above) |
| 5 | `footer` | 483 | 854 | (as above) | (as above) |

### Category · Tees — `category.html`
Route `/categories/tees` · board `Category`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `breadcrumb` | 46 | 46 | (as above) | (as above) |
| 4 | `category-intro` | 373 | 477 | category + counts. | Eyebrow "3 pieces · 2 available" / "Arrives Fri 4 Dec · STYLE 002". Category chips are links to /categories/<slug> (aria-current) with counts. |
| 5 | `featured-piece` | 713 | 831 | First live piece in the category (highest stock, then lowest N°). | As designed. |
| 6 | `more-in-category` | 1003 | 649 | Other live pieces in the category. | Large cards; hidden when none. |
| 7 | `from-the-archive` | 398 | 344 | Sold-out pieces in the category. | Hidden when none. |
| 8 | `footer` | 483 | 854 | (as above) | (as above) |

### Category · Outerwear — `category-outerwear.html`
Route `/categories/outerwear` · board `Category`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `breadcrumb` | 46 | 46 | (as above) | (as above) |
| 4 | `category-intro` | 373 | 448 | (as above) | (as above) |
| 5 | `coming-piece` | 733 | 867 | Upcoming piece in the category + category.comingText. | Shown when the category has no live piece. Notify → /api/notify {piece}. |
| 6 | `footer` | 483 | 854 | (as above) | (as above) |

### Category · Headwear — `category-headwear.html`
Route `/categories/headwear` · board `Category`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `breadcrumb` | 46 | 46 | (as above) | (as above) |
| 4 | `category-intro` | 373 | 448 | (as above) | (as above) |
| 5 | `coming-piece` | 733 | 867 | (as above) | (as above) |
| 6 | `footer` | 483 | 854 | (as above) | (as above) |

### Category · Silk — `category-silk.html`
Route `/categories/silk` · board `Category`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `breadcrumb` | 46 | 46 | (as above) | (as above) |
| 4 | `category-intro` | 373 | 448 | (as above) | (as above) |
| 5 | `coming-piece` | 733 | 867 | (as above) | (as above) |
| 6 | `footer` | 483 | 854 | (as above) | (as above) |

### Bag — `bag.html`
Route `/bag` · board `Bag`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `your-bag` | 781 | 1391 | Cart (Shopify) + shopPages.bag. | Lines with remove / move to wishlist (forms POST /api/cart, /api/wishlist). Sold while in bag: line kept greyed once with "Sold out while in your bag", removed from totals and from the Shopify cart, notice at top (bag-sold). Empty state (bag-empty). "Checkout securely" → cart.checkoutUrl (re-validates stock first). |
| 4 | `footer` | 483 | 854 | (as above) | (as above) |

### Bag · sold while in bag — `bag-sold.html`
Route `/bag` · board `Bag`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `your-bag` | 914 | 1646 | (as above) | (as above) |
| 4 | `footer` | 483 | 854 | (as above) | (as above) |

### Bag · empty — `bag-empty.html`
Route `/bag` · board `Bag`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `your-bag` | 549 | 664 | (as above) | (as above) |
| 4 | `footer` | 483 | 854 | (as above) | (as above) |

### Shopify checkout (branding reference) — `checkout.html` (reference only)
Route `—` · board `Checkout`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `header` | 77 | 77 | siteSettings.mainNav, menuExtra; bag count = cart line count (server island); wishlist count = wishlist size. | Sticky. Phone (<768): menu button toggles #menu (.s-pop), aria-expanded, Escape closes, focus trapped. Icons: account (/account or /account/sign-in), wishlist ("Wishlist, N pieces"), bag ("Bag, N piece(s)", .s-count hidden at 0). |
| 2 | `checkout` | 1671 | 2623 | see snippet | as designed |

### Thank you (Shopify, branding reference) — `thank-you.html` (reference only)
Route `—` · board `Payment`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `header` | 77 | 77 | siteSettings.mainNav, menuExtra; bag count = cart line count (server island); wishlist count = wishlist size. | Sticky. Phone (<768): menu button toggles #menu (.s-pop), aria-expanded, Escape closes, focus trapped. Icons: account (/account or /account/sign-in), wishlist ("Wishlist, N pieces"), bag ("Bag, N piece(s)", .s-count hidden at 0). |
| 2 | `thank-you-alex` | 986 | 1775 | see snippet | as designed |

### Payment not completed (reference) — `payment-incomplete.html` (reference only)
Route `—` · board `Payment`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `header` | 77 | 77 | siteSettings.mainNav, menuExtra; bag count = cart line count (server island); wishlist count = wishlist size. | Sticky. Phone (<768): menu button toggles #menu (.s-pop), aria-expanded, Escape closes, focus trapped. Icons: account (/account or /account/sign-in), wishlist ("Wishlist, N pieces"), bag ("Bag, N piece(s)", .s-count hidden at 0). |
| 2 | `h1` | 1 | 1 | see snippet | as designed |
| 3 | `div` | 149 | 218 | see snippet | as designed |
| 4 | `payment` | 90 | 90 | see snippet | as designed |
| 5 | `div-2` | 126 | 126 | see snippet | as designed |
| 6 | `a` | 56 | 56 | see snippet | as designed |
| 7 | `a-2` | 56 | 56 | see snippet | as designed |
| 8 | `p` | 21 | 42 | see snippet | as designed |

### Viva handoff (reference) — `viva-handoff.html` (reference only)
Route `—` · board `Payment`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `header` | 77 | 77 | siteSettings.mainNav, menuExtra; bag count = cart line count (server island); wishlist count = wishlist size. | Sticky. Phone (<768): menu button toggles #menu (.s-pop), aria-expanded, Escape closes, focus trapped. Icons: account (/account or /account/sign-in), wishlist ("Wishlist, N pieces"), bag ("Bag, N piece(s)", .s-count hidden at 0). |
| 2 | `the-viva-handoff` | 80 | 103 | see snippet | as designed |
| 3 | `div` | 245 | 825 | see snippet | as designed |
| 4 | `div-2` | 122 | 235 | see snippet | as designed |

### Sign in — `sign-in.html`
Route `/account/sign-in` · board `SignIn`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `auth` | 760 | 503 | shopPages.account (notes). | Tabs Sign in / Create account (?mode=create). Email form → /api/account/login → Shopify Customer Account login (login_hint = email). Create: first/last name and email prefs kept in a short-lived cookie and applied after the callback. The design's code step (sign-in~code) is Shopify's hosted page. |
| 4 | `why-have-an-account` | 760 | 481 | shopPages.account.benefits + benefitsPhoto. | Static. |
| 5 | `footer` | 483 | 854 | (as above) | (as above) |

### Create account — `sign-in~create.html`
Route `/account/sign-in?mode=create` · board `SignIn`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `auth` | 760 | 701 | (as above) | (as above) |
| 4 | `why-have-an-account` | 760 | 481 | (as above) | (as above) |
| 5 | `footer` | 483 | 854 | (as above) | (as above) |

### Sign in · code step (Shopify-hosted, reference) — `sign-in~code.html` (reference only)
Route `—` · board `SignIn`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | siteSettings.announcement → drop (code, name, opensAt). Hidden when disabled or no future drop. | Text "STYLE 002 · Signal · drops Fri 4 Dec, 18:00 GMT" (code+name in yellow #F0E81C). Link → the drop's notify form (/#notify on Home, else /drops/<slug>#notify). |
| 2 | `header` | 77 | 77 | siteSettings.mainNav, menuExtra; bag count = cart line count (server island); wishlist count = wishlist size. | Sticky. Phone (<768): menu button toggles #menu (.s-pop), aria-expanded, Escape closes, focus trapped. Icons: account (/account or /account/sign-in), wishlist ("Wishlist, N pieces"), bag ("Bag, N piece(s)", .s-count hidden at 0). |
| 3 | `auth` | 760 | 577 | shopPages.account (notes). | Tabs Sign in / Create account (?mode=create). Email form → /api/account/login → Shopify Customer Account login (login_hint = email). Create: first/last name and email prefs kept in a short-lived cookie and applied after the callback. The design's code step (sign-in~code) is Shopify's hosted page. |
| 4 | `why-have-an-account` | 760 | 481 | shopPages.account.benefits + benefitsPhoto. | Static. |
| 5 | `footer` | 483 | 854 | siteSettings.footer; newsletter form → /api/subscribe (Sanity formSubmission, form=newsletter). | Two link columns filled in pairs; external links get " ↗". {year} in copyright = current year (London). |

### Account · overview — `account.html`
Route `/account` · board `Account`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `account` | 712 | 1219 | Customer Account API (customer, orders, addresses) + Sanity customerProfile (drop alerts, Moments) + shopPages.account.deleteNote. | Side nav = real routes (/account, /account/orders, /account/addresses, /account/profile, /wishlist, sign out). Orders show N° per line from the order metafield. Profile toggles (aria-pressed) save immediately. |
| 4 | `footer` | 483 | 854 | (as above) | (as above) |

### Account · orders — `account-orders.html`
Route `/account/orders` · board `Account`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `account` | 1083 | 1651 | (as above) | (as above) |
| 4 | `footer` | 483 | 854 | (as above) | (as above) |

### Account · addresses — `account-addresses.html`
Route `/account/addresses` · board `Account`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `account` | 613 | 1061 | (as above) | (as above) |
| 4 | `footer` | 483 | 854 | (as above) | (as above) |

### Account · profile and emails — `account-profile.html`
Route `/account/profile` · board `Account`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `account` | 1069 | 1463 | (as above) | (as above) |
| 4 | `footer` | 483 | 854 | (as above) | (as above) |

### Wishlist · signed in — `wishlist.html`
Route `/wishlist` · board `Wishlist`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `wishlist` | 911 | 2167 | Sanity customerProfile.wishlist (signed in) or ns_wishlist cookie/localStorage (guest) + Sanity + Shopify. | Guest notice + sign-in CTA (wishlist-guest). Cards by state: live → "Choose a size" (→ piece), coming → "Reminder on" (toggles notify), sold out → "See in the archive". Remove = form POST. |
| 4 | `footer` | 483 | 854 | (as above) | (as above) |

### Wishlist · guest — `wishlist-guest.html`
Route `/wishlist` · board `Wishlist`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `wishlist` | 1044 | 2394 | (as above) | (as above) |
| 4 | `footer` | 483 | 854 | (as above) | (as above) |

### Story — `story.html`
Route `/story` · board `About`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `limited-by-design` | 760 | 760 | storyPage.hero. | As designed. |
| 4 | `what-we-believe` | 534 | 435 | storyPage.belief. | As designed. |
| 5 | `a-word-you-can-wear` | 1733 | 1589 | storyPage.chapters. | As designed. |
| 6 | `how-a-piece-is-made` | 478 | 954 | storyPage.process. | As designed. |
| 7 | `materials-and-makers` | 663 | 810 | storyPage.materials. | As designed. |
| 8 | `three-pillars-one-identity` | 432 | 724 | storyPage.pillars. | As designed. |
| 9 | `closing` | 373 | 381 | storyPage.closing + next drop. | Eyebrow "Next · STYLE 002 · Fri 4 Dec" from the next drop (hidden when none). Buttons → notify form on Home, current drop. |
| 10 | `footer` | 483 | 854 | (as above) | (as above) |

### Shipping and delivery — `care-shipping.html`
Route `/client-care/shipping` · board `Legal`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `care` | 999 | 1471 | clientCarePage + infoPage (section care/legal) + FAQ + contact. | Side nav links = real routes /client-care/{shipping,returns,faq,contact}, /legal/{terms,privacy,cookies} (aria-current="page"). Document title + meta + prose renderer (exact .s-prose markup: p, h3, ul, table.s-tbl, notice). FAQ = details/summary. Contact: topic chips (radio group, ?topic= preselect), form → /api/contact; sent state replaces the form (care-contact~sent). Cookies table button "Cookie settings" opens the consent panel. |
| 4 | `footer` | 483 | 854 | (as above) | (as above) |

### Returns and exchanges — `care-returns.html`
Route `/client-care/returns` · board `Legal`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `care` | 979 | 1530 | (as above) | (as above) |
| 4 | `footer` | 483 | 854 | (as above) | (as above) |

### Questions — `care-faq.html`
Route `/client-care/faq` · board `Legal`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `care` | 737 | 1037 | (as above) | (as above) |
| 4 | `footer` | 483 | 854 | (as above) | (as above) |

### Contact — `care-contact.html`
Route `/client-care/contact` · board `Legal`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `care` | 1162 | 1712 | (as above) | (as above) |
| 4 | `footer` | 483 | 854 | (as above) | (as above) |

### Terms of sale — `care-terms.html`
Route `/legal/terms` · board `Legal`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `care` | 1347 | 2053 | (as above) | (as above) |
| 4 | `footer` | 483 | 854 | (as above) | (as above) |

### Privacy notice — `care-privacy.html`
Route `/legal/privacy` · board `Legal`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `care` | 1097 | 1753 | (as above) | (as above) |
| 4 | `footer` | 483 | 854 | (as above) | (as above) |

### Cookies — `care-cookies.html`
Route `/legal/cookies` · board `Legal`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `care` | 793 | 1197 | (as above) | (as above) |
| 4 | `footer` | 483 | 854 | (as above) | (as above) |

### Contact · message sent — `care-contact~sent.html`
Route `/client-care/contact` · board `Legal`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `announcement` | 40 | 84 | (as above) | (as above) |
| 2 | `header` | 77 | 77 | (as above) | (as above) |
| 3 | `care` | 716 | 1015 | (as above) | (as above) |
| 4 | `footer` | 483 | 854 | (as above) | (as above) |

### User flows & data (documentation board) — `user-flows.html` (reference only)
Route `—` · board `Flows`

| # | data-block | 1440 h | 390 h | Data | Behaviour |
|---|---|---|---|---|---|
| 1 | `user-flows` | 2085 | 5337 | see snippet | as designed |

