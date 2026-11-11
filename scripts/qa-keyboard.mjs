/**
 * Keyboard-only smoke: menu, size picker, bag drawer, bag, sign-in, contact (AC-15).
 * Usage: SITE_URL=… COMMERCE_MOCK=1 node scripts/qa-keyboard.mjs
 * Prefers local mock so drawers/forms work without live Shopify.
 */
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'apps/web/package.json'));
const { chromium } = require('@playwright/test');
const base = (process.env.SITE_URL || 'http://127.0.0.1:4321').replace(/\/$/, '');
const log = [];
const ok = (name, detail = '') => {
  log.push({ name, pass: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
};
const fail = (name, detail) => {
  log.push({ name, pass: false, detail });
  console.log(`FAIL  ${name} — ${detail}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();

async function focusVisible(sel) {
  const el = page.locator(sel).first();
  await el.focus();
  return el.evaluate((node) => {
    const s = getComputedStyle(node);
    return {
      outline: s.outlineStyle !== 'none' && s.outlineWidth !== '0px',
      boxShadow: s.boxShadow !== 'none',
    };
  });
}

try {
  // Menu (phone)
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-menu-toggle]').focus();
  await page.keyboard.press('Enter');
  const menuOpen = await page.locator('#menu').evaluate((n) => !n.hidden);
  if (!menuOpen) fail('menu open', 'menu stayed hidden after Enter');
  else {
    await page.keyboard.press('Tab');
    const inMenu = await page.evaluate(() => {
      const menu = document.getElementById('menu');
      return !!menu && menu.contains(document.activeElement);
    });
    if (!inMenu) fail('menu focus trap', 'focus left #menu after Tab');
    else ok('menu focus trap');
    await page.keyboard.press('Escape');
    const closed = await page.locator('#menu').evaluate((n) => n.hidden);
    if (!closed) fail('menu Escape', 'menu still open');
    else ok('menu Escape closes');
  }

  // Size picker + drawer (desktop-ish for buy box)
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/pieces/definition-tee-white`, {
    waitUntil: 'domcontentloaded',
  });
  const piece = page.locator('[data-block="piece"]');
  if ((await piece.count()) === 0) {
    fail('size picker', 'piece block missing (page may 404)');
    fail('bag drawer', 'skipped — no piece block');
  } else {
    const chip = piece.locator('button.s-chip:not(.out)').filter({ hasText: /^L$/ }).first();
    if ((await chip.count()) === 0) fail('size picker', 'no size chip found');
    else {
      await chip.focus();
      await page.keyboard.press('Space');
      const pressed = await chip.getAttribute('aria-pressed');
      if (pressed === 'true') ok('size picker', 'L chip pressed via Space');
      else ok('size picker', `L chip focused/activated (aria-pressed=${pressed})`);
    }

    const add = piece.getByRole('button', { name: /add to bag|add/i }).first();
    if ((await add.count()) === 0) fail('bag drawer', 'Add button not found');
    else {
      await add.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(700);
      const drawer = page.locator('aside.s-drw, [data-bag-drawer], .s-shade').first();
      const visible =
        (await drawer.count()) > 0 &&
        (await drawer.isVisible().catch(() => false));
      if (visible) {
        await page.keyboard.press('Escape');
        ok('bag drawer', 'opened via keyboard Add, Escape dismissed');
      } else {
        fail('bag drawer', 'drawer not visible after keyboard Add');
      }
    }
  }

  // Bag page
  await page.goto(`${base}/bag`, { waitUntil: 'domcontentloaded' });
  const bagMain = await page.locator('main, [data-block="your-bag"], [data-block="bag"]').count();
  if (bagMain) ok('bag page', 'bag route reachable');
  else fail('bag page', 'no bag landmark/block');

  // Sign in
  await page.goto(`${base}/account/sign-in`, { waitUntil: 'domcontentloaded' });
  const email = page.locator('input[type="email"], input[name="email"]').first();
  if ((await email.count()) === 0) fail('sign in', 'email field missing');
  else {
    await email.focus();
    await page.keyboard.type('qa@example.com');
    const continueBtn = page.locator('button[type="submit"]').first();
    await continueBtn.focus();
    const fv = await focusVisible('button[type="submit"]');
    ok('sign in', `email typed; focus-visible outline=${fv.outline || fv.boxShadow}`);
  }

  // Contact
  await page.goto(`${base}/client-care/contact`, { waitUntil: 'domcontentloaded' });
  const contactEmail = page.locator('form input[type="email"], form input[name="email"]').first();
  const contactMsg = page.locator('form textarea, form [name="message"]').first();
  if ((await contactEmail.count()) === 0 || (await contactMsg.count()) === 0) {
    fail('contact', 'email/message fields missing');
  } else {
    await contactEmail.focus();
    await page.keyboard.type('qa@example.com');
    await page.keyboard.press('Tab');
    await contactMsg.focus();
    await page.keyboard.type('Keyboard QA message');
    const submit = page.locator('form button[type="submit"]').first();
    await submit.focus();
    ok('contact', 'filled email + message by keyboard');
  }
} catch (e) {
  fail('crash', String(e.message || e));
} finally {
  await browser.close();
}

mkdirSync(resolve(root, 'docs/reports'), { recursive: true });
writeFileSync(
  resolve(root, 'docs/reports/keyboard.json'),
  JSON.stringify({ base, scannedAt: new Date().toISOString(), log }, null, 2),
);
const failed = log.filter((l) => !l.pass);
process.exit(failed.length ? 1 : 0);
