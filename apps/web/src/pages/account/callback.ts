import type { APIRoute } from 'astro';
import {
  clearAuthStateCookieHeader,
  clearCreateProfileCookieHeader,
  exchangeCode,
  readAuthState,
  readCreateProfile,
  sessionCookieHeader,
  SESSION_MAX_AGE,
} from '../../lib/account/auth';
import { fetchCustomer, customerUpdate, setEmailMarketingConsent } from '../../lib/account/customer-api';
import { sealSession } from '../../lib/server/session';
import { addToWishlist, setPrefs } from '../../lib/server/sanity-write';
import { isCommerceMock } from '../../lib/server/env';
import type { SessionData } from '../../lib/account/session-data';

function parseWishlistCookie(cookieHeader: string | null): string[] {
  if (!cookieHeader) return [];
  const m = cookieHeader.match(/(?:^|;\s*)ns_wishlist=([^;]*)/);
  if (!m?.[1]) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(m[1])) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export const GET: APIRoute = async ({ request, url }) => {
  if (isCommerceMock()) {
    return new Response(null, { status: 303, headers: { location: '/account' } });
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  if (error || !code || !state) {
    return new Response(null, {
      status: 303,
      headers: { location: '/account/sign-in?error=1' },
    });
  }

  const cookie = request.headers.get('cookie');
  const authState = await readAuthState(cookie);
  if (!authState || authState.state !== state) {
    return new Response(null, {
      status: 303,
      headers: { location: '/account/sign-in?error=1' },
    });
  }

  try {
    const tokens = await exchangeCode({
      code,
      verifier: authState.verifier,
      origin: url.origin,
    });

    const draft: SessionData = {
      customerId: '',
      accessToken: tokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
      ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
      ...(tokens.id_token ? { idToken: tokens.id_token } : {}),
    };

    const customer = await fetchCustomer(draft);
    draft.customerId = customer.id || '';
    draft.email = customer.email;
    draft.firstName = customer.firstName;
    draft.lastName = customer.lastName;

    const create = await readCreateProfile(cookie);
    if (create) {
      if (create.firstName || create.lastName) {
        await customerUpdate(draft.accessToken, {
          firstName: create.firstName,
          lastName: create.lastName,
        }).catch(() => undefined);
        if (create.firstName) draft.firstName = create.firstName;
        if (create.lastName) draft.lastName = create.lastName;
      }
      if (create.letter != null && draft.email) {
        await setEmailMarketingConsent(draft.accessToken, draft.email, create.letter).catch(
          () => undefined,
        );
      }
      if (draft.customerId) {
        await setPrefs(
          draft.customerId,
          { dropAlerts: Boolean(create.dropAlerts), moments: false },
          draft.email,
        ).catch(() => undefined);
      }
    }

    // Merge guest wishlist handles into Sanity (handles stored as-is; piece id = piece-<handle>).
    const guest = parseWishlistCookie(cookie);
    if (draft.customerId && guest.length) {
      for (const handle of guest) {
        await addToWishlist(draft.customerId, `piece-${handle}`, draft.email).catch(() => undefined);
      }
    }

    const sealed = await sealSession(draft, SESSION_MAX_AGE);
    const next = authState.next && authState.next.startsWith('/') ? authState.next : '/account';
    const headers = new Headers({ location: next });
    headers.append('set-cookie', sessionCookieHeader(sealed));
    headers.append('set-cookie', clearAuthStateCookieHeader());
    headers.append('set-cookie', clearCreateProfileCookieHeader());
    // Clear guest wishlist cookie after merge.
    headers.append('set-cookie', 'ns_wishlist=; Path=/; SameSite=Lax; Max-Age=0');
    return new Response(null, { status: 303, headers });
  } catch {
    return new Response(null, {
      status: 303,
      headers: {
        location: '/account/sign-in?error=1',
        'set-cookie': clearAuthStateCookieHeader(),
      },
    });
  }
};
