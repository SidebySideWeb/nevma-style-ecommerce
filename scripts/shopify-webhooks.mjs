/**
 * Register / list / remove Shopify webhooks for Style.
 *
 * Usage (repo root, Admin token in .env):
 *   node scripts/shopify-webhooks.mjs list
 *   node scripts/shopify-webhooks.mjs register --url https://style.example.com
 *   node scripts/shopify-webhooks.mjs register --url https://….vercel.app --preview
 *   node scripts/shopify-webhooks.mjs remove --stale
 *   node scripts/shopify-webhooks.mjs remove --id <gid>
 *
 * Topic: inventory_levels/update → /api/shopify/webhook
 * (Product/collection edits arrive via Sanity Connect → /api/revalidate.)
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
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
      if (process.env[m[1]] == null) process.env[m[1]] = v;
    }
  }
}

loadEnv();

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_TOKEN;
const version = process.env.SHOPIFY_API_VERSION || '2026-10';
const TOPIC = 'INVENTORY_LEVELS_UPDATE';

if (!domain || !token) {
  console.error('SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_TOKEN are required');
  process.exit(1);
}

async function adminGraphql(query, variables = {}) {
  const res = await fetch(`https://${domain}/admin/api/${version}/graphql.json`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-shopify-access-token': token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(JSON.stringify(json.errors || json, null, 2));
  }
  return json.data;
}

async function listSubscriptions() {
  const data = await adminGraphql(`{
    webhookSubscriptions(first: 50) {
      nodes {
        id
        topic
        endpoint {
          __typename
          ... on WebhookHttpEndpoint { callbackUrl }
        }
        createdAt
      }
    }
  }`);
  return data.webhookSubscriptions.nodes;
}

function callbackOf(node) {
  return node.endpoint?.callbackUrl || '';
}

async function register(baseUrl) {
  const callbackUrl = `${baseUrl.replace(/\/$/, '')}/api/shopify/webhook`;
  const existing = await listSubscriptions();
  const same = existing.find(
    (n) => n.topic === TOPIC && callbackOf(n) === callbackUrl,
  );
  if (same) {
    console.log('already registered', same.id, callbackUrl);
    return same;
  }

  const data = await adminGraphql(
    `mutation ($topic: WebhookSubscriptionTopic!, $url: URL!) {
      webhookSubscriptionCreate(
        topic: $topic
        webhookSubscription: { callbackUrl: $url, format: JSON }
      ) {
        userErrors { field message }
        webhookSubscription { id topic endpoint { ... on WebhookHttpEndpoint { callbackUrl } } }
      }
    }`,
    { topic: TOPIC, url: callbackUrl },
  );
  const result = data.webhookSubscriptionCreate;
  if (result.userErrors?.length) {
    const msg = JSON.stringify(result.userErrors, null, 2);
    console.error(
      'register failed — custom app Admin token likely lacks read_inventory (needed for INVENTORY_LEVELS_UPDATE).\n' +
        msg,
    );
    process.exit(1);
  }
  console.log('registered', result.webhookSubscription.id, callbackUrl);
  return result.webhookSubscription;
}

async function remove(id) {
  const data = await adminGraphql(
    `mutation ($id: ID!) {
      webhookSubscriptionDelete(id: $id) {
        deletedWebhookSubscriptionId
        userErrors { field message }
      }
    }`,
    { id },
  );
  const result = data.webhookSubscriptionDelete;
  if (result.userErrors?.length) {
    throw new Error(JSON.stringify(result.userErrors, null, 2));
  }
  console.log('removed', result.deletedWebhookSubscriptionId);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const cmd = args._[0] || 'list';

if (cmd === 'list') {
  const nodes = await listSubscriptions();
  for (const n of nodes) {
    console.log(`${n.topic}\t${callbackOf(n)}\t${n.id}`);
  }
  if (!nodes.length) console.log('(none)');
} else if (cmd === 'register') {
  const url = args.url;
  if (!url) {
    console.error('Usage: node scripts/shopify-webhooks.mjs register --url https://…');
    process.exit(1);
  }
  await register(url);
} else if (cmd === 'remove') {
  if (args.stale) {
    const keep = new Set(
      [args.url, process.env.PUBLIC_SITE_URL]
        .filter(Boolean)
        .map((u) => `${u.replace(/\/$/, '')}/api/shopify/webhook`),
    );
    const nodes = await listSubscriptions();
    for (const n of nodes) {
      if (n.topic !== TOPIC) continue;
      const cb = callbackOf(n);
      if (keep.size && keep.has(cb)) continue;
      // Only remove Style inventory hooks that look like ours.
      if (!cb.includes('/api/shopify/webhook')) continue;
      console.log('stale →', cb);
      await remove(n.id);
    }
  } else if (args.id) {
    await remove(args.id);
  } else {
    console.error('Usage: remove --id <gid> | remove --stale [--url https://keep]');
    process.exit(1);
  }
} else {
  console.error('Commands: list | register | remove');
  process.exit(1);
}
