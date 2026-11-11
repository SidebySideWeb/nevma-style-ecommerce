import type { APIRoute } from 'astro';
import {
  bypassToken,
  pathsForSanityDoc,
  purgePaths,
  type SanityHookBody,
} from '../../lib/server/revalidate';

/**
 * Sanity publish webhook + cron path purge.
 * Auth: Authorization Bearer <SANITY_REVALIDATE_SECRET> or x-revalidate-secret.
 * Body: Sanity projection `{_type,_id,slug}` or `{ paths: string[] }`.
 */
export const POST: APIRoute = async ({ request }) => {
  const secret = bypassToken();
  const auth = request.headers.get('authorization') || '';
  const headerSecret =
    request.headers.get('x-revalidate-secret') ||
    request.headers.get('sanity-webhook-secret') ||
    '';
  const ok =
    Boolean(secret) && (auth === `Bearer ${secret}` || headerSecret === secret);
  if (!ok) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: SanityHookBody;
  try {
    body = (await request.json()) as SanityHookBody;
  } catch {
    return Response.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const paths = await pathsForSanityDoc(body);
  const revalidated = await purgePaths(paths);
  return Response.json({ ok: true, revalidated });
};

export const GET: APIRoute = async ({ request, url }) => {
  // Manual: /api/revalidate?path=/&secret=…
  const secret = bypassToken();
  const q = url.searchParams.get('secret') || '';
  const auth = request.headers.get('authorization') || '';
  if (!secret || (q !== secret && auth !== `Bearer ${secret}`)) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const path = url.searchParams.get('path') || '/';
  const revalidated = await purgePaths([path]);
  return Response.json({ ok: true, revalidated });
};
