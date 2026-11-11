# 10 · All pieces and categories

1. `/pieces`: blocks all-pieces (filter chips with counts, view toggle) and pieces (index table / gallery). Filters and view are query parameters (`?filter=available|coming|sold-out`, `?view=gallery`) rendered on the server; `src/scripts/pieces.ts` switches instantly, updates the URL with history.replaceState and the live region.
2. `/categories/[slug]` (+ `/categories` → first): breadcrumb, category-intro (chips are links with counts and aria-current), then either featured-piece + more-in-category + from-the-archive, or coming-piece when the category has no live piece.

**Checks:** `FIDELITY_ONLY='^(pieces|category)' pnpm test:fidelity` green at both widths (9 states).
