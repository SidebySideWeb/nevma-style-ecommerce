# 09 · Piece page, all states, bag drawer

Route `/pieces/[handle]`. Read docs/PAGES.md (product*) and COMMERCE.md §4–5.

1. Blocks: piece (gallery + thumbnails, buy box), about-this-piece (details accordions, size table), one-number-written-by-hand (film; poster + play when a video exists), wear-it-with, keep-exploring, our-services.
2. Buy box states from edition.ts: available, last piece (fixture `last-piece`), sold out (fixture `sold-out`, notify form → success sentence), upcoming (`/pieces/suede-cap-sand`: dashed meter, "Price revealed at the drop", countdown, notify with letter opt-in).
3. `src/scripts/piece.ts`: size chips (aria-pressed, sold-out chips disabled), size note, add button label "Add to bag · £85", wishlist toggle (aria-pressed, label swap; POST /api/wishlist, guest → localStorage + cookie), add → POST /api/cart → bag drawer (`bag-scrim` + `bag-drawer` blocks, role=dialog, focus trap, Escape, header count update).
4. Without JS: size chips are radio inputs in a form posting to /api/cart, then redirect to /bag.

**Checks:** `FIDELITY_ONLY='^product' pnpm test:fidelity` green at both widths (product, ~size, ~added, ~saved, -last, -sold, -sold~notified, -upcoming).
