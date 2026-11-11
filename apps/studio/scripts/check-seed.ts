/**
 * Checks seed/data.ndjson before import: references resolve, required fields are set, IDs are public
 * (no "."), array items have unique _key values, image files exist, every piece handle is unique.
 * Usage: pnpm --filter studio check-seed [path/to/data.ndjson]
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const file = resolve(process.argv[2] || join(import.meta.dirname, '../../../seed/data.ndjson'));
const imagesDir = process.argv[3] || join(dirname(file), 'nevma-style-seed/images');
const docs = readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const ids = new Set(docs.map((d) => d._id));
const errors: string[] = [];

const REQUIRED: Record<string, string[]> = {
  drop: ['code', 'name', 'slug.current', 'opensAt'],
  piece: ['title', 'handle.current', 'number', 'drop._ref', 'category._ref', 'gallery'],
  category: ['name', 'slug.current', 'order'],
  infoPage: ['title', 'slug.current', 'section', 'order'],
  siteSettings: ['mainNav', 'footer.copyright'], homePage: ['hero.drop._ref', 'hero.piece._ref'], storyPage: ['hero.title'],
  clientCarePage: ['faq', 'contact.topics'], shopPages: ['bag.emptyTitle', 'wishlist.note'],
};
const get = (o: unknown, path: string) => path.split('.').reduce<unknown>((a, k) => (a == null ? a : (a as Record<string, unknown>)[k]), o);

function walk(v: unknown, where: string, docId: string) {
  if (Array.isArray(v)) {
    const keys = new Set<string>();
    v.forEach((it, i) => {
      if (it && typeof it === 'object' && !Array.isArray(it)) {
        const k = (it as { _key?: string })._key;
        if (!k) errors.push(`${docId}: ${where}[${i}] has no _key`);
        else if (keys.has(k)) errors.push(`${docId}: ${where} duplicate _key ${k}`);
        else keys.add(k);
      }
      walk(it, `${where}[${i}]`, docId);
    });
  } else if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (o._type === 'reference' && typeof o._ref === 'string' && !ids.has(o._ref)) errors.push(`${docId}: ${where} → missing ${o._ref}`);
    if (typeof o._sanityAsset === 'string') {
      const m = o._sanityAsset.match(/^image@file:\/\/\.\/(.+)$/);
      if (!m || !existsSync(join(dirname(imagesDir), m[1]))) errors.push(`${docId}: ${where} image not found ${o._sanityAsset}`);
    }
    for (const [k, x] of Object.entries(o)) walk(x, where ? `${where}.${k}` : k, docId);
  }
}

const handles = new Map<string, string>();
for (const d of docs) {
  if (String(d._id).includes('.')) errors.push(`${d._id}: IDs with "." are private in Sanity; use hyphens`);
  for (const f of REQUIRED[d._type] ?? []) if (get(d, f) == null || get(d, f) === '') errors.push(`${d._id}: missing ${f}`);
  if (d._type === 'piece') {
    const h = d.handle?.current;
    if (handles.has(h)) errors.push(`${d._id}: handle ${h} also used by ${handles.get(h)}`);
    handles.set(h, d._id);
  }
  walk(d, '', d._id);
}
const types = docs.reduce<Record<string, number>>((a, d) => ((a[d._type] = (a[d._type] || 0) + 1), a), {});
console.log(`${docs.length} documents`, types);
if (errors.length) { console.error(errors.join('\n')); console.error(`\n${errors.length} problem(s)`); process.exit(1); }
console.log('seed OK');
