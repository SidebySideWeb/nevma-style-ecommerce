# 01b · Update the repo to kit v1.2 (run once, after prompt 01)

Prompt 01 already ran with kit v1.0. Since then three decisions changed the kit:
1. **One launch in December with the shop live** (no campaign-only phase). `COMMERCE_ENABLED=true` in production; `false` is only an emergency switch.
2. **Sanity Connect for Shopify** syncs products, variants and collections into Sanity (read-only); a `piece` references its synced `product`.
3. **No Supabase.** Wishlist, preferences, notify-me, newsletter and contact requests are Sanity documents written by the server with `SANITY_WRITE_TOKEN`.

The files in this update folder were copied over the repo already (docs, prompts, rules, AGENTS.md, README.md, apps/studio, design files, seed, fidelity pages.json). Now do the rest:

1. Delete `prompts/03-supabase-server.md` and the `supabase/` folder if they exist. Prompt 03 is now `prompts/03-server-utilities.md`.
2. `apps/web/package.json`: remove `@supabase/supabase-js` if present; keep everything prompt 01 added. `pnpm install`.
3. `.env.example` and `.env` (do not overwrite other changes you made in prompt 01):
   - remove `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`;
   - add `SANITY_WRITE_TOKEN=` (server only, comment: "Editor robot token: form submissions, customer wishlist/preferences, alert log");
   - set `COMMERCE_ENABLED=true` with the comment "shop live; false = emergency switch (no Shopify calls, notify-only)".
4. The env schema in `apps/web/astro.config.*` (astro:env): drop the two Supabase variables, add `SANITY_WRITE_TOKEN` (server, secret, optional until prompt 03), default `COMMERCE_ENABLED` to true.
5. Remove any Supabase file or import created in prompt 01 (e.g. `src/lib/server/supabase.ts`). `src/lib/server/` will get `sanity-write.ts` in prompt 03.
6. `apps/studio`: `pnpm --filter studio validate` (0 errors, 0 warnings), `typecheck`, `build`. New in the Studio: read-only Sanity Connect types, site-written types (formSubmission, customerProfile, alertLog), a "Requests and customers" section, `scripts/link-shopify.ts`.
7. Re-run the checks from prompt 01: `pnpm --filter web build`, the CSS copy test (the CSS did not change), and `pnpm test:fidelity:self` (the privacy page text changed to "Sanity (website content, wishlist and requests)"; the self-test must still pass).
8. Commit: `chore: update to kit v1.2 (December launch with shop, Sanity Connect, no Supabase)`.

Then continue with `prompts/02-sanity.md`.
