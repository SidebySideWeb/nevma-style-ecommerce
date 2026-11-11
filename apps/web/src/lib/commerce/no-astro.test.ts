import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

describe('commerce modules stay Astro-free', () => {
  for (const file of [
    'edition.ts',
    'format.ts',
    'shopify.ts',
    'storefront.ts',
    'request-context.ts',
    'fixture.ts',
    'off.ts',
    'types.ts',
  ]) {
    it(`${file} does not import from astro`, () => {
      const src = readFileSync(join(here, file), 'utf8');
      expect(src).not.toMatch(/from\s+['"]astro(?:\/|['"])/);
      expect(src).not.toMatch(/astro:env/);
    });
  }
});
