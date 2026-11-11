import { describe, expect, it } from 'vitest';
import { createMemoryStore, rateLimit } from './ratelimit';

describe('rateLimit', () => {
  it('allows up to the limit inside the window, then blocks', async () => {
    const store = createMemoryStore();
    const opts = { limit: 3, windowMs: 1000, store, now: 1000 };

    expect((await rateLimit('1.1.1.1', '/api/contact', opts)).ok).toBe(true);
    expect((await rateLimit('1.1.1.1', '/api/contact', { ...opts, now: 1001 })).ok).toBe(true);
    expect((await rateLimit('1.1.1.1', '/api/contact', { ...opts, now: 1002 })).ok).toBe(true);

    const blocked = await rateLimit('1.1.1.1', '/api/contact', { ...opts, now: 1003 });
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('isolates keys by IP and route', async () => {
    const store = createMemoryStore();
    const opts = { limit: 1, windowMs: 1000, store, now: 1 };
    expect((await rateLimit('a', '/x', opts)).ok).toBe(true);
    expect((await rateLimit('b', '/x', opts)).ok).toBe(true);
    expect((await rateLimit('a', '/y', opts)).ok).toBe(true);
    expect((await rateLimit('a', '/x', { ...opts, now: 2 })).ok).toBe(false);
  });

  it('slides the window as old hits expire', async () => {
    const store = createMemoryStore();
    expect((await rateLimit('1.1.1.1', '/r', { limit: 1, windowMs: 100, store, now: 0 })).ok).toBe(
      true,
    );
    expect((await rateLimit('1.1.1.1', '/r', { limit: 1, windowMs: 100, store, now: 50 })).ok).toBe(
      false,
    );
    expect((await rateLimit('1.1.1.1', '/r', { limit: 1, windowMs: 100, store, now: 101 })).ok).toBe(
      true,
    );
  });
});
