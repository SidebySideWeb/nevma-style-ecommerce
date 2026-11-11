/**
 * One-shot Resend smoke: pnpm --filter web exec node scripts/send-dev-email.mjs you@example.com
 * Needs RESEND_API_KEY + MAIL_FROM in the repo-root .env (mirrored by loading dotenv-less parse below).
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const envPath = resolve(root, '.env');
try {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = val;
  }
} catch {
  /* no .env */
}

const to = process.argv[2] || process.env.CLIENT_CARE_TO;
const apiKey = process.env.RESEND_API_KEY;
const from = process.env.MAIL_FROM;

if (!apiKey || !from || !to) {
  console.error(
    'Missing RESEND_API_KEY, MAIL_FROM, or recipient (arg / CLIENT_CARE_TO). Skip real-email check.',
  );
  process.exit(2);
}

const subject = 'NEVMA Style · dev email check';
const text = [
  'Dev environment check from NEVMA Style.',
  '',
  'If you received this, Resend is wired.',
  '',
  '— NEVMA Style · London',
].join('\n');

const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    authorization: `Bearer ${apiKey}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    from,
    to: [to],
    subject,
    text,
    html: `<p>${text.replaceAll('\n', '<br>')}</p>`,
  }),
});

if (!res.ok) {
  console.error('Resend error', res.status, await res.text());
  process.exit(1);
}
const data = await res.json();
console.log('sent', data.id, '→', to);
