import type { z } from 'zod';

/** Prefer JSON when the client asked for it (fetch / XHR). */
export function wantsJson(request: Request): boolean {
  const accept = request.headers.get('accept') || '';
  if (accept.includes('application/json')) return true;
  if (request.headers.get('x-requested-with') === 'XMLHttpRequest') return true;
  return false;
}

export async function parseForm(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    const body = (await request.json()) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(body)) {
      if (v == null) continue;
      out[k] = typeof v === 'string' ? v : String(v);
    }
    return out;
  }
  const fd = await request.formData();
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

export function parseWithZod<T>(schema: z.ZodType<T>, data: unknown):
  | { ok: true; data: T }
  | { ok: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data };
  const issue = result.error.issues[0];
  return { ok: false, error: issue?.message || 'Invalid input' };
}

export function clientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '0.0.0.0'
  );
}

/** Success for progressive enhancement: JSON for fetch, 303 ?sent=1 for plain forms. */
export function formSuccess(request: Request, redirectTo: string, payload: Record<string, unknown> = {}): Response {
  if (wantsJson(request)) {
    return Response.json({ ok: true, ...payload });
  }
  const url = new URL(redirectTo, request.url);
  url.searchParams.set('sent', '1');
  return new Response(null, { status: 303, headers: { location: url.pathname + url.search } });
}

export function formError(
  request: Request,
  message: string,
  status = 400,
  redirectTo?: string,
): Response {
  if (wantsJson(request)) {
    return Response.json({ ok: false, error: message }, { status });
  }
  if (redirectTo) {
    const url = new URL(redirectTo, request.url);
    url.searchParams.set('error', '1');
    return new Response(null, { status: 303, headers: { location: url.pathname + url.search } });
  }
  return new Response(message, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
