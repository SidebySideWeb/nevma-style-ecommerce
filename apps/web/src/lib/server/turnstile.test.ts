import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TURNSTILE_TEST_SECRET, verifyTurnstile } from './turnstile';

describe('verifyTurnstile', () => {
  beforeEach(() => {
    process.env.TURNSTILE_SECRET_KEY = TURNSTILE_TEST_SECRET;
    process.env.COMMERCE_MOCK = '1';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.COMMERCE_MOCK;
  });

  it('accepts Cloudflare test secret in mock mode without calling the network', async () => {
    const fetchImpl = vi.fn();
    await expect(verifyTurnstile('test-token', '1.2.3.4', fetchImpl)).resolves.toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects an empty token even with the test secret', async () => {
    await expect(verifyTurnstile('', '1.2.3.4', vi.fn())).resolves.toBe(false);
  });

  it('posts secret, token and remote IP to siteverify outside mock', async () => {
    process.env.COMMERCE_MOCK = '0';
    process.env.NODE_ENV = 'production';
    process.env.TURNSTILE_SECRET_KEY = 'live-secret';

    const fetchImpl: typeof fetch = vi.fn(async () => Response.json({ success: true }));

    await expect(verifyTurnstile('tok', '9.9.9.9', fetchImpl)).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const call = vi.mocked(fetchImpl).mock.calls[0]!;
    const [url, init] = call;
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(String(init?.body)).toContain('secret=live-secret');
    expect(String(init?.body)).toContain('response=tok');
    expect(String(init?.body)).toContain('remoteip=9.9.9.9');
  });

  it('returns false when Cloudflare reports failure', async () => {
    process.env.COMMERCE_MOCK = '0';
    process.env.NODE_ENV = 'production';
    process.env.TURNSTILE_SECRET_KEY = 'live-secret';
    const fetchImpl: typeof fetch = vi.fn(async () =>
      Response.json({ success: false, 'error-codes': ['invalid-input-response'] }),
    );
    await expect(verifyTurnstile('bad', undefined, fetchImpl)).resolves.toBe(false);
  });
});

