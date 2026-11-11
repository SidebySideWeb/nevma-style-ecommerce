import type { APIRoute } from 'astro';
import { createCommerceProvider } from '../../lib/commerce/provider';
import { formatSitePrice } from '../../lib/commerce/format';
import { fixtureFlagsFromCookie } from '../../lib/chrome';
import { drawerNote } from '../../lib/piece';
import { formError, parseForm, wantsJson } from '../../lib/server/http';
import { cartCookieHeader, readCookie } from '../../lib/server/cart-cookie';
import { isCommerceMock } from '../../lib/server/env';
import { addToWishlist } from '../../lib/server/sanity-write';
import { openSession } from '../../lib/server/session';
import { sanityConfigured, sanityFetch } from '../../lib/sanity/client';

const WISHLIST_COOKIE = 'ns_wishlist';
const WISHLIST_MAX_AGE = 60 * 60 * 24 * 365;

function wishlistCookie(handles: string[]): string {
  return `${WISHLIST_COOKIE}=${encodeURIComponent(JSON.stringify(handles))}; Path=/; SameSite=Lax; Max-Age=${WISHLIST_MAX_AGE}`;
}

function parseGuestWishlist(cookieHeader: string | null): string[] {
  const raw = readCookie(cookieHeader, WISHLIST_COOKIE);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
}

type SessionData = { customerId?: string; email?: string };

async function cartPayload(cart: Awaited<ReturnType<ReturnType<typeof createCommerceProvider>['getCart']>>) {
  const currency = cart.lines[0]?.price.currency || 'GBP';
  const subtotal = formatSitePrice(
    String(cart.lines.reduce((s, l) => s + Number.parseFloat(l.price.amount) * l.quantity, 0)),
    currency,
  );
  return {
    id: cart.id,
    checkoutUrl: cart.checkoutUrl,
    count: cart.lines.filter((l) => l.availableForSale && l.quantityAvailable > 0).length,
    subtotal,
  };
}

export const POST: APIRoute = async ({ request }) => {
  const cookie = request.headers.get('cookie');
  const body = await parseForm(request);
  const action = (body.action || 'add').trim();
  const provider = createCommerceProvider({
    fixtureFlags: fixtureFlagsFromCookie(cookie),
    cartId: readCookie(cookie, 'ns_cart'),
  });

  try {
    if (action === 'remove') {
      const lineId = (body.lineId || '').trim();
      if (!lineId) return formError(request, 'missing_line', 400, '/bag');
      const cart = await provider.removeLine(lineId);
      const payload = { ok: true, cart: await cartPayload(cart) };
      if (wantsJson(request)) {
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'set-cookie': cartCookieHeader(cart.id),
          },
        });
      }
      return new Response(null, {
        status: 303,
        headers: { location: '/bag', 'set-cookie': cartCookieHeader(cart.id) },
      });
    }

    if (action === 'move-to-wishlist') {
      const lineId = (body.lineId || '').trim();
      const handle = (body.handle || '').trim();
      const pieceId = (body.pieceId || '').trim();
      if (!lineId && !handle) return formError(request, 'missing_line', 400, '/bag');

      let cart = await provider.getCart();
      const line = lineId
        ? cart.lines.find((l) => l.id === lineId)
        : cart.lines.find((l) => l.handle === handle);
      if (line) cart = await provider.removeLine(line.id);

      const key = handle || line?.handle || '';
      let handles = parseGuestWishlist(cookie);
      if (key && !handles.includes(key)) handles = [...handles, key];

      const sessionTok = cookie?.match(/(?:^|;\s*)ns_session=([^;]*)/)?.[1];
      const session = sessionTok
        ? await openSession<SessionData>(decodeURIComponent(sessionTok))
        : null;
      if (session?.customerId && pieceId && !isCommerceMock()) {
        try {
          await addToWishlist(session.customerId, pieceId, session.email);
        } catch {
          /* guest cookie still updated */
        }
      }

      const payload = {
        ok: true,
        cart: await cartPayload(cart),
        wishlistCount: handles.length,
      };
      const cookies = [cartCookieHeader(cart.id), wishlistCookie(handles)];
      if (wantsJson(request)) {
        const headers = new Headers({
          'content-type': 'application/json; charset=utf-8',
        });
        for (const c of cookies) headers.append('set-cookie', c);
        return new Response(JSON.stringify(payload), { status: 200, headers });
      }
      const headers = new Headers({ location: '/bag' });
      for (const c of cookies) headers.append('set-cookie', c);
      return new Response(null, { status: 303, headers });
    }

    // Default: add
    const variantId = (body.variantId || '').trim();
    if (!variantId) return formError(request, 'missing_variant', 400, '/bag');

    const cart = await provider.addLine(variantId);
    const line = cart.lines.find((l) => l.variantId === variantId) || cart.lines.at(-1);
    if (!line) return formError(request, 'add_failed', 400, '/bag');

    let drawerTemplate =
      'Pieces are not held in a bag. {leftWords} Check out now to make it yours.';
    let imageSrc = '';
    let dropCode = '';
    if (sanityConfigured()) {
      try {
        const meta = await sanityFetch<{
          drawerNote?: string;
          photoUrl?: string;
          dropCode?: string;
        }>(
          `{
            "drawerNote": *[_id == "shopPages"][0].bag.drawerNote,
            "photoUrl": *[_type == "piece" && handle.current == $handle][0].cardPhoto.image.asset->url,
            "dropCode": *[_type == "piece" && handle.current == $handle][0].drop->code
          }`,
          { handle: line.handle },
        );
        if (meta.drawerNote) drawerTemplate = meta.drawerNote;
        if (meta.photoUrl) imageSrc = meta.photoUrl;
        if (meta.dropCode) dropCode = meta.dropCode;
      } catch {
        /* defaults */
      }
    }

    const price = formatSitePrice(line.price.amount, line.price.currency);
    const payload = {
      ok: true,
      cart: await cartPayload(cart),
      line: {
        handle: line.handle,
        title: line.title,
        size: line.size,
        price,
        quantityAvailable: line.quantityAvailable,
        imageSrc,
        dropCode,
        meta: `Size ${line.size}${dropCode ? ` · ${dropCode}` : ''}`,
        note: drawerNote(drawerTemplate, line.quantityAvailable),
      },
    };

    if (wantsJson(request)) {
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'set-cookie': cartCookieHeader(cart.id),
        },
      });
    }

    return new Response(null, {
      status: 303,
      headers: {
        location: '/bag',
        'set-cookie': cartCookieHeader(cart.id),
      },
    });
  } catch {
    return formError(request, 'cart_failed', 400, '/bag');
  }
};
