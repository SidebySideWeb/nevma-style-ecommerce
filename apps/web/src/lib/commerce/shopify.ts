import { getCommerceContext } from './request-context';
import { storefrontGraphql } from './storefront';
import type { Cart, CartLine, CommerceProvider, Money, PieceCommerce, PieceVariant } from './types';

type SfMoney = { amount: string; currencyCode: string };
type SfOption = { name: string; value: string };
type SfVariant = {
  id: string;
  availableForSale: boolean;
  quantityAvailable: number | null;
  selectedOptions: SfOption[];
  price: SfMoney;
};
type SfProduct = {
  id: string;
  handle: string;
  title: string;
  availableForSale: boolean;
  publishedAt?: string | null;
  priceRange: { minVariantPrice: SfMoney };
  edition: { value: string } | null;
  variants: { nodes: SfVariant[] };
};

const PRODUCT_FIELDS = `
  id handle title availableForSale publishedAt
  priceRange { minVariantPrice { amount currencyCode } }
  edition: metafield(namespace: "nevma", key: "edition_size") { value }
  variants(first: 20) {
    nodes {
      id availableForSale quantityAvailable
      selectedOptions { name value }
      price { amount currencyCode }
    }
  }
`;

const CART_FIELDS = `
  id checkoutUrl
  lines(first: 50) {
    nodes {
      id quantity
      merchandise {
        ... on ProductVariant {
          id availableForSale quantityAvailable
          selectedOptions { name value }
          price { amount currencyCode }
          product { handle title }
        }
      }
    }
  }
`;

type SfCartLineNode = {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    availableForSale: boolean;
    quantityAvailable: number | null;
    selectedOptions: SfOption[];
    price: SfMoney;
    product: { handle: string; title: string };
  } | null;
};

type SfCart = {
  id: string;
  checkoutUrl: string | null;
  lines: { nodes: SfCartLineNode[] };
};

function money(m: SfMoney | null | undefined): Money {
  return { amount: m?.amount ?? '0', currency: m?.currencyCode ?? 'EUR' };
}

/** When Headless lacks inventory scope, quantityAvailable is null — coerce from availableForSale. */
function qty(availableForSale: boolean, quantityAvailable: number | null | undefined): number {
  if (typeof quantityAvailable === 'number' && Number.isFinite(quantityAvailable)) {
    return Math.max(0, quantityAvailable);
  }
  return availableForSale ? 1 : 0;
}

function sizeOf(options: SfOption[]): string {
  const size = options.find((o) => o.name.toLowerCase() === 'size');
  return size?.value || options[0]?.value || '';
}

function toPiece(p: SfProduct): PieceCommerce {
  const editionRaw = p.edition?.value ? Number.parseInt(p.edition.value, 10) : NaN;
  const variants: PieceVariant[] = p.variants.nodes.map((v) => ({
    id: v.id,
    size: sizeOf(v.selectedOptions),
    quantityAvailable: qty(v.availableForSale, v.quantityAvailable),
    availableForSale: v.availableForSale && qty(v.availableForSale, v.quantityAvailable) > 0,
  }));
  return {
    handle: p.handle,
    title: p.title,
    published: Boolean(p.publishedAt) || p.availableForSale || variants.some((v) => v.availableForSale),
    price: money(p.priceRange.minVariantPrice),
    editionSize: Number.isFinite(editionRaw) && editionRaw > 0 ? editionRaw : 5,
    variants,
  };
}

function toCart(cart: SfCart | null | undefined): Cart {
  if (!cart) return { id: 'empty', checkoutUrl: null, lines: [] };
  const lines: CartLine[] = [];
  for (const node of cart.lines.nodes) {
    const m = node.merchandise;
    if (!m?.product) continue;
    const quantityAvailable = qty(m.availableForSale, m.quantityAvailable);
    lines.push({
      id: node.id,
      variantId: m.id,
      handle: m.product.handle,
      title: m.product.title,
      size: sizeOf(m.selectedOptions),
      quantity: node.quantity,
      price: money(m.price),
      availableForSale: m.availableForSale && quantityAvailable > 0,
      quantityAvailable,
    });
  }
  return {
    id: cart.id,
    checkoutUrl: lines.length ? cart.checkoutUrl : null,
    lines,
  };
}

function emptyCart(id?: string | null): Cart {
  return { id: id || 'empty', checkoutUrl: null, lines: [] };
}

async function fetchProductsByHandles(handles: string[]): Promise<SfProduct[]> {
  const unique = [...new Set(handles.filter(Boolean))];
  if (!unique.length) return [];
  // Storefront query string: handle:a OR handle:b
  const q = unique.map((h) => `handle:${h}`).join(' OR ');
  const data = await storefrontGraphql<{ products: { nodes: SfProduct[] } }>(
    `query Pieces($q: String!) {
      products(first: 50, query: $q) { nodes { ${PRODUCT_FIELDS} } }
    }`,
    { q },
  );
  return data.products.nodes;
}

async function fetchCart(cartId: string): Promise<SfCart | null> {
  const data = await storefrontGraphql<{ cart: SfCart | null }>(
    `query Cart($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`,
    { id: cartId },
  );
  return data.cart;
}

export type ShopifyProviderOptions = {
  cartId?: string | null;
  buyerIp?: string | null;
};

export function createShopifyProvider(opts: ShopifyProviderOptions = {}): CommerceProvider {
  const ctx = () => {
    const als = getCommerceContext();
    return {
      cartId: opts.cartId !== undefined ? opts.cartId : als.cartId,
      buyerIp: opts.buyerIp !== undefined ? opts.buyerIp : als.buyerIp,
    };
  };

  async function loadCart(): Promise<Cart> {
    const { cartId } = ctx();
    if (!cartId) return emptyCart();
    try {
      const cart = await fetchCart(cartId);
      return toCart(cart);
    } catch {
      return emptyCart(cartId);
    }
  }

  async function ensureCartId(): Promise<string> {
    const existing = await loadCart();
    if (existing.id && existing.id !== 'empty') return existing.id;
    const data = await storefrontGraphql<{
      cartCreate: { cart: SfCart | null; userErrors: { message: string }[] };
    }>(
      `mutation CreateCart($input: CartInput!) {
        cartCreate(input: $input) {
          cart { ${CART_FIELDS} }
          userErrors { message }
        }
      }`,
      { input: { buyerIdentity: { countryCode: 'GB' } } },
    );
    const err = data.cartCreate.userErrors?.[0]?.message;
    if (err) throw new Error(err);
    const id = data.cartCreate.cart?.id;
    if (!id) throw new Error('cartCreate returned no cart');
    return id;
  }

  return {
    name: 'shopify',

    async getPieces(handles) {
      const products = await fetchProductsByHandles(handles);
      const byHandle = new Map(products.map((p) => [p.handle, toPiece(p)]));
      return handles.map((h) => byHandle.get(h)).filter((p): p is PieceCommerce => Boolean(p));
    },

    async getPiece(handle) {
      const data = await storefrontGraphql<{ product: SfProduct | null }>(
        `query Piece($handle: String!) {
          product(handle: $handle) { ${PRODUCT_FIELDS} }
        }`,
        { handle },
      );
      return data.product ? toPiece(data.product) : null;
    },

    async getCart() {
      return loadCart();
    },

    async addLine(variantId) {
      let cartId = await ensureCartId();
      const cart = await fetchCart(cartId);
      const mapped = toCart(cart);

      // Resolve product handle for the new variant so we can replace same-piece lines.
      const variantData = await storefrontGraphql<{
        node: {
          id: string;
          product: { handle: string };
        } | null;
      }>(
        `query Variant($id: ID!) {
          node(id: $id) {
            ... on ProductVariant { id product { handle } }
          }
        }`,
        { id: variantId },
      );
      const handle = variantData.node?.product?.handle;
      if (handle) {
        const samePiece = mapped.lines.filter((l) => l.handle === handle);
        for (const line of samePiece) {
          if (line.variantId === variantId) return mapped;
          const removed = await storefrontGraphql<{
            cartLinesRemove: { cart: SfCart | null; userErrors: { message: string }[] };
          }>(
            `mutation Remove($cartId: ID!, $lineIds: [ID!]!) {
              cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
                cart { ${CART_FIELDS} }
                userErrors { message }
              }
            }`,
            { cartId, lineIds: [line.id] },
          );
          const err = removed.cartLinesRemove.userErrors?.[0]?.message;
          if (err) throw new Error(err);
          cartId = removed.cartLinesRemove.cart?.id || cartId;
        }
      }

      const added = await storefrontGraphql<{
        cartLinesAdd: { cart: SfCart | null; userErrors: { message: string }[] };
      }>(
        `mutation Add($cartId: ID!, $lines: [CartLineInput!]!) {
          cartLinesAdd(cartId: $cartId, lines: $lines) {
            cart { ${CART_FIELDS} }
            userErrors { message }
          }
        }`,
        { cartId, lines: [{ merchandiseId: variantId, quantity: 1 }] },
      );
      const err = added.cartLinesAdd.userErrors?.[0]?.message;
      if (err) throw new Error(err);
      return toCart(added.cartLinesAdd.cart);
    },

    async removeLine(lineId) {
      const { cartId } = ctx();
      if (!cartId) return emptyCart();
      const data = await storefrontGraphql<{
        cartLinesRemove: { cart: SfCart | null; userErrors: { message: string }[] };
      }>(
        `mutation Remove($cartId: ID!, $lineIds: [ID!]!) {
          cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
            cart { ${CART_FIELDS} }
            userErrors { message }
          }
        }`,
        { cartId, lineIds: [lineId] },
      );
      const err = data.cartLinesRemove.userErrors?.[0]?.message;
      if (err) throw new Error(err);
      return toCart(data.cartLinesRemove.cart);
    },

    async checkoutUrl() {
      const cart = await loadCart();
      return cart.checkoutUrl;
    },

    async getCustomer() {
      // Live path uses Customer Account API via account/load.ts
      return null;
    },

    async getWishlist() {
      // Live path uses Sanity customerProfile / ns_wishlist via wishlist.ts
      return [];
    },
  };
}
