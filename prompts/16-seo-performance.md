# 16 · SEO, analytics, performance

1. Titles/descriptions from Sanity SEO fields with sensible fallbacks; canonical URLs; Open Graph images (Sanity share image or the piece's first photo); `noindex` on previews and on /bag, /account*, /wishlist, /client-care/contact sent states.
2. `sitemap.xml` (pages, drops, pieces, categories, policies) and `robots.txt`.
3. JSON-LD: Organization + WebSite on Home; Product with Offer (live price, `InStock`/`SoldOut`/`PreOrder` for upcoming) on piece pages — generated from the same commerce data as the page.
4. Vercel Web Analytics after consent only.
5. Performance: Lighthouse mobile on Home, piece, pieces ≥ 95 performance; LCP ≤ 2.0 s, CLS ≤ 0.02; JS ≤ 30 KB gz per page (add a size check script to `pnpm check`).

**Checks:** Lighthouse report saved in `docs/reports/` · fidelity still green.
