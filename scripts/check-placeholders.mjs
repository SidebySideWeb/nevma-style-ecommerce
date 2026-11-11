#!/usr/bin/env node
// Lists client placeholders: [bracketed text] in the built site and in the Sanity seed, and photo slots without images.
// Usage: node scripts/check-placeholders.mjs [--strict]   (--strict exits 1 when any remain; use before launch)
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const strict = process.argv.includes('--strict');
const roots = ['apps/web/dist', 'apps/web/.vercel/output/static'].filter(existsSync);
const RX = /\[(?!if |endif)[^\]\n<>]{2,120}\]/g;
const found = new Map();
const add = (where, text) => { const k = text.trim(); if (!found.has(k)) found.set(k, new Set()); found.get(k).add(where); };

function walk(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(html|json|txt|xml)$/.test(n)) for (const m of readFileSync(p, 'utf8').matchAll(RX)) add(p, m[0]);
  }
}
roots.forEach(walk);
if (existsSync('seed/data.ndjson')) {
  for (const line of readFileSync('seed/data.ndjson', 'utf8').split('\n').filter(Boolean)) {
    const d = JSON.parse(line);
    const scan = (v) => {
      if (typeof v === 'string') { for (const m of v.matchAll(RX)) add(`sanity:${d._id}`, m[0]); }
      else if (Array.isArray(v)) v.forEach(scan);
      else if (v && typeof v === 'object') {
        if (v._type === 'photo' && v.placeholder && !v.image) add(`sanity:${d._id}`, `[Photo · ${v.placeholder}] (slot without an image)`);
        Object.values(v).forEach(scan);
      }
    };
    scan(d);
  }
}
if (!found.size) { console.log('No placeholders found.'); process.exit(0); }
console.log(`${found.size} distinct placeholder(s):`);
for (const [t, w] of [...found].sort()) console.log(`  ${t}  ← ${[...w].slice(0, 3).join(', ')}${w.size > 3 ? ` +${w.size - 3}` : ''}`);
if (!roots.length) console.log('\n(no build found; only the seed was checked — run `pnpm build` first)');
process.exit(strict ? 1 : 0);
