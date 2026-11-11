import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../docs/reports');
const ids = ['home', 'piece', 'pieces'];
const summary = [];

for (const id of ids) {
  const raw = JSON.parse(readFileSync(resolve(dir, `lighthouse-${id}.json`), 'utf8'));
  const score = Math.round(raw.categories.performance.score * 100);
  const lcp = Math.round(raw.audits['largest-contentful-paint'].numericValue);
  const cls = Number(Number(raw.audits['cumulative-layout-shift'].numericValue).toFixed(3));
  summary.push({
    id,
    url: raw.finalRequestedUrl || raw.requestedUrl,
    performance: score,
    lcpMs: lcp,
    cls,
    pass: score >= 95 && lcp <= 2000 && cls <= 0.02,
  });
}

const md = [
  '# Lighthouse mobile (prompt 16)',
  '',
  'Site: `http://127.0.0.1:4321`',
  `Generated: ${new Date().toISOString()}`,
  '',
  '| Page | Perf | LCP (ms) | CLS | Pass (≥95, LCP≤2000, CLS≤0.02) |',
  '|---|---:|---:|---:|---|',
  ...summary.map(
    (s) =>
      `| ${s.id} ([html](./lighthouse-${s.id}.html)) | ${s.performance} | ${s.lcpMs} | ${s.cls} | ${s.pass ? 'yes' : 'no'} |`,
  ),
  '',
  'Targets: performance ≥ 95, LCP ≤ 2.0 s, CLS ≤ 0.02 (AC-14).',
  'These runs used local `astro dev`. Re-run with `SITE_URL` pointing at a production/preview deploy for the ≥95 gate.',
  '',
  'Raw JSON beside each HTML report.',
  '',
].join('\n');

writeFileSync(resolve(dir, 'lighthouse.md'), md);
writeFileSync(resolve(dir, 'lighthouse-summary.json'), JSON.stringify(summary, null, 2));
console.log(md);
