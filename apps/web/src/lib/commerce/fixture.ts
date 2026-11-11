import fixtureData from '../../../fixtures/commerce.json' with { type: 'json' };
import type {
  Address,
  Cart,
  CartLine,
  CommerceProvider,
  Customer,
  Money,
  Order,
  PieceCommerce,
  PieceVariant,
} from './types';

type FixtureProduct = (typeof fixtureData.products)[number];
type FixtureCart = (typeof fixtureData.carts)[keyof typeof fixtureData.carts];

function refuseProduction(): void {
  if (process.env.VERCEL_ENV === 'production') {
    throw new Error('COMMERCE_MOCK / fixture provider is refused when VERCEL_ENV=production');
  }
}

function parseFlags(cookie?: string | null): Set<string> {
  if (!cookie) return new Set();
  return new Set(
    cookie
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function money(amount: string | null | undefined, currency = 'GBP'): Money | null {
  if (amount == null) return null;
  return { amount, currency };
}

function applyOverrides(
  product: FixtureProduct,
  flags: Set<string>,
): PieceVariant[] {
  let overrides: Record<string, number> | undefined;
  for (const flag of flags) {
    const byHandle = (fixtureData.stateOverrides as Record<string, Record<string, Record<string, number>>>)[
      flag
    ];
    if (byHandle?.[product.handle]) {
      overrides = byHandle[product.handle];
      break;
    }
  }
  return product.variants.map((v) => {
    const qty = overrides?.[v.size] ?? v.quantityAvailable;
    return {
      id: v.id,
      size: v.size,
      quantityAvailable: qty,
      availableForSale: qty > 0,
    };
  });
}

function toPiece(product: FixtureProduct, flags: Set<string>): PieceCommerce {
  return {
    handle: product.handle,
    title: product.title,
    published: product.published,
    price: product.price
      ? { amount: product.price.amount, currency: product.price.currencyCode }
      : null,
    editionSize: product.editionSize,
    variants: applyOverrides(product, flags),
  };
}

function pickCartKey(flags: Set<string>): keyof typeof fixtureData.carts {
  if (flags.has('bag-empty')) return 'bag-empty';
  if (flags.has('bag-sold') || flags.has('bag-sold-while-in-bag')) return 'bag-sold-while-in-bag';
  if (flags.has('bag-normal')) return 'bag-normal';
  return 'default';
}

function resolveCart(flags: Set<string>): Cart {
  const key = pickCartKey(flags);
  const raw = fixtureData.carts[key] as FixtureCart;
  const products = new Map(fixtureData.products.map((p) => [p.handle, p]));
  const lines: CartLine[] = raw.lines.map((line, i) => {
    const product = products.get(line.handle)!;
    const variant = product.variants.find((v) => v.size === line.size)!;
    const sold = 'soldWhileInBag' in line && Boolean(line.soldWhileInBag);
    return {
      id: `line-${key}-${i}`,
      variantId: variant.id,
      handle: line.handle,
      title: product.title,
      size: line.size,
      quantity: line.quantity,
      price: money(product.price?.amount ?? '0')!,
      availableForSale: sold ? false : variant.availableForSale,
      quantityAvailable: sold ? 0 : variant.quantityAvailable,
      ...(sold ? { soldWhileInBag: true } : {}),
    };
  });
  return {
    id: `fixture-cart-${key}`,
    checkoutUrl: lines.length ? 'https://checkout.example/fixture' : null,
    lines,
  };
}

function toCustomer(): Customer {
  const c = fixtureData.customer['signed-in'];
  return {
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    addresses: c.addresses as Address[],
    orders: c.orders as Order[],
    prefs: c.prefs,
  };
}

export type FixtureOptions = {
  /** Value of the `nv_fixture` cookie (comma-separated flags). */
  fixtureFlags?: string | null;
};

export function createFixtureProvider(opts: FixtureOptions = {}): CommerceProvider {
  refuseProduction();
  const flags = parseFlags(opts.fixtureFlags);
  let cart = resolveCart(flags);

  return {
    name: 'fixture',
    async getPieces(handles) {
      refuseProduction();
      const wanted = new Set(handles);
      return fixtureData.products.filter((p) => wanted.has(p.handle)).map((p) => toPiece(p, flags));
    },
    async getPiece(handle) {
      refuseProduction();
      const product = fixtureData.products.find((p) => p.handle === handle);
      return product ? toPiece(product, flags) : null;
    },
    async getCart() {
      refuseProduction();
      return cart;
    },
    async addLine(variantId) {
      refuseProduction();
      const product = fixtureData.products.find((p) => p.variants.some((v) => v.id === variantId));
      const variant = product?.variants.find((v) => v.id === variantId);
      if (!product || !variant) throw new Error('Unknown variant');
      const existing = cart.lines.findIndex((l) => l.handle === product.handle);
      const line: CartLine = {
        id: `line-add-${variantId}`,
        variantId,
        handle: product.handle,
        title: product.title,
        size: variant.size,
        quantity: 1,
        price: money(product.price?.amount ?? '0')!,
        availableForSale: variant.availableForSale,
        quantityAvailable: variant.quantityAvailable,
      };
      const lines = [...cart.lines];
      if (existing >= 0) lines[existing] = line;
      else lines.push(line);
      cart = { ...cart, lines, checkoutUrl: 'https://checkout.example/fixture' };
      return cart;
    },
    async removeLine(lineId) {
      refuseProduction();
      cart = {
        ...cart,
        lines: cart.lines.filter((l) => l.id !== lineId),
        checkoutUrl: cart.lines.length > 1 ? cart.checkoutUrl : null,
      };
      return cart;
    },
    async checkoutUrl() {
      refuseProduction();
      return cart.checkoutUrl;
    },
    async getCustomer() {
      refuseProduction();
      // Only the `signed-in` fixture exposes Alex; everyone else is a guest.
      return flags.has('signed-in') ? toCustomer() : null;
    },
    async getWishlist() {
      refuseProduction();
      return [...fixtureData.wishlist];
    },
  };
}
