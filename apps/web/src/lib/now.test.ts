import { afterEach, describe, expect, it } from 'vitest';
import { nowMs } from './now';

describe('nowMs', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it('uses PUBLIC_FIXED_NOW in mock mode', () => {
    process.env.COMMERCE_MOCK = '1';
    process.env.PUBLIC_FIXED_NOW = '2026-10-23T13:00:00Z';
    expect(nowMs()).toBe(Date.parse('2026-10-23T13:00:00Z'));
  });

  it('uses the wall clock outside mock mode', () => {
    process.env.COMMERCE_MOCK = '0';
    process.env.PUBLIC_FIXED_NOW = '2026-10-23T13:00:00Z';
    const a = Date.now();
    const n = nowMs();
    const b = Date.now();
    expect(n).toBeGreaterThanOrEqual(a);
    expect(n).toBeLessThanOrEqual(b);
  });
});
