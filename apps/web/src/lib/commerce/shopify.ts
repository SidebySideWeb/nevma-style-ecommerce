import type { CommerceProvider } from './types';

/**
 * Live Shopify Storefront + Customer Account provider.
 * Stub until prompt 12.
 */
export function createShopifyProvider(): CommerceProvider {
  const notReady = () => {
    throw new Error('Shopify provider is not implemented yet (prompt 12)');
  };

  return {
    name: 'shopify',
    getPieces: notReady,
    getPiece: notReady,
    getCart: notReady,
    addLine: notReady,
    removeLine: notReady,
    checkoutUrl: notReady,
    getCustomer: notReady,
    getWishlist: notReady,
  };
}
