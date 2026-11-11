# How to use these prompts in Cursor

1. Unzip the kit into an empty folder, `git init`, open it in Cursor. The rules in `.cursor/rules` load automatically; `AGENTS.md` is the entry point.
2. Use Agent mode with a strong model. **One prompt per chat.** Paste the prompt file's content (or type `@prompts/NN-….md do this`).
3. Every prompt ends with **Checks**. Do not move on until they pass. For any page work the check is the fidelity test for that page at both widths.
4. When Cursor proposes changing the design, thresholds, `design/build` or `pages.json` — stop it. The design is fixed; ask me (the user) instead.
5. Commit after each prompt (`git commit -m "prompt NN: …"`).

| # | Prompt | Needs | ~days |
|---|---|---|---|
| 01 | Workspace and tooling | — | 0.5 |
| 02 | Sanity project, Studio, seed | Sanity project ID | 0.5 |
| 03 | Server utilities (forms, email, sessions, Sanity writes) | 02 | 0.5 |
| 04 | Commerce layer (interface, fixtures, edition rules) | — | 1 |
| 05 | Sanity data layer, images, prose, UI wording | 02 | 0.5 |
| 06 | Foundation: layout, announcement, header, footer | 04, 05 | 1 |
| 07 | Home | 06 | 1 |
| 08 | Drop page | 06 | 0.5 |
| 09 | Piece page, all states, bag drawer | 06 | 1.5 |
| 10 | All pieces and categories | 09 | 1 |
| 11 | Bag and cart API | 09 | 1 |
| 12 | Live Shopify provider, webhooks, revalidation | Shopify dev store | 1 |
| 13 | Accounts and wishlist | 12 | 1.5 |
| 14 | Story, client care, legal, 404, consent | 06 | 1 |
| 15 | Forms, emails and jobs | 03, 14 | 1 |
| 16 | SEO, analytics, performance | all pages | 0.5 |
| 17 | Deploy, Shopify and Viva setup | accounts | 0.5 |
| 18 | QA and acceptance | all | 1 |

DECIDED 11 Nov: one launch in December with the shop live (no campaign-only phase). Every prompt is on the launch path. Run 12 (live Shopify) as soon as the development store exists; 01–11 and 14 can be built on the mock data before that.
