import { defineMiddleware } from 'astro:middleware';
import { maybeRefreshSession, readSession } from './lib/account/auth';
import { isCommerceMock } from './lib/server/env';

/** Refresh Customer Account access tokens when < 5 minutes remain. */
export const onRequest = defineMiddleware(async (context, next) => {
  if (isCommerceMock()) return next();

  const cookie = context.request.headers.get('cookie');
  const session = await readSession(cookie);
  if (!session?.refreshToken) return next();

  const refreshed = await maybeRefreshSession(session);
  const response = await next();
  if (refreshed) {
    response.headers.append('Set-Cookie', refreshed.cookie);
  }
  return response;
});
