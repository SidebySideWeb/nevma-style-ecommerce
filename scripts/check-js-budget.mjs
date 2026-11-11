/**
 * Per-page client JS budget: ≤ 30 KB gzipped (AGENTS.md / AC-14).
 * Measures the script modules each page actually imports (source), which Astro
 * bundles; keeps the check runnable without a production build.
 */
import { gzipSync } from 'node:zlib';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scriptsDir = resolve(root, 'apps/web/src/scripts');
const LIMIT = 30 * 1024;

/** Shared chrome scripts on every page that mounts Header + CookieConsent. */
const CHROME = ['menu.ts', 'consent.ts'];

const pages = {
  home: [...CHROME, 'countdown.ts'],
  piece: [...CHROME, 'piece.ts', 'countdown.ts'],
  pieces: [...CHROME, 'pieces.ts'],
  care: [...CHROME, 'care.ts'],
  account: [...CHROME, 'account.ts'],
  bag: [...CHROME],
  story: [...CHROME],
};

function gzSize(file) {
  const path = resolve(scriptsDir, file);
  if (!existsSync(path)) throw new Error(`missing script ${file}`);
  return gzipSync(readFileSync(path)).length;
}

let failed = false;
const rows = [];

for (const [page, files] of Object.entries(pages)) {
  const unique = [...new Set(files)];
  let total = 0;
  const parts = [];
  for (const f of unique) {
    const n = gzSize(f);
    total += n;
    parts.push(`${f}=${n}`);
  }
  const ok = total <= LIMIT;
  if (!ok) failed = true;
  rows.push({ page, total, ok, parts });
}

for (const r of rows) {
  const mark = r.ok ? 'ok' : 'FAIL';
  console.log(`${mark}  ${r.page.padEnd(10)} ${String(r.total).padStart(6)} B gz  (${r.parts.join(', ')})`);
}

if (failed) {
  console.error(`\nJS budget exceeded: limit ${LIMIT} B gzipped per page.`);
  process.exit(1);
}

console.log(`\nAll pages ≤ ${LIMIT} B gzipped.`);
