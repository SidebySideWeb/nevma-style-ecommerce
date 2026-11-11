import { assertServerOnly } from './env';

assertServerOnly('ratelimit');

export type RateLimitStore = {
  get(key: string): Promise<number[]>;
  set(key: string, timestamps: number[]): Promise<void>;
};

/** In-memory sliding window. One Map per server instance — fine at Style volumes. */
export function createMemoryStore(): RateLimitStore {
  const map = new Map<string, number[]>();
  return {
    async get(key) {
      return map.get(key) ?? [];
    },
    async set(key, timestamps) {
      map.set(key, timestamps);
    },
  };
}

const defaultStore = createMemoryStore();

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterMs: number };

export async function rateLimit(
  ip: string,
  route: string,
  opts: { limit?: number; windowMs?: number; store?: RateLimitStore; now?: number } = {},
): Promise<RateLimitResult> {
  const limit = opts.limit ?? 10;
  const windowMs = opts.windowMs ?? 60_000;
  const store = opts.store ?? defaultStore;
  const now = opts.now ?? Date.now();
  const key = `${route}:${ip}`;

  const fresh = (await store.get(key)).filter((t) => now - t < windowMs);
  if (fresh.length >= limit) {
    const oldest = fresh[0] ?? now;
    return { ok: false, remaining: 0, retryAfterMs: Math.max(0, windowMs - (now - oldest)) };
  }

  fresh.push(now);
  await store.set(key, fresh);
  return { ok: true, remaining: Math.max(0, limit - fresh.length), retryAfterMs: 0 };
}
