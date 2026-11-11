import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const styles = join(here, '../src/styles');
const designCss = join(here, '../../../design/build/css');
const designFonts = join(here, '../../../design/build/fonts');
const publicFonts = join(here, '../public/fonts');

function sameBytes(a: string, b: string) {
  return Buffer.compare(readFileSync(a), readFileSync(b)) === 0;
}

describe('design CSS is copied byte for byte', () => {
  const files = readdirSync(designCss).filter((name) => name === 'style.css' || name.startsWith('page-'));

  it('includes every design stylesheet', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const name of files) {
    it(name, () => {
      expect(sameBytes(join(styles, name), join(designCss, name))).toBe(true);
    });
  }
});

describe('self-hosted fonts', () => {
  it('rewrites fonts.css urls to /fonts/ and copies the files', () => {
    const design = readFileSync(join(designFonts, 'fonts.css'), 'utf8');
    const copied = readFileSync(join(styles, 'fonts.css'), 'utf8');
    expect(copied).toBe(design.replaceAll('url(', 'url(/fonts/'));
    const faces = readdirSync(designFonts).filter((name) => name.endsWith('.woff2'));
    expect(faces.length).toBeGreaterThan(0);
    for (const name of faces) {
      expect(existsSync(join(publicFonts, name))).toBe(true);
      expect(sameBytes(join(publicFonts, name), join(designFonts, name))).toBe(true);
    }
  });
});
