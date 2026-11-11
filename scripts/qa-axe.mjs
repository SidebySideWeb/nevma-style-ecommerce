/**
 * axe-core scan of every public route (AC-15).
 * Usage: SITE_URL=https://nevma-style.vercel.app node scripts/qa-axe.mjs
 *        (defaults to http://127.0.0.1:4321 — start `pnpm --filter web dev` first)
 */
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'apps/web/package.json'));
const { chromium } = require('@playwright/test');
const axeSource = require('axe-core').source;
const base = (process.env.SITE_URL || 'http://127.0.0.1:4321').replace(/\/$/, '');

const ROUTES = [
  '/',
  '/drops/style-001',
  '/pieces/definition-tee-white',
  '/pieces/suede-cap-sand',
  '/pieces',
  '/pieces?view=gallery',
  '/pieces?filter=available',
  '/pieces?filter=coming',
  '/pieces?filter=sold-out',
  '/categories/tees',
  '/categories/outerwear',
  '/categories/headwear',
  '/categories/silk',
  '/bag',
  '/account/sign-in',
  '/account/sign-in?mode=create',
  '/account',
  '/account/orders',
  '/account/addresses',
  '/account/profile',
  '/wishlist',
  '/story',
  '/client-care/shipping',
  '/client-care/returns',
  '/client-care/faq',
  '/client-care/contact',
  '/legal/terms',
  '/legal/privacy',
  '/legal/cookies',
  '/this-page-does-not-exist-404',
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const results = [];

for (const path of ROUTES) {
  const url = `${base}${path}`;
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(400);
    await page.addScriptTag({ content: axeSource });
    const axe = await page.evaluate(async () => {
      // eslint-disable-next-line no-undef
      const raw = await axe.run(document, {
        resultTypes: ['violations'],
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
        },
      });
      return {
        violations: raw.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.slice(0, 3).map((n) => ({
            target: n.target,
            html: n.html?.slice(0, 200),
            failureSummary: n.failureSummary?.slice(0, 300),
          })),
        })),
      };
    });
    const serious = (axe.violations || []).filter((v) =>
      ['critical', 'serious'].includes(v.impact),
    );
    results.push({
      path,
      status: res?.status() ?? 0,
      violations: axe.violations.length,
      serious: serious.length,
      ids: axe.violations.map((v) => `${v.impact}:${v.id}`),
      detail: serious,
    });
    const mark = serious.length ? 'FAIL' : axe.violations.length ? 'WARN' : 'OK';
    console.log(
      `${mark.padEnd(4)} ${path}  status=${res?.status()}  violations=${axe.violations.length} (serious=${serious.length})`,
    );
    if (serious.length) {
      for (const v of serious) {
        console.log(`       - ${v.id} (${v.impact}): ${v.help}`);
        for (const n of v.nodes || []) console.log(`         ${n.target?.join(' ')} :: ${n.html}`);
      }
    }
  } catch (e) {
    results.push({ path, error: String(e.message || e) });
    console.log(`ERR  ${path}  ${e.message || e}`);
  }
}

await browser.close();
mkdirSync(resolve(root, 'docs/reports'), { recursive: true });
const out = resolve(root, 'docs/reports/axe.json');
writeFileSync(out, JSON.stringify({ base, scannedAt: new Date().toISOString(), results }, null, 2));
const fails = results.filter((r) => r.serious > 0 || r.error);
console.log(`\nWrote ${out}`);
console.log(
  fails.length
    ? `${fails.length} route(s) with critical/serious or errors`
    : 'No critical/serious axe violations',
);
process.exit(fails.length ? 1 : 0);
