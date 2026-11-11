/**
 * CORS + revalidate webhook via Sanity Management / Webhooks API.
 * Usage:
 *   node scripts/sanity-deploy-setup.mjs
 *   node scripts/sanity-deploy-setup.mjs --url https://nevma-style.vercel.app
 * Needs SANITY_WRITE_TOKEN with project manage / webhooks create rights.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID || 'j931aey9';
const dataset = process.env.PUBLIC_SANITY_DATASET || 'production';
const token =
  process.env.SANITY_API_TOKEN ||
  process.env.SANITY_WRITE_TOKEN ||
  process.env.SANITY_READ_TOKEN;
const secret = process.env.SANITY_REVALIDATE_SECRET;

const argv = process.argv.slice(2);
const urlFlag = argv.indexOf('--url');
const siteUrl = (
  (urlFlag >= 0 && argv[urlFlag + 1]) ||
  process.env.DEPLOY_SITE_URL ||
  'https://nevma-style.vercel.app'
).replace(/\/$/, '');
const cmd = argv.find((a) => !a.startsWith('-') && a !== argv[urlFlag + 1]) || 'all';

if (!token) {
  console.error('Need SANITY_WRITE_TOKEN / SANITY_API_TOKEN');
  process.exit(1);
}
if (!secret) {
  console.error('Need SANITY_REVALIDATE_SECRET');
  process.exit(1);
}

const corsApi = 'https://api.sanity.io/v2021-06-07';
const hooksApi = `https://${projectId}.api.sanity.io/v2021-10-04`;

async function sanity(base, path, { method = 'GET', body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function ensureCors(origin) {
  const list = await sanity(corsApi, `/projects/${projectId}/cors`);
  const origins = list || [];
  const hit = origins.find((o) => o.origin === origin);
  if (hit) {
    console.log('CORS already:', origin, 'credentials=', hit.allowCredentials);
    return hit;
  }
  const created = await sanity(corsApi, `/projects/${projectId}/cors`, {
    method: 'POST',
    body: { origin, allowCredentials: false },
  });
  console.log('CORS added:', origin, '(no credentials)');
  return created;
}

function webhookBody(url) {
  return {
    type: 'document',
    name: 'nevma-style-revalidate',
    dataset,
    url,
    httpMethod: 'POST',
    apiVersion: 'v2021-06-07',
    includeDrafts: false,
    rule: {
      on: ['create', 'update', 'delete'],
      filter: '!(_type in ["formSubmission", "customerProfile", "alertLog"])',
      projection: '{_type,_id,"slug":coalesce(slug.current,handle.current)}',
    },
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  };
}

async function ensureWebhook() {
  const hooks = await sanity(hooksApi, `/hooks/projects/${projectId}`);
  const url = `${siteUrl}/api/revalidate`;
  const existing = (hooks || []).find(
    (h) => h.url === url || h.name === 'nevma-style-revalidate',
  );

  if (existing) {
    console.log('Webhook already:', existing.id, existing.url);
    if (existing.url !== url) {
      await sanity(hooksApi, `/hooks/projects/${projectId}/${existing.id}`, {
        method: 'PATCH',
        body: { url, headers: { Authorization: `Bearer ${secret}` } },
      });
      console.log('  updated URL →', url);
    }
    return existing;
  }

  const created = await sanity(hooksApi, `/hooks/projects/${projectId}`, {
    method: 'POST',
    body: webhookBody(url),
  });
  console.log('Webhook created:', created.id || created.name, '→', url);
  return created;
}

console.log('siteUrl=', siteUrl);

try {
  if (cmd === 'cors' || cmd === 'all') {
    await ensureCors(siteUrl);
    await ensureCors('http://localhost:4321');
  }
  if (cmd === 'webhook' || cmd === 'all') {
    await ensureWebhook();
  }
  console.log('done');
} catch (e) {
  console.error(e.message);
  if (e.body) console.error(JSON.stringify(e.body, null, 2));
  process.exit(1);
}
