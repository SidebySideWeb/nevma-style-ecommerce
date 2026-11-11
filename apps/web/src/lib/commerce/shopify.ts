import { createOffProvider } from './off';
import type { CommerceProvider } from './types';

/**
 * Live Shopify Storefront + Customer Account provider.
 * Prompt 12 still pending: until Storefront cart/product calls are wired, degrade to
 * the off provider so production pages (BagCount, PieceMeter, DropLeftStat) do not 500.
 */
export function createShopifyProvider(): CommerceProvider {
  const off = createOffProvider();
  return {
    ...off,
    name: 'shopify',
  };
}
