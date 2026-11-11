import { leftCount } from './edition';
import type { CommerceProvider, EditionState, PieceCommerce, Phase1State } from './types';

/**
 * Emergency switch (COMMERCE_ENABLED=false): no Shopify calls, no prices.
 * Piece state comes from Sanity `phase1State`.
 */
export function createOffProvider(
  phase1States: Record<string, Phase1State> = {},
): CommerceProvider {
  function fromPhase1(handle: string): PieceCommerce {
    const state: EditionState = phase1States[handle] ?? 'upcoming';
    const editionSize = 5;
    let quantities: number[];
    switch (state) {
      case 'sold-out':
        quantities = [0, 0, 0, 0];
        break;
      case 'last-piece':
        quantities = [0, 0, 1, 0];
        break;
      case 'available':
        quantities = [0, 1, 2, 0];
        break;
      default:
        quantities = [0, 0, 0, 0];
    }
    const sizes = ['S', 'M', 'L', 'XL'];
    return {
      handle,
      published: state !== 'upcoming',
      price: null,
      editionSize,
      variants: sizes.map((size, i) => ({
        id: `off:${handle}:${size}`,
        size,
        quantityAvailable: quantities[i] ?? 0,
        availableForSale: (quantities[i] ?? 0) > 0,
      })),
    };
  }

  return {
    name: 'off',
    async getPieces(handles) {
      return handles.map(fromPhase1);
    },
    async getPiece(handle) {
      return fromPhase1(handle);
    },
    async getCart() {
      return { id: 'off', checkoutUrl: null, lines: [] };
    },
    async addLine() {
      throw new Error('Commerce is switched off');
    },
    async removeLine() {
      throw new Error('Commerce is switched off');
    },
    async checkoutUrl() {
      return null;
    },
    async getCustomer() {
      return null;
    },
    async getWishlist() {
      return [];
    },
  };
}

export function offLeft(piece: PieceCommerce): number {
  return leftCount(piece.variants);
}
