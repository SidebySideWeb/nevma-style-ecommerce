# 02 · Sanity project, Studio and seed

Read docs/CONTENT-MODEL.md and .cursor/rules/30-sanity.mdc.

1. I (the user) have created the Sanity project in the NEVMA organization. Ask me for the project ID if `.env` lacks `SANITY_STUDIO_PROJECT_ID` / `PUBLIC_SANITY_PROJECT_ID`. Dataset `production`, **private**.
2. `apps/studio` is ready (schemas, structure, singletons). Install, then: `pnpm --filter studio validate` (expect 0 errors, 0 warnings), `typecheck`, `build`.
   The Studio also contains the read-only `product`, `productVariant` and `collection` types that Sanity Connect will fill later (prompt 12).
3. `pnpm --filter studio check-seed` then `pnpm --filter studio seed` (imports `seed/nevma-style-seed.tar.gz` with images). Open the Studio and confirm: 2 drops, 6 pieces, 4 categories, 5 policy pages, 5 singletons, photos visible.
4. Create robot tokens: Viewer (site, `SANITY_READ_TOKEN`) and, for scripts only, an Editor token. Add CORS origin http://localhost:4321.
5. `pnpm --filter studio deploy` (hostname nevma-style). Tell me the URL.

**Checks:** validate/typecheck/build pass · seed imported with images · Studio deployed · `.env` filled (not committed).
