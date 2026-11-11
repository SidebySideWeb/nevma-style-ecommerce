import type { APIRoute } from 'astro';
import { prepareCheckout } from '../../lib/bag';
import {
  cartCookieHeader,
  clearFlashCookieHeader,
  flashCookieHeader,
} from '../../lib/server/cart-cookie';

/** Re-validate stock, then 303 to Shopify checkout (or back to /bag). */
export const GET: APIRoute = async ({ request }) => {
  const cookie = request.headers.get('cookie');
  const { url, cart, flash } = await prepareCheckout(cookie);

  const headers = new Headers();
  headers.append('set-cookie', cartCookieHeader(cart.id));
  if (flash?.sold.length) headers.append('set-cookie', flashCookieHeader(flash));
  else headers.append('set-cookie', clearFlashCookieHeader());

  if (!url) {
    headers.set('location', '/bag');
    return new Response(null, { status: 303, headers });
  }

  headers.set('location', url);
  return new Response(null, { status: 303, headers });
};

export const POST: APIRoute = GET;
