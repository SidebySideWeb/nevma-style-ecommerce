import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyShopifyHmac } from './shopify-webhook';

describe('verifyShopifyHmac', () => {
  beforeEach(() => {
    process.env.SHOPIFY_WEBHOOK_SECRET = 'whsec_test';
  });
  afterEach(() => {
    delete process.env.SHOPIFY_WEBHOOK_SECRET;
  });

  it('accepts a valid base64 HMAC', () => {
    const body = '{"inventory_item_id":1}';
    const hmac = createHmac('sha256', 'whsec_test').update(body, 'utf8').digest('base64');
    expect(verifyShopifyHmac(body, hmac)).toBe(true);
  });

  it('rejects bad or missing HMAC', () => {
    expect(verifyShopifyHmac('{}', 'nope')).toBe(false);
    expect(verifyShopifyHmac('{}', null)).toBe(false);
  });
});
