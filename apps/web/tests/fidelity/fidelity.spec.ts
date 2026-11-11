/**
 * NEVMA Style — design fidelity tests.
 * For every designed page and state (pages.json, generated from design/build/blocks.json) and both widths:
 *   1. the page has the same blocks, in the same order (data-block ids)
 *   2. each block's height is within ±2% of the design
 *   3. each block's text is the same, word for word
 *   4. each text element has the same type and colour (family, size, weight, style, letter spacing,
 *      line height, case, colour, decoration) and every background colour matches, in order
 *   5. each block differs from the design in at most 0.1% of its pixels (pixelmatch threshold 0.02),
 *      with photos hidden on both sides (photos come from Sanity's CDN with their own crops)
 * Nothing here may be loosened to make a page pass. Fix the page. See docs/FIDELITY.md.
 */
import { test, expect, type Page, type Locator } from '@playwright/test';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import pages from './pages.json' with { type: 'json' };

const SELF = process.env.FIDELITY_SELFTEST === '1';
const SITE = (SELF ? process.env.SELFTEST_SITE_URL || process.env.DESIGN_URL || 'http://localhost:4400' : process.env.SITE_URL || 'http://localhost:4321').replace(/\/$/, '');
const DESIGN = (process.env.DESIGN_URL || 'http://localhost:4400').replace(/\/$/, '');
const FIXED_NOW = '2026-10-23T13:00:00Z';
const MAX_PIXEL_RATIO = 0.001;
const HEIGHT_TOLERANCE = 0.02;
const ONLY = process.env.FIDELITY_ONLY ? new RegExp(process.env.FIDELITY_ONLY) : null;

const TEST_CSS = `
  img, picture, video, iframe { visibility: hidden !important; }
  [data-block="header"] { position: relative !important; }
  *, *::before, *::after { caret-color: transparent !important; transition: none !important; animation: none !important; }
  [data-fidelity-ignore] { visibility: hidden !important; }
`;

type Step = { click?: { role: string; name: string; scope?: string }; fill?: { label: string; value: string; scope?: string }; fillForm?: { scope: string } };

async function open(page: Page, url: string, fixture: string, steps: Step[]) {
  await page.clock.setFixedTime(new Date(FIXED_NOW));
  if (fixture) await page.context().addCookies([{ name: 'nv_fixture', value: fixture, url }]);
  await page.goto(url, { waitUntil: 'networkidle' });
  for (const s of steps) {
    const scope = (n?: string) => (n ? page.locator(`[data-block="${n}"]`) : page.locator('body'));
    if (s.click) await scope(s.click.scope).getByRole(s.click.role as never, { name: new RegExp(s.click.name, 'i') }).first().click();
    if (s.fill) await scope(s.fill.scope).getByLabel(s.fill.label).first().fill(s.fill.value);
    if (s.fillForm) {
      const f = scope(s.fillForm.scope);
      for (const el of await f.locator('input[required], textarea[required]').all()) {
        const type = await el.getAttribute('type');
        await el.fill(type === 'email' ? 'alex.morgan@example.com' : 'Test');
      }
    }
    await page.waitForLoadState('networkidle');
  }
  await page.addStyleTag({ content: TEST_CSS });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
}

const blockIds = (page: Page) => page.evaluate(() =>
  [...document.querySelectorAll<HTMLElement>('[data-block]')]
    .filter((e) => getComputedStyle(e).display !== 'none')
    .map((e) => e.dataset.block!));

/** Text and style fingerprint of one block, in DOM order. */
function fingerprint(block: Locator) {
  return block.evaluate((root) => {
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
    const text: string[] = [];
    const styles: string[] = [];
    const bgs: string[] = [];
    const walk = (el: Element) => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'svg' || tag === 'script' || tag === 'style' || tag === 'template') return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none') return;
      if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') bgs.push(`${tag}: ${cs.backgroundColor}`);
      let own = '';
      for (const n of el.childNodes) if (n.nodeType === 3) own += n.textContent;
      if (tag === 'input' || tag === 'textarea') own = (el as HTMLInputElement).value || (el as HTMLInputElement).placeholder || '';
      own = norm(own);
      if (own) {
        text.push(own);
        styles.push([
          `"${own.slice(0, 40)}"`, cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), cs.fontSize, cs.fontWeight, cs.fontStyle,
          cs.letterSpacing, cs.lineHeight, cs.textTransform, cs.color, cs.textDecorationLine,
        ].join(' | '));
      }
      for (const c of el.children) walk(c);
    };
    walk(root);
    return { text, styles, bgs };
  });
}

function firstDiff(a: string[], b: string[]) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return `#${i}\n  site:   ${a[i] ?? '(missing)'}\n  design: ${b[i] ?? '(missing)'}`;
  return null;
}

function pad(png: PNG, w: number, h: number) {
  if (png.width === w && png.height === h) return png.data;
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) { out[i * 4] = 255; out[i * 4 + 1] = 0; out[i * 4 + 2] = 255; out[i * 4 + 3] = 255; }
  for (let y = 0; y < Math.min(h, png.height); y++) png.data.copy(out, y * w * 4, y * png.width * 4, y * png.width * 4 + Math.min(w, png.width) * 4);
  return out;
}

for (const p of pages as Array<{ slug: string; design: string; route: string; title: string; fixture: string; actions: Step[]; only: string | null; blocks: string[] }>) {
  if (ONLY && !ONLY.test(p.slug)) continue;
  test.describe(`${p.slug} · ${p.title}`, () => {
    test('blocks, text, styles, pixels', async ({ browser }, info) => {
      test.skip(!!p.only && info.project.name !== p.only, 'this state exists at the other width only');
      const ctxOpts = { viewport: info.project.use.viewport!, reducedMotion: 'reduce' as const, deviceScaleFactor: 1, locale: 'en-GB', timezoneId: 'Europe/London' };
      const dctx = await browser.newContext(ctxOpts);
      const sctx = await browser.newContext(ctxOpts);
      const d = await dctx.newPage();
      const s = await sctx.newPage();
      await open(d, `${DESIGN}/${p.design}`, '', []);
      await open(s, SELF ? `${SITE}/${p.design}` : `${SITE}${p.route}`, SELF ? '' : p.fixture, SELF ? [] : p.actions);

      const dIds = await blockIds(d);
      const sIds = await blockIds(s);
      expect(dIds, 'design blocks changed? regenerate pages.json').toEqual(p.blocks);
      expect(sIds, `blocks (data-block ids, in order) on ${p.route}`).toEqual(dIds);

      const problems: string[] = [];
      for (const id of dIds) {
        const db = d.locator(`[data-block="${id}"]`).first();
        const sb = s.locator(`[data-block="${id}"]`).first();
        const [dbox, sbox] = [await db.boundingBox(), await sb.boundingBox()];
        if (!dbox || !sbox) { problems.push(`[${id}] not visible`); continue; }
        if (Math.abs(sbox.height - dbox.height) > Math.max(2, dbox.height * HEIGHT_TOLERANCE))
          problems.push(`[${id}] height ${Math.round(sbox.height)} vs design ${Math.round(dbox.height)}`);

        const [fs, fd] = [await fingerprint(sb), await fingerprint(db)];
        const t = firstDiff(fs.text, fd.text); if (t) problems.push(`[${id}] text ${t}`);
        const st = firstDiff(fs.styles, fd.styles); if (st) problems.push(`[${id}] text style ${st}`);
        const bg = firstDiff(fs.bgs, fd.bgs); if (bg) problems.push(`[${id}] background ${bg}`);

        const [ps, pd] = [PNG.sync.read(await sb.screenshot({ animations: 'disabled', caret: 'hide' })), PNG.sync.read(await db.screenshot({ animations: 'disabled', caret: 'hide' }))];
        const w = Math.max(ps.width, pd.width), h = Math.max(ps.height, pd.height);
        const diff = new PNG({ width: w, height: h });
        const n = pixelmatch(pad(ps, w, h), pad(pd, w, h), diff.data, w, h, { threshold: 0.02 });
        const ratio = n / (w * h);
        if (ratio > MAX_PIXEL_RATIO) {
          problems.push(`[${id}] pixels ${(ratio * 100).toFixed(3)}% differ (max ${(MAX_PIXEL_RATIO * 100).toFixed(1)}%), ${n}px`);
          await info.attach(`${id}-diff.png`, { body: PNG.sync.write(diff), contentType: 'image/png' });
          await info.attach(`${id}-site.png`, { body: PNG.sync.write(ps), contentType: 'image/png' });
          await info.attach(`${id}-design.png`, { body: PNG.sync.write(pd), contentType: 'image/png' });
        }
      }
      await dctx.close(); await sctx.close();
      expect(problems, problems.join('\n')).toEqual([]);
    });
  });
}
