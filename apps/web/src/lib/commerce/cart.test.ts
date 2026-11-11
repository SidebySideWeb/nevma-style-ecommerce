import { describe, expect, it } from 'vitest';
import { createFixtureProvider } from './fixture';

describe('cart rules (fixture provider)', () => {
  it('quantity is always 1 and a second size of the same piece replaces the first', async () => {
    const p = createFixtureProvider({ fixtureFlags: 'bag-empty' });
    const whiteL = 'gid://shopify/ProductVariant/definition-tee-white-L';
    const whiteM = 'gid://shopify/ProductVariant/definition-tee-white-M';

    let cart = await p.addLine(whiteL);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]?.size).toBe('L');
    expect(cart.lines[0]?.quantity).toBe(1);

    cart = await p.addLine(whiteM);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]?.handle).toBe('definition-tee-white');
    expect(cart.lines[0]?.size).toBe('M');
    expect(cart.lines[0]?.quantity).toBe(1);
  });

  it('different pieces can sit side by side', async () => {
    const p = createFixtureProvider({ fixtureFlags: 'bag-empty' });
    await p.addLine('gid://shopify/ProductVariant/definition-tee-white-L');
    const cart = await p.addLine('gid://shopify/ProductVariant/wordmark-tee-bone-L');
    expect(cart.lines.map((l) => l.handle).sort()).toEqual([
      'definition-tee-white',
      'wordmark-tee-bone',
    ]);
  });

  it('bag-normal / bag-sold-while-in-bag / bag-empty fixtures', async () => {
    const normal = await createFixtureProvider({ fixtureFlags: 'bag-normal' }).getCart();
    expect(normal.lines).toHaveLength(2);

    const sold = await createFixtureProvider({
      fixtureFlags: 'bag-sold-while-in-bag',
    }).getCart();
    expect(sold.lines).toHaveLength(2);
    expect(sold.lines.filter((l) => l.soldWhileInBag)).toHaveLength(1);
    expect(sold.lines.find((l) => l.soldWhileInBag)?.handle).toBe('wordmark-tee-bone');

    const empty = await createFixtureProvider({ fixtureFlags: 'bag-empty' }).getCart();
    expect(empty.lines).toHaveLength(0);
    expect(empty.checkoutUrl).toBeNull();
  });

  it('removeLine drops a line and clears checkout when empty', async () => {
    const p = createFixtureProvider({ fixtureFlags: 'bag-normal' });
    let cart = await p.getCart();
    const id = cart.lines[0]!.id;
    cart = await p.removeLine(id);
    expect(cart.lines).toHaveLength(1);
    cart = await p.removeLine(cart.lines[0]!.id);
    expect(cart.lines).toHaveLength(0);
    expect(cart.checkoutUrl).toBeNull();
  });
});
