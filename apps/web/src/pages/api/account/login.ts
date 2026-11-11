import type { APIRoute } from 'astro';
import {
  buildAuthorizeUrl,
  createProfileCookieHeader,
  sealCreateProfile,
} from '../../../lib/account/auth';
import { formError, parseForm } from '../../../lib/server/http';
import { isCommerceMock } from '../../../lib/server/env';

export const POST: APIRoute = async ({ request, url }) => {
  const body = await parseForm(request);
  const email = (body.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return formError(request, 'Enter a valid email address.', 400, '/account/sign-in');
  }

  const mode = (body.mode || 'sign-in').trim();
  const next = (body.next || '/account').trim() || '/account';
  const origin = url.origin;

  if (isCommerceMock()) {
    // Mock: skip Shopify hosted login; bounce to next as if signed in via fixture.
    return new Response(null, {
      status: 303,
      headers: { location: next.startsWith('/') ? next : '/account' },
    });
  }

  try {
    const { url: authorizeUrl, stateCookie } = await buildAuthorizeUrl({
      origin,
      email,
      next: next.startsWith('/') ? next : '/account',
    });
    const headers = new Headers({ location: authorizeUrl });
    headers.append('set-cookie', stateCookie);

    if (mode === 'create') {
      const profile = await sealCreateProfile({
        firstName: (body.firstName || '').trim() || undefined,
        lastName: (body.lastName || '').trim() || undefined,
        dropAlerts: Boolean(body.dropAlerts),
        letter: Boolean(body.letter),
      });
      headers.append('set-cookie', createProfileCookieHeader(profile));
    }

    return new Response(null, { status: 303, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign-in failed';
    return formError(request, message, 500, '/account/sign-in');
  }
};
