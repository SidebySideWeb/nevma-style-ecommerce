# 01 · Workspace and tooling

Read AGENTS.md, docs/ARCHITECTURE.md, docs/FIDELITY.md.

1. Create the pnpm workspace as in docs/ARCHITECTURE.md using the root `package.json` and `pnpm-workspace.yaml` already in the kit. Node 22, pnpm 10.
2. Create the Astro app in `apps/web` **without overwriting** `apps/web/package.json`, `apps/web/tests/` or `apps/web/fixtures/`. Use the versions in `apps/web/package.json` (Astro 7.4.10, @astrojs/vercel 11.0.21 — check the Astro docs for the current config API). `output: 'server'`, Vercel adapter with ISR enabled for editorial routes, `site` from `PUBLIC_SITE_URL`, env schema (astro:env) for every variable in `.env.example` with server/client access set correctly.
3. Copy `design/build/css/style.css` and every `design/build/css/page-*.css` into `apps/web/src/styles/` **byte for byte** (add a test that diffs them against design/build so they never drift). Copy the fonts from `design/build/fonts/` to `apps/web/public/fonts/` and `fonts.css` into `src/styles/fonts.css` with paths fixed to `/fonts/`.
4. Add `src/content/ui.ts` (empty object for now), `src/lib/` folders as in ARCHITECTURE, eslint + prettier (prettier must ignore src/styles/*.css), vitest.
5. Root scripts already defined: `dev`, `build`, `check`, `test`, `test:fidelity`, `test:fidelity:self`. Make them work. Install Playwright browsers (`pnpm --filter web exec playwright install chromium`).
6. Run the fidelity self-test: `pnpm test:fidelity:self` — must pass (it compares the design with itself).

**Checks:** `pnpm install` clean · `pnpm --filter web build` passes on an empty home page · `pnpm test:fidelity:self` green · the CSS copy test passes.
