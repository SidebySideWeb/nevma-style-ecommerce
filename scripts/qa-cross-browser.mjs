/**
 * Spot screenshots at 1440 / 1024 / 768 / 390 for Chromium, Firefox, WebKit.
 * Safari macOS/iOS real devices are not available on this Windows host — WebKit stands in.
 * Usage: SITE_URL=http://127.0.0.1:4322 node scripts/qa-cross-browser.mjs
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'apps/web/package.json'));
const { chromium, firefox, webkit } = require('@playwright/test');
const base = (process.env.SITE_URL || 'http://127.0.0.1:4321').replace(/\/$/, '');
const outDir = resolve(root, 'docs/reports/cross-browser');
mkdirSync(outDir, { recursive: true });

const widths = [1440, 1024, 768, 390];
const routes = ['/', '/pieces/definition-tee-white', '/bag', '/account/sign-in', '/client-care/contact'];
const engines = [
  { name: 'chromium', launcher: chromium },
  { name: 'firefox', launcher: firefox },
  { name: 'webkit', launcher: webkit },
];

const summary = [];
for (const eng of engines) {
  let browser;
  try {
    browser = await eng.launcher.launch();
  } catch (e) {
    summary.push({ engine: eng.name, error: String(e.message || e) });
    console.log(`SKIP ${eng.name}: ${e.message || e}`);
    continue;
  }
  for (const w of widths) {
    const page = await browser.newPage({ viewport: { width: w, height: w <= 390 ? 844 : 900 } });
    for (const path of routes) {
      const slug = path === '/' ? 'home' : path.replace(/^\//, '').replace(/[/?=&]/g, '-');
      const file = `${eng.name}-${w}-${slug}.png`;
      try {
        const res = await page.goto(`${base}${path}`, {
          waitUntil: 'domcontentloaded',
          timeout: 45_000,
        });
        await page.waitForTimeout(300);
        await page.screenshot({ path: resolve(outDir, file), fullPage: false });
        summary.push({ engine: eng.name, width: w, path, status: res?.status(), file });
        console.log(`OK   ${eng.name} ${w} ${path} → ${file}`);
      } catch (e) {
        summary.push({ engine: eng.name, width: w, path, error: String(e.message || e) });
        console.log(`FAIL ${eng.name} ${w} ${path}: ${e.message || e}`);
      }
    }
    await page.close();
  }
  await browser.close();
}

writeFileSync(resolve(outDir, 'summary.json'), JSON.stringify({ base, summary }, null, 2));
console.log(`\nWrote ${outDir}`);
const fails = summary.filter((s) => s.error);
process.exit(fails.length ? 1 : 0);
