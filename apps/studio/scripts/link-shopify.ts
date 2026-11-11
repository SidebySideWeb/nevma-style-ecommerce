/**
 * After Sanity Connect has synced the Shopify products, link each piece to its product by handle,
 * and each drop to its collection. Reports pieces without a product and handle mismatches.
 * Usage: SANITY_WRITE_TOKEN=… pnpm --filter studio link-shopify [--dry]
 */
import { createClient } from '@sanity/client';

const dry = process.argv.includes('--dry');
const client = createClient({
  projectId: process.env.SANITY_STUDIO_PROJECT_ID!, dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  token: process.env.SANITY_WRITE_TOKEN, apiVersion: '2026-10-01', useCdn: false,
});

const pieces: Array<{ _id: string; handle: string; product?: string }> = await client.fetch(`*[_type == "piece" && !(_id in path("drafts.**"))]{_id, "handle": handle.current, "product": product._ref}`);
const products: Array<{ _id: string; handle: string; deleted?: boolean }> = await client.fetch(`*[_type == "product"]{_id, "handle": store.slug.current, "deleted": store.isDeleted}`);
const drops: Array<{ _id: string; handle?: string; collection?: string }> = await client.fetch(`*[_type == "drop" && !(_id in path("drafts.**"))]{_id, "handle": shopifyCollectionHandle, "collection": collection._ref}`);
const collections: Array<{ _id: string; handle: string }> = await client.fetch(`*[_type == "collection"]{_id, "handle": store.slug.current}`);

const byHandle = new Map(products.filter((p) => !p.deleted).map((p) => [p.handle, p._id]));
const tx = client.transaction();
let changes = 0;
for (const p of pieces) {
  const id = byHandle.get(p.handle);
  if (!id) { console.warn(`no Shopify product for piece ${p._id} (handle ${p.handle})`); continue; }
  if (p.product !== id) { tx.patch(p._id, { set: { product: { _type: 'reference', _ref: id, _weak: true } } }); changes++; console.log(`link ${p._id} → ${id}`); }
}
const colByHandle = new Map(collections.map((c) => [c.handle, c._id]));
for (const d of drops) {
  const id = d.handle ? colByHandle.get(d.handle) : undefined;
  if (id && d.collection !== id) { tx.patch(d._id, { set: { collection: { _type: 'reference', _ref: id, _weak: true } } }); changes++; console.log(`link ${d._id} → ${id}`); }
}
const orphans = products.filter((p) => !p.deleted && !pieces.some((x) => x.handle === p.handle));
for (const o of orphans) console.warn(`Shopify product ${o.handle} has no piece in Sanity`);
if (dry || !changes) console.log(dry ? `dry run: ${changes} change(s)` : 'nothing to link');
else { await tx.commit(); console.log(`${changes} link(s) written`); }
