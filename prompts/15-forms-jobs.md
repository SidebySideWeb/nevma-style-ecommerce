# 15 · Forms, emails and jobs

1. `/api/notify` (drop or piece, email, letter opt-in), `/api/contact`, `/api/subscribe`: Turnstile, honeypot, zod, rate limit, Sanity `formSubmission` via sanity-write.ts, Resend notification to client care (contact) and confirmation emails where designed copy exists. JSON for JS, redirect with `?sent=1` for no-JS (the page renders the success state from it).
2. Crons (vercel.json, CRON_SECRET): `/api/cron/drops` — when a drop has opened: `logAlertOnce('drop-open', slug)`, email every notify submission for the drop and its pieces once (plain, branded text: drop name, link), delete those submissions, revalidate; `/api/cron/retention` — delete contact submissions older than 24 months; `/api/cron/wishlist-alerts` — fallback check for pieces at 1 left, email customers whose wishlist holds them, once (`logAlertOnce('last-piece', handle)`).
3. Email templates in `src/emails/` (simple HTML in the brand colours + plain text), all copy in one file for NEVMA to review.

**Checks:** API tests (good, bad Turnstile, honeypot, rate limit, invalid email) · cron handlers unit-tested with a mocked clock · a real email received from the dev environment.
