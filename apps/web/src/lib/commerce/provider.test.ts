import { afterEach, describe, expect, it } from 'vitest';
import { createCommerceProvider, createFixtureProvider } from './provider';

describe('commerce provider factory', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it('chooses fixture when COMMERCE_MOCK=1', async () => {
    process.env.COMMERCE_ENABLED = 'true';
    process.env.COMMERCE_MOCK = '1';
    delete process.env.VERCEL_ENV;
    const p = createCommerceProvider();
    expect(p.name).toBe('fixture');
    const pieces = await p.getPieces(['definition-tee-white']);
    expect(pieces[0]?.price?.amount).toBe('85.00');
    expect(pieces[0]?.variants.find((v) => v.size === 'L')?.quantityAvailable).toBe(2);
  });

  it('applies nv_fixture last-piece overrides', async () => {
    delete process.env.VERCEL_ENV;
    const p = createFixtureProvider({ fixtureFlags: 'last-piece' });
    const piece = await p.getPiece('definition-tee-white');
    expect(piece?.variants.find((v) => v.size === 'L')?.quantityAvailable).toBe(1);
    expect(piece?.variants.reduce((s, v) => s + v.quantityAvailable, 0)).toBe(1);
  });

  it('refuses the fixture provider in Vercel production', () => {
    process.env.VERCEL_ENV = 'production';
    process.env.COMMERCE_MOCK = '1';
    expect(() => createFixtureProvider()).toThrow(/refused.*production/i);
  });

  it('chooses off when COMMERCE_ENABLED=false', async () => {
    const p = createCommerceProvider({
      commerceEnabled: false,
      phase1States: { 'definition-tee-white': 'available' },
    });
    expect(p.name).toBe('off');
    const piece = await p.getPiece('definition-tee-white');
    expect(piece?.price).toBeNull();
    expect(piece?.published).toBe(true);
  });

  it('chooses shopify stub otherwise', () => {
    const p = createCommerceProvider({ commerceEnabled: true, commerceMock: false });
    expect(p.name).toBe('shopify');
    expect(() => void p.getPiece('x')).toThrow(/prompt 12/i);
  });
});
