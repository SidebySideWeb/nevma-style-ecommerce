/**
 * Mobile Lighthouse on Home, a piece page, and /pieces.
 * Saves JSON + HTML + markdown summary under docs/reports/.
 *
 * Usage (site must already be running):
 *   SITE_URL=http://127.0.0.1:4321 pnpm lighthouse
 *   LH_SOFT=1  — save report even if scores miss the ≥95 / LCP / CLS gates (local astro dev)
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'docs/reports');
const site = (process.env.SITE_URL || 'http://127.0.0.1:4321').replace(/\/$/, '');
const piecePath = process.env.LH_PIECE_PATH || '/pieces/definition-tee-white';

const targets = [
  { id: 'home', path: '/' },
  { id: 'piece', path: piecePath },
  { id: 'pieces', path: '/pieces' },
];

mkdirSync(outDir, { recursive: true });

function runLighthouse(url, jsonPath, htmlPath) {
  const common = [
    '--yes',
    'lighthouse@12.8.1',
    `"${url}"`,
    '--only-categories=performance',
    '--form-factor=mobile',
    '--screenEmulation.mobile',
    '--quiet',
    '--chrome-flags="--headless --no-sandbox --disable-dev-shm-usage"',
  ];
  const jsonRun = spawnSync(
    'npx',
    [...common, '--output=json', `--output-path="${jsonPath}"`],
    { cwd: root, encoding: 'utf8', shell: true, maxBuffer: 20 * 1024 * 1024 },
  );
  if (jsonRun.status !== 0 || !existsSync(jsonPath)) {
    return {
      ok: false,
      err: jsonRun.stderr || jsonRun.stdout || `json run failed (status ${jsonRun.status})`,
    };
  }

  const htmlRun = spawnSync(
    'npx',
    [...common, '--output=html', `--output-path="${htmlPath}"`],
    { cwd: root, encoding: 'utf8', shell: true, maxBuffer: 20 * 1024 * 1024 },
  );
  if (htmlRun.status !== 0 || !existsSync(htmlPath)) {
    return {
      ok: false,
      err: htmlRun.stderr || htmlRun.stdout || `html run failed (status ${htmlRun.status})`,
    };
  }
  return { ok: true };
}

function resolveJson(id, preferred) {
  if (existsSync(preferred)) return preferred;
  const alt = resolve(outDir, `lighthouse-${id}.report.json`);
  if (existsSync(alt)) {
    copyFileSync(alt, preferred);
    return preferred;
  }
  return null;
}

const summary = [];

for (const t of targets) {
  const url = `${site}${t.path}`;
  const jsonPath = resolve(outDir, `lighthouse-${t.id}.json`);
  const htmlPath = resolve(outDir, `lighthouse-${t.id}.html`);
  console.log(`Lighthouse mobile → ${url}`);

  const run = runLighthouse(url, jsonPath, htmlPath);
  if (!run.ok) {
    console.error(run.err);
    console.error(`Failed for ${t.id} (is the site up at ${site}?)`);
    process.exit(1);
  }

  const lhrFile = resolveJson(t.id, jsonPath);
  if (!lhrFile) {
    console.error(`No LHR JSON for ${t.id}`);
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(lhrFile, 'utf8'));
  const perf = raw.categories?.performance?.score;
  const lcp = raw.audits?.['largest-contentful-paint']?.numericValue;
  const cls = raw.audits?.['cumulative-layout-shift']?.numericValue;
  const score = perf == null ? null : Math.round(perf * 100);

  summary.push({
    id: t.id,
    url,
    performance: score,
    lcpMs: lcp == null ? null : Math.round(lcp),
    cls: cls == null ? null : Number(Number(cls).toFixed(3)),
    pass:
      score != null &&
      score >= 95 &&
      (lcp == null || lcp <= 2000) &&
      (cls == null || cls <= 0.02),
  });
}

const md = [
  '# Lighthouse mobile (prompt 16)',
  '',
  `Site: \`${site}\``,
  `Generated: ${new Date().toISOString()}`,
  '',
  '| Page | Perf | LCP (ms) | CLS | Pass (≥95, LCP≤2000, CLS≤0.02) |',
  '|---|---:|---:|---:|---|',
  ...summary.map(
    (s) =>
      `| ${s.id} ([html](./lighthouse-${s.id}.html)) | ${s.performance ?? '—'} | ${s.lcpMs ?? '—'} | ${s.cls ?? '—'} | ${s.pass ? 'yes' : 'no'} |`,
  ),
  '',
  'Targets: performance ≥ 95, LCP ≤ 2.0 s, CLS ≤ 0.02 (AC-14).',
  'Against `astro dev` on localhost, LCP often misses; re-run with `SITE_URL` set to a production or preview deploy for the gate.',
  '',
  'Raw JSON beside each HTML report.',
  '',
].join('\n');

writeFileSync(resolve(outDir, 'lighthouse.md'), md);
writeFileSync(resolve(outDir, 'lighthouse-summary.json'), JSON.stringify(summary, null, 2));
console.log(md);

const failed = summary.filter((s) => !s.pass);
if (failed.length) {
  console.error('Lighthouse thresholds not met for:', failed.map((s) => s.id).join(', '));
  if (process.env.LH_SOFT === '1') {
    console.error('LH_SOFT=1 — report saved; re-run against a production/preview URL for the ≥95 gate.');
    process.exit(0);
  }
  process.exit(1);
}
