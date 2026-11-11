import { defineMiddleware } from 'astro:middleware';
import { maybeRefreshSession, readSession } from './lib/account/auth';
import { runWithCommerceContext } from './lib/commerce/request-context';
import { CART_COOKIE, readCookie } from './lib/server/cart-cookie';
import { isCommerceMock } from './lib/server/env';

/** Cart cookie + buyer IP for Storefront; refresh Customer Account tokens when needed. */
export const onRequest = defineMiddleware(async (context, next) => {
  const cookie = context.request.headers.get('cookie');
  const cartId = readCookie(cookie, CART_COOKIE);
  const forwarded = context.request.headers.get('x-forwarded-for');
  const buyerIp =
    context.clientAddress ||
    (forwarded ? forwarded.split(',')[0]?.trim() : null) ||
    null;

  return runWithCommerceContext({ cartId, buyerIp }, async () => {
    if (isCommerceMock()) return next();

    const session = await readSession(cookie);
    if (!session?.refreshToken) return next();

    const refreshed = await maybeRefreshSession(session);
    const response = await next();
    if (refreshed) {
      response.headers.append('Set-Cookie', refreshed.cookie);
    }
    return response;
  });
});
