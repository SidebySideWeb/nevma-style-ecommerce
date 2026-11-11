import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openSession, sealSession } from './session';

describe('session', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'unit-test-session-secret-32b';
  });

  afterEach(() => {
    delete process.env.SESSION_SECRET;
  });

  it('round-trips JSON payload', async () => {
    const token = await sealSession({ customerId: '123', email: 'a@b.co' });
    const data = await openSession<{ customerId: string; email: string }>(token);
    expect(data?.customerId).toBe('123');
    expect(data?.email).toBe('a@b.co');
  });

  it('rejects tampered tokens', async () => {
    const token = await sealSession({ ok: true });
    const flipped = `${token.slice(0, -4)}abcd`;
    await expect(openSession(flipped)).resolves.toBeNull();
  });

  it('rejects missing tokens', async () => {
    await expect(openSession(undefined)).resolves.toBeNull();
    await expect(openSession('')).resolves.toBeNull();
  });

  it('rejects expired sessions', async () => {
    const token = await sealSession({ n: 1 }, 1);
    await new Promise((r) => setTimeout(r, 1100));
    await expect(openSession(token)).resolves.toBeNull();
  });
});
