# 14 · Story, client care, legal, 404, cookie consent

1. `/story`: blocks limited-by-design, what-we-believe, a-word-you-can-wear, how-a-piece-is-made, materials-and-makers, three-pillars-one-identity, closing.
2. `/client-care/[slug]` (shipping, returns, faq, contact) and `/legal/[slug]` (terms, privacy, cookies): block care — side nav (aria-current), document title + meta, Prose for infoPage bodies, FAQ (details/summary), contact form (topic chips as a radio group, `?topic=` preselect, fields from ui.ts, POST /api/contact, sent state = care-contact~sent).
3. 404 page from existing parts (empty-bag pattern, copy from shopPages.notFound), status 404.
4. Cookie consent panel (bag drawer pattern, not designed): Essential always on, Analytics opt-in, saved in `ns_consent` (6 months); "Cookie settings" button on the Cookies page reopens it. Analytics loads only after consent.

**Checks:** `FIDELITY_ONLY='^(story|care)' pnpm test:fidelity` green (9 states) · 404 returns status 404 · consent stored and respected.
