# 08 · Drop page

Route `/drops/[slug]` (+ `/drops` → current drop). Blocks: announcement, header, breadcrumb, drop-intro, drop-pieces (alternating layout, size summaries from edition.ts), the-definition, drop-notes (details/summary, first open), other-drops (previous/next by opensAt), footer. Upcoming drops render with the upcoming wording (no prices); test by changing a seed copy locally, not the design.

**Checks:** `FIDELITY_ONLY='^drop$' pnpm test:fidelity` green · `/drops/style-002` renders without errors (upcoming).
