/**
 * One-off: patch Shipping table costs and Terms §4 to EUR wording in production.
 * Usage: SANITY_WRITE_TOKEN=… pnpm --filter studio exec tsx scripts/currency-eur.ts [--dry]
 */
import { createClient } from '@sanity/client';

const dry = process.argv.includes('--dry');
const projectId = process.env.SANITY_STUDIO_PROJECT_ID || process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.SANITY_STUDIO_DATASET || process.env.PUBLIC_SANITY_DATASET || 'production';
const token = process.env.SANITY_WRITE_TOKEN;
if (!projectId || !token) {
  console.error('Need SANITY_STUDIO_PROJECT_ID (or PUBLIC_SANITY_PROJECT_ID) and SANITY_WRITE_TOKEN');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: '2026-10-01',
  useCdn: false,
});

const TERMS_OLD = 'Prices are in pounds sterling and include UK VAT.';
const TERMS_NEW =
  "Prices are in euros and include VAT [confirm VAT wording with NEVMA's accountant].";

const COST_MAP: Record<string, string> = {
  '£6': '€6',
  '£12': '€12',
  '[£18]': '[€18]',
  '[£25]': '[€25]',
  '€6': '€6',
  '€12': '€12',
  '[€18]': '[€18]',
  '[€25]': '[€25]',
};

type Span = { _type?: string; text?: string; marks?: string[]; _key?: string };
type Block = {
  _type?: string;
  _key?: string;
  style?: string;
  children?: Span[];
  head?: string[];
  rows?: { _type?: string; _key?: string; cells?: string[] }[];
  text?: string;
};

function patchBody(body: Block[] | undefined): { body: Block[]; changes: string[] } {
  if (!Array.isArray(body)) return { body: body || [], changes: [] };
  const changes: string[] = [];
  const next = body.map((block) => {
    if (block._type === 'simpleTable' && Array.isArray(block.rows)) {
      const rows = block.rows.map((row) => {
        if (!row.cells) return row;
        const cells = row.cells.map((cell) => {
          const mapped = COST_MAP[cell];
          if (mapped && mapped !== cell) {
            changes.push(`shipping cell ${cell} → ${mapped}`);
            return mapped;
          }
          return cell;
        });
        return { ...row, cells };
      });
      return { ...block, rows };
    }
    if (block._type === 'block' && Array.isArray(block.children)) {
      const children = block.children.map((span) => {
        if (typeof span.text !== 'string' || !span.text.includes(TERMS_OLD)) return span;
        changes.push('terms §4 currency sentence');
        return { ...span, text: span.text.replace(TERMS_OLD, TERMS_NEW) };
      });
      return { ...block, children };
    }
    return block;
  });
  return { body: next, changes };
}

const docs = await client.fetch<
  { _id: string; _type: string; slug?: { current?: string }; body?: Block[] }[]
>(`*[_type == "infoPage" && slug.current in ["shipping", "terms"] && !(_id in path("drafts.**"))]{
  _id, _type, slug, body
}`);

let total = 0;
for (const doc of docs) {
  const { body, changes } = patchBody(doc.body);
  if (!changes.length) {
    console.log(`${doc._id}: already EUR (or nothing to patch)`);
    continue;
  }
  console.log(`${doc._id}: ${changes.join('; ')}`);
  total += changes.length;
  if (!dry) {
    await client.patch(doc._id).set({ body }).commit();
  }
}

console.log(dry ? `dry run: ${total} change(s)` : `${total} change(s) written`);
