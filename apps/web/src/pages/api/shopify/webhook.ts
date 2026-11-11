import type { APIRoute } from 'astro';
import {
  handleInventoryUpdate,
  verifyShopifyHmac,
} from '../../../lib/server/shopify-webhook';

export const POST: APIRoute = async ({ request }) => {
  const raw = await request.text();
  const hmac = request.headers.get('x-shopify-hmac-sha256');
  if (!verifyShopifyHmac(raw, hmac)) {
    return new Response('invalid hmac', { status: 401 });
  }

  const topic = (request.headers.get('x-shopify-topic') || '').toLowerCase();
  if (topic !== 'inventory_levels/update') {
    return Response.json({ ok: true, ignored: topic });
  }

  let payload: { inventory_item_id?: number | string; available?: number } = {};
  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    return new Response('invalid json', { status: 400 });
  }

  const result = await handleInventoryUpdate(payload);
  return Response.json({ ok: true, ...result });
};
