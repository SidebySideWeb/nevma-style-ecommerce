import type { APIRoute } from 'astro';
import { formError, formSuccess, parseForm, wantsJson } from '../../lib/server/http';
import { isCommerceMock } from '../../lib/server/env';
import { addToWishlist, removeFromWishlist } from '../../lib/server/sanity-write';
import { openSession } from '../../lib/server/session';

const WISHLIST_COOKIE = 'ns_wishlist';
const WISHLIST_MAX_AGE = 60 * 60 * 24 * 365;

function parseGuestList(cookieHeader: string | null): string[] {
  if (!cookieHeader) return [];
  const m = cookieHeader.match(/(?:^|;\s*)ns_wishlist=([^;]*)/);
  if (!m?.[1]) return [];
  try {
    const raw = decodeURIComponent(m[1]);
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return rawSplit(m[1]);
  }
}

function rawSplit(value: string): string[] {
  return decodeURIComponent(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function wishlistCookie(handles: string[]): string {
  const value = encodeURIComponent(JSON.stringify(handles));
  return `${WISHLIST_COOKIE}=${value}; Path=/; SameSite=Lax; Max-Age=${WISHLIST_MAX_AGE}`;
}

type SessionData = { customerId?: string; email?: string };

export const POST: APIRoute = async ({ request }) => {
  const body = await parseForm(request);
  const handle = (body.handle || '').trim();
  const pieceId = (body.pieceId || '').trim();
  const action = (body.action || 'add').trim();
  if (!handle && !pieceId) return formError(request, 'missing_piece', 400);

  const cookie = request.headers.get('cookie');
  const sessionTok = cookie?.match(/(?:^|;\s*)ns_session=([^;]*)/)?.[1];
  const session = sessionTok
    ? await openSession<SessionData>(decodeURIComponent(sessionTok))
    : null;

  let handles = parseGuestList(cookie);
  const key = handle || pieceId;
  const saved = action !== 'remove';

  if (saved) {
    if (!handles.includes(key)) handles = [...handles, key];
  } else {
    handles = handles.filter((h) => h !== key);
  }

  if (session?.customerId && pieceId && !isCommerceMock()) {
    try {
      if (saved) await addToWishlist(session.customerId, pieceId, session.email);
      else await removeFromWishlist(session.customerId, pieceId);
    } catch {
      /* guest cookie still updated */
    }
  }

  const payload = { ok: true, saved, handle: key, count: handles.length };

  if (wantsJson(request)) {
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'set-cookie': wishlistCookie(handles),
      },
    });
  }

  const next = (body.next || '').trim();
  const redirect =
    next.startsWith('/') ? next : handle && action !== 'remove' ? `/pieces/${handle}` : '/wishlist';
  const res = formSuccess(request, redirect, payload);
  const headers = new Headers(res.headers);
  headers.append('set-cookie', wishlistCookie(handles));
  return new Response(res.body, { status: res.status, headers });
};
