import { afterEach, describe, expect, it, vi } from 'vitest';
import { createShopifyProvider } from './shopify';

describe('createShopifyProvider', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  it('maps a Storefront product to PieceCommerce', async () => {
    process.env.SHOPIFY_STORE_DOMAIN = 'example.myshopify.com';
    process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN = 'tok';
    process.env.SHOPIFY_API_VERSION = '2026-10';

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          data: {
            product: {
              id: 'gid://shopify/Product/1',
              handle: 'definition-tee-white',
              title: 'Definition Tee · White',
              availableForSale: true,
              publishedAt: '2026-01-01T00:00:00Z',
              priceRange: { minVariantPrice: { amount: '85.0', currencyCode: 'GBP' } },
              edition: { value: '5' },
              variants: {
                nodes: [
                  {
                    id: 'gid://shopify/ProductVariant/1',
                    availableForSale: true,
                    quantityAvailable: 2,
                    selectedOptions: [{ name: 'Size', value: 'L' }],
                    price: { amount: '85.0', currencyCode: 'GBP' },
                  },
                  {
                    id: 'gid://shopify/ProductVariant/2',
                    availableForSale: false,
                    quantityAvailable: 0,
                    selectedOptions: [{ name: 'Size', value: 'S' }],
                    price: { amount: '85.0', currencyCode: 'GBP' },
                  },
                ],
              },
            },
          },
        }),
      ),
    );

    const p = createShopifyProvider();
    const piece = await p.getPiece('definition-tee-white');
    expect(piece).toMatchObject({
      handle: 'definition-tee-white',
      editionSize: 5,
      price: { amount: '85.0', currency: 'GBP' },
    });
    expect(piece?.variants.find((v) => v.size === 'L')?.quantityAvailable).toBe(2);
    expect(piece?.variants.find((v) => v.size === 'S')?.availableForSale).toBe(false);
  });

  it('coerces null quantityAvailable from inventory-scope gaps', async () => {
    process.env.SHOPIFY_STORE_DOMAIN = 'example.myshopify.com';
    process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN = 'tok';

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          errors: [
            {
              message: 'Access denied for quantityAvailable field.',
              extensions: { code: 'ACCESS_DENIED' },
            },
          ],
          data: {
            product: {
              id: 'gid://shopify/Product/1',
              handle: 'wordmark-tee-bone',
              title: 'Wordmark Tee · Bone',
              availableForSale: true,
              publishedAt: '2026-01-01T00:00:00Z',
              priceRange: { minVariantPrice: { amount: '75.0', currencyCode: 'EUR' } },
              edition: null,
              variants: {
                nodes: [
                  {
                    id: 'gid://shopify/ProductVariant/9',
                    availableForSale: true,
                    quantityAvailable: null,
                    selectedOptions: [{ name: 'Size', value: 'L' }],
                    price: { amount: '75.0', currencyCode: 'EUR' },
                  },
                ],
              },
            },
          },
        }),
      ),
    );

    const piece = await createShopifyProvider().getPiece('wordmark-tee-bone');
    expect(piece?.variants[0]?.quantityAvailable).toBe(1);
    expect(piece?.editionSize).toBe(5);
  });

  it('returns an empty cart when no cart id is in context', async () => {
    process.env.SHOPIFY_STORE_DOMAIN = 'example.myshopify.com';
    process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN = 'tok';
    const cart = await createShopifyProvider({ cartId: null }).getCart();
    expect(cart).toEqual({ id: 'empty', checkoutUrl: null, lines: [] });
  });
});
