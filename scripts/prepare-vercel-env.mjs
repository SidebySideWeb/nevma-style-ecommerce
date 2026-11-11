import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = {};
for (const name of ['.env', '.env.local']) {
  const p = resolve(root, name);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (env[m[1]] == null) env[m[1]] = v;
  }
}

const keys = [
  'PUBLIC_SITE_URL',
  'COMMERCE_ENABLED',
  'COMMERCE_MOCK',
  'PUBLIC_SANITY_PROJECT_ID',
  'PUBLIC_SANITY_DATASET',
  'SANITY_READ_TOKEN',
  'SANITY_WRITE_TOKEN',
  'SANITY_REVALIDATE_SECRET',
  'SANITY_STUDIO_PROJECT_ID',
  'SANITY_STUDIO_DATASET',
  'SHOPIFY_STORE_DOMAIN',
  'SHOPIFY_API_VERSION',
  'SHOPIFY_STOREFRONT_PUBLIC_TOKEN',
  'SHOPIFY_STOREFRONT_PRIVATE_TOKEN',
  'SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID',
  'SHOPIFY_SHOP_ID',
  'SHOPIFY_WEBHOOK_SECRET',
  'SESSION_SECRET',
  'RESEND_API_KEY',
  'MAIL_FROM',
  'CLIENT_CARE_TO',
  'PUBLIC_TURNSTILE_SITE_KEY',
  'TURNSTILE_SECRET_KEY',
  'CRON_SECRET',
];

const sensitive = new Set([
  'SANITY_READ_TOKEN',
  'SANITY_WRITE_TOKEN',
  'SANITY_REVALIDATE_SECRET',
  'SHOPIFY_STOREFRONT_PRIVATE_TOKEN',
  'SHOPIFY_WEBHOOK_SECRET',
  'SESSION_SECRET',
  'RESEND_API_KEY',
  'TURNSTILE_SECRET_KEY',
  'CRON_SECRET',
  'SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID',
]);

const production = [];
const preview = [];
const development = [];

for (const k of keys) {
  const v = env[k];
  if (v == null || v === '') continue;
  let prodV = v;
  if (k === 'COMMERCE_MOCK') prodV = '0';
  if (k === 'COMMERCE_ENABLED') prodV = 'true';
  if (k === 'PUBLIC_SITE_URL' && (v.includes('localhost') || !v)) {
    prodV = 'https://nevma-style.vercel.app';
  }
  const type = sensitive.has(k) ? 'encrypted' : 'plain';
  production.push({ key: k, value: prodV, type, target: ['production'] });
  preview.push({ key: k, value: prodV, type, target: ['preview'] });
  development.push({ key: k, value: v, type, target: ['development'] });
}

const out = resolve(root, 'scripts/.vercel-env-payload.json');
writeFileSync(out, JSON.stringify({ production, preview, development }, null, 2));
console.log('wrote', out);
console.log('counts', {
  production: production.length,
  preview: preview.length,
  development: development.length,
});
console.log('keys', production.map((p) => p.key).join(','));
