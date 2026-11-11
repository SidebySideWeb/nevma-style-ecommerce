import type { APIRoute } from 'astro';
import {
  buildLogoutUrl,
  clearSessionCookieHeader,
  readSession,
} from '../../lib/account/auth';
import { isCommerceMock } from '../../lib/server/env';

export const GET: APIRoute = async ({ request, url }) => {
  const cookie = request.headers.get('cookie');
  const session = await readSession(cookie);

  if (isCommerceMock()) {
    return new Response(null, {
      status: 303,
      headers: {
        location: '/account/sign-in',
        'set-cookie': clearSessionCookieHeader(),
      },
    });
  }

  let location: string;
  try {
    location = await buildLogoutUrl(session, url.origin);
  } catch {
    location = `${url.origin}/`;
  }

  return new Response(null, {
    status: 303,
    headers: {
      location,
      'set-cookie': clearSessionCookieHeader(),
    },
  });
};
