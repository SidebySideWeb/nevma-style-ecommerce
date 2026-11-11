export type Money = {
  amount: string;
  currency: string;
};

export type PieceVariant = {
  id: string;
  size: string;
  quantityAvailable: number;
  availableForSale: boolean;
};

export type PieceCommerce = {
  handle: string;
  title?: string;
  published: boolean;
  price: Money | null;
  editionSize: number;
  variants: PieceVariant[];
};

export type CartLine = {
  id: string;
  variantId: string;
  handle: string;
  title: string;
  size: string;
  quantity: number;
  price: Money;
  availableForSale: boolean;
  quantityAvailable: number;
  soldWhileInBag?: boolean;
};

export type Cart = {
  id: string;
  checkoutUrl: string | null;
  lines: CartLine[];
};

export type Address = {
  id: string;
  label?: string;
  default?: boolean;
  lines: string[];
};

export type OrderLine = {
  handle: string;
  title: string;
  size: string;
  number?: number;
  price: string;
};

export type Order = {
  id?: string;
  name: string;
  processedAt: string;
  payment?: string;
  status: string;
  total?: string;
  tax?: string;
  summary?: string;
  timeline?: [string, string][];
  overviewTimeline?: [string, string][];
  lines?: OrderLine[];
  delivery?: string;
};

export type Customer = {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  addresses: Address[];
  orders: Order[];
  prefs?: { dropAlerts?: boolean; letter?: boolean; moments?: boolean };
};

export type EditionState = 'upcoming' | 'available' | 'last-piece' | 'sold-out';

export type Phase1State = EditionState;

export type CommerceProvider = {
  name: 'off' | 'fixture' | 'shopify';
  getPieces(handles: string[]): Promise<PieceCommerce[]>;
  getPiece(handle: string): Promise<PieceCommerce | null>;
  getCart(): Promise<Cart>;
  addLine(variantId: string): Promise<Cart>;
  removeLine(lineId: string): Promise<Cart>;
  checkoutUrl(): Promise<string | null>;
  getCustomer(): Promise<Customer | null>;
  getWishlist(): Promise<string[]>;
};
