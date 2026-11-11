# 07 · Home

Read docs/PAGES.md (Home) and the snippets in design/build/blocks/home/.

Build blocks hero, the-pieces, signal (countdown via `src/scripts/countdown.ts`, ticks every 30 s, aria-label sentence from format.ts; notify form id `notify` posting to /api/notify with Turnstile + honeypot, success state = home~notified), five-then-never-again, story-teaser, the-world-of-nevma. Data from homePage + drops + pieces (Sanity) and the commerce provider (server islands for meters, tags, prices, "4 of 15").

**Checks:** `FIDELITY_ONLY='^home' pnpm test:fidelity` green at both widths (home, home~notified, home~menu) · works with JS disabled (notify form posts and returns the success state).
