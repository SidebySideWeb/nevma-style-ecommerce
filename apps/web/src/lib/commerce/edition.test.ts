import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  cardTag,
  describeEdition,
  dropTotals,
  editionState,
  leftCount,
  meter,
  meterLine,
  shortLine,
  sizeChipAria,
  sizeNote,
  sizeSummary,
  soldOutDetail,
  stockLine,
} from './edition';
import type { PieceCommerce } from './types';

const text = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../../../../design/build/text.json'),
    'utf8',
  ),
) as Record<string, Record<string, string[]>>;

function has(page: string, block: string, phrase: string) {
  expect(text[page]?.[block] ?? []).toContain(phrase);
}

const white: PieceCommerce = {
  handle: 'definition-tee-white',
  published: true,
  price: { amount: '85.00', currency: 'EUR' },
  editionSize: 5,
  variants: [
    { id: 'S', size: 'S', quantityAvailable: 0, availableForSale: false },
    { id: 'M', size: 'M', quantityAvailable: 1, availableForSale: true },
    { id: 'L', size: 'L', quantityAvailable: 2, availableForSale: true },
    { id: 'XL', size: 'XL', quantityAvailable: 0, availableForSale: false },
  ],
};

describe('edition states and copy vs design/build/text.json', () => {
  it('counts left stock', () => {
    expect(leftCount(white.variants)).toBe(3);
  });

  it('derives upcoming / available / last-piece / sold-out', () => {
    expect(
      editionState({ published: false, variants: white.variants, now: Date.parse('2026-10-23T13:00:00Z') }),
    ).toBe('upcoming');
    expect(
      editionState({
        published: true,
        variants: white.variants,
        opensAt: '2026-12-04T18:00:00Z',
        now: Date.parse('2026-10-23T13:00:00Z'),
      }),
    ).toBe('upcoming');
    expect(editionState({ published: true, variants: white.variants })).toBe('available');
    expect(
      editionState({
        published: true,
        variants: white.variants.map((v) => ({
          ...v,
          quantityAvailable: v.size === 'L' ? 1 : 0,
        })),
      }),
    ).toBe('last-piece');
    expect(
      editionState({
        published: true,
        variants: white.variants.map((v) => ({ ...v, quantityAvailable: 0 })),
      }),
    ).toBe('sold-out');
  });

  it('meter pip counts', () => {
    expect(meter('upcoming', 0, 5)).toEqual({ filled: 5, total: 5, dashed: true });
    expect(meter('available', 3, 5)).toEqual({ filled: 3, total: 5, dashed: false });
    expect(meter('last-piece', 1, 5)).toEqual({ filled: 1, total: 5, dashed: false });
    expect(meter('sold-out', 0, 5)).toEqual({ filled: 0, total: 5, dashed: false });
  });

  it('stock / short / meter / card lines match the design', () => {
    has('home', 'the-pieces', '3 of 5 left');
    has('home', 'the-pieces', 'Last piece');
    has('home', 'the-pieces', 'Last piece of five');
    has('home', 'the-pieces', 'Sold out');
    has('home', 'the-pieces', 'All five have found a home');
    has('home', 'signal', 'Edition of 5');
    has('pieces', 'pieces', 'Edition of 5 · coming');

    expect(stockLine('available', 3, 5)).toBe('3 of 5 left');
    expect(stockLine('last-piece', 1, 5)).toBe('Last piece of five');
    expect(stockLine('sold-out', 0, 5)).toBe('Sold out');
    expect(stockLine('upcoming', 0, 5)).toBe('Edition of 5');

    expect(shortLine('available', 3, 5)).toBe('3 of 5 left');
    expect(shortLine('last-piece', 1, 5)).toBe('Last piece');
    expect(shortLine('sold-out', 0, 5)).toBe('Sold out');
    expect(shortLine('upcoming', 0, 5)).toBe('Edition of 5 · coming');

    expect(meterLine('sold-out', 0, 5)).toBe('All five have found a home');
    expect(cardTag('available', 3, 5)).toBe('3 of 5 left');
    expect(soldOutDetail(5)).toBe('All five have found a home. This piece will not be made again.');
    has('product-sold', 'piece', 'All five have found a home. This piece will not be made again.');
  });

  it('size chip aria and size notes', () => {
    expect(sizeChipAria('S', 0)).toBe('S, sold out');
    expect(sizeChipAria('M', 1)).toBe('M, last one');
    expect(sizeChipAria('L', 2)).toBe('L, 2 left');

    expect(sizeNote(null)).toBe('Crossed-out sizes are sold out.');
    has('product', 'piece', 'Crossed-out sizes are sold out.');
    expect(sizeNote('L', 2)).toBe('L · 2 left in this size');
    has('product~size', 'piece', 'L · 2 left in this size');
    expect(sizeNote('L', 1)).toBe('L · the last one in this size');
  });

  it('size summaries for drop and category', () => {
    const variants = white.variants;
    const drop = sizeSummary(variants, { includeGone: true });
    expect(drop).toBe('Available in M (1) and L (2). S and XL are gone.');
    has('drop', 'drop-pieces', drop);

    const category = sizeSummary(variants, { includeGone: false });
    expect(category).toBe('Available in M (1) and L (2).');
    has('category', 'featured-piece', category);

    expect(
      sizeSummary(
        white.variants.map((v) => ({
          ...v,
          quantityAvailable: v.size === 'L' ? 1 : 0,
        })),
      ),
    ).toBe('Last piece: size L.');
    has('drop', 'drop-pieces', 'Last piece: size L.');

    expect(
      sizeSummary(white.variants.map((v) => ({ ...v, quantityAvailable: 0 }))),
    ).toBe('No sizes left. This piece will not be made again.');
    has('drop', 'drop-pieces', 'No sizes left. This piece will not be made again.');
  });

  it('drop totals match home hero "4 of 15"', () => {
    const totals = dropTotals([
      { left: 3, editionSize: 5 },
      { left: 1, editionSize: 5 },
      { left: 0, editionSize: 5 },
    ]);
    expect(totals.label).toBe('4 of 15');
    has('home', 'hero', '4 of 15');
  });

  it('describeEdition bundles the white tee fixture', () => {
    const d = describeEdition(white);
    expect(d.state).toBe('available');
    expect(d.left).toBe(3);
    expect(d.stockLine).toBe('3 of 5 left');
  });
});
