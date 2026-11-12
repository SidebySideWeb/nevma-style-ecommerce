/**
 * One-off: replace em dash (—) with hyphen (-) in published Sanity string content.
 * Usage: SANITY_WRITE_TOKEN=… pnpm --filter studio exec tsx scripts/emdash-to-hyphen.ts [--dry]
 */
import { createClient } from '@sanity/client';

const dry = process.argv.includes('--dry');
const em = '\u2014';
const projectId = process.env.SANITY_STUDIO_PROJECT_ID || process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.SANITY_STUDIO_DATASET || process.env.PUBLIC_SANITY_DATASET || 'production';
const token = process.env.SANITY_WRITE_TOKEN;
if (!projectId || !token) {
  console.error('Need SANITY_STUDIO_PROJECT_ID and SANITY_WRITE_TOKEN');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: '2026-10-01',
  useCdn: false,
});

function walk(v: unknown): unknown {
  if (typeof v === 'string') return v.includes(em) ? v.split(em).join('-') : v;
  if (Array.isArray(v)) return v.map(walk);
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      o[k] = walk(x);
    }
    return o;
  }
  return v;
}

const ids: { _id: string }[] = await client.fetch(`*[!(_id in path("drafts.**"))]{_id}`);
let patched = 0;
for (const { _id } of ids) {
  const doc = await client.getDocument(_id);
  if (!doc) continue;
  const raw = JSON.stringify(doc);
  if (!raw.includes(em)) continue;
  const cleaned = walk(doc) as Record<string, unknown>;
  const { _id: id, _type, _createdAt, _updatedAt, _rev, ...fields } = cleaned;
  console.log(_id);
  patched++;
  if (!dry) await client.patch(String(id)).set(fields).commit();
}
console.log(dry ? `dry run: ${patched}` : `patched ${patched}`);
