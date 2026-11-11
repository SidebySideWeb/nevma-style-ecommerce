import { defineConfig } from '@playwright/test';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// Fidelity tests: every designed page/state, block by block, at 1440 and 390, against design/build.
// SITE_URL   the built site (default: astro preview on 4321, started below unless SITE_URL is set)
// DESIGN_URL the frozen design (served by serve-design.mjs on 4400)
// FIDELITY_SELFTEST=1 points the "site" at the design itself (proves the harness; must pass)
const SELF = process.env.FIDELITY_SELFTEST === '1';
const SITE = process.env.SITE_URL || 'http://localhost:4321';
const DESIGN = process.env.DESIGN_URL || 'http://localhost:4400';

export default defineConfig({
  testDir: '.',
  testMatch: /fidelity\.spec\.ts$/,
  timeout: 90_000,
  fullyParallel: true,
  // One worker in CI: astro dev + parallel projects was racing product~added drawer open.
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: '../../fidelity-report' }]],
  outputDir: '../../test-results/fidelity',
  use: { reducedMotion: 'reduce', timezoneId: 'Europe/London', locale: 'en-GB', deviceScaleFactor: 1 },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: [
    { command: `node "${HERE}/serve-design.mjs"`, url: DESIGN + '/home.html', reuseExistingServer: true },
    // @astrojs/vercel does not support `astro preview`; local fidelity uses the dev server.
    ...(SELF || process.env.SITE_URL ? [] : [{ command: 'astro dev --port 4321 --host 127.0.0.1', cwd: dirname(dirname(HERE)), url: SITE, reuseExistingServer: true, timeout: 120_000,
      env: { COMMERCE_MOCK: '1', PUBLIC_FIXED_NOW: '2026-10-23T13:00:00Z' } }]),
  ],
});
