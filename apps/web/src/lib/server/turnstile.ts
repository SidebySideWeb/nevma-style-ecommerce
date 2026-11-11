import { assertServerOnly, isCommerceMock, serverEnv } from './env';

assertServerOnly('turnstile');

/** Cloudflare's always-pass test secret. */
export const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA';

type Siteverify = { success: boolean; 'error-codes'?: string[] };

/**
 * Verify a Turnstile response token with Cloudflare.
 * In DEV or COMMERCE_MOCK, Cloudflare test secrets/keys are accepted without a remote call.
 */
export async function verifyTurnstile(
  token: string | undefined,
  remoteIp?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const secret = serverEnv('TURNSTILE_SECRET_KEY') || TURNSTILE_TEST_SECRET;
  const mockOrDev = isCommerceMock() || serverEnv('NODE_ENV') !== 'production';

  if (mockOrDev && secret === TURNSTILE_TEST_SECRET) {
    return Boolean(token);
  }

  if (!token) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);

  const res = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) return false;
  const data = (await res.json()) as Siteverify;
  return data.success === true;
}
