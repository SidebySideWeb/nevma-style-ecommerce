import { AsyncLocalStorage } from 'node:async_hooks';

export type CommerceRequestContext = {
  cartId: string | null;
  buyerIp: string | null;
};

const als = new AsyncLocalStorage<CommerceRequestContext>();

export function runWithCommerceContext<T>(
  ctx: CommerceRequestContext,
  fn: () => T,
): T {
  return als.run(ctx, fn);
}

export function getCommerceContext(): CommerceRequestContext {
  return als.getStore() ?? { cartId: null, buyerIp: null };
}
