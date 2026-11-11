#!/usr/bin/env node
/**
 * Smoke: Storefront product reads for seed handles.
 * Usage: node scripts/shopify-smoke.mjs
 * Needs SHOPIFY_STORE_DOMAIN + Storefront public or private token in env / .env
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    const p = resolve(process.cwd(), f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

loadEnv();

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const version = process.env.SHOPIFY_API_VERSION || '2026-10';
const privateTok = process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN?.trim();
const publicTok = process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN?.trim();
if (!domain || (!privateTok && !publicTok)) {
  console.error('Missing SHOPIFY_STORE_DOMAIN or Storefront token');
  process.exit(1);
}

const liveHandles = ['definition-tee-white', 'wordmark-tee-bone', 'definition-tee-bone'];
const upcomingHandles = ['signal-overshirt', 'suede-cap-sand', 'silk-square-70'];
const handles = [...liveHandles, ...upcomingHandles];

const headers = { 'content-type': 'application/json' };
if (privateTok) headers['Shopify-Storefront-Private-Token'] = privateTok;
else headers['X-Shopify-Storefront-Access-Token'] = publicTok;

const q = handles.map((h) => `handle:${h}`).join(' OR ');
const query = `query ($q: String!) {
  products(first: 20, query: $q) {
    nodes {
      handle title availableForSale
      priceRange { minVariantPrice { amount currencyCode } }
      edition: metafield(namespace: "nevma", key: "edition_size") { value }
      variants(first: 10) {
        nodes { availableForSale quantityAvailable selectedOptions { name value } }
      }
    }
  }
}`;

const res = await fetch(`https://${domain}/api/${version}/graphql.json`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ query, variables: { q } }),
});
const json = await res.json();
if (!res.ok) {
  console.error('HTTP', res.status, json);
  process.exit(1);
}

const inventoryDenied = (json.errors || []).some((e) =>
  String(e.message || '').includes('quantityAvailable'),
);
const found = new Map((json.data?.products?.nodes || []).map((p) => [p.handle, p]));

let failed = 0;
for (const h of liveHandles) {
  const p = found.get(h);
  if (!p) {
    console.log(`MISS  ${h}`);
    failed++;
    continue;
  }
  const left = p.variants.nodes.reduce((s, v) => {
    const qn = typeof v.quantityAvailable === 'number' ? v.quantityAvailable : v.availableForSale ? 1 : 0;
    return s + Math.max(0, qn);
  }, 0);
  const price = p.priceRange?.minVariantPrice;
  console.log(
    `OK    ${h}  ${price?.amount} ${price?.currencyCode}  left≈${left}  edition=${p.edition?.value ?? '—'}`,
  );
}
for (const h of upcomingHandles) {
  const p = found.get(h);
  console.log(p ? `LIVE  ${h} (expected draft/unpublished until drop)` : `DRAFT ${h} (ok — not on Headless yet)`);
}

if (inventoryDenied) {
  console.log(
    '\nWARN  quantityAvailable denied — enable product inventory on the Headless storefront (unauthenticated_read_product_inventory).',
  );
}
if (!privateTok) {
  console.log('WARN  SHOPIFY_STOREFRONT_PRIVATE_TOKEN empty — using public token (ok for dev).');
}

process.exit(failed ? 1 : 0);
