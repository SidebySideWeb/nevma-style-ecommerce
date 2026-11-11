import { createHmac, timingSafeEqual } from 'node:crypto';
import { serverEnv } from './env';
import { purgePaths } from './revalidate';
import { sanityConfigured, sanityFetch } from '../sanity/client';
import { createCommerceProvider } from '../commerce/provider';
import { leftCount } from '../commerce/edition';
import { logAlertOnce } from './sanity-write';
import { sendEmail } from './resend';
import { renderLastPiece } from '../../emails/templates';

export function verifyShopifyHmac(rawBody: string, hmacHeader: string | null): boolean {
  const secret = serverEnv('SHOPIFY_WEBHOOK_SECRET');
  if (!secret || !hmacHeader) return false;
  const digest = createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
  try {
    const a = Buffer.from(digest);
    const b = Buffer.from(hmacHeader);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

type InventoryPayload = {
  inventory_item_id?: number | string;
  available?: number;
};

/** Map inventory item → product handle via Admin GraphQL when Admin token is set. */
async function handleForInventoryItem(inventoryItemId: string): Promise<string | null> {
  const domain = serverEnv('SHOPIFY_STORE_DOMAIN');
  const token = serverEnv('SHOPIFY_ADMIN_TOKEN');
  const version = serverEnv('SHOPIFY_API_VERSION') || '2026-10';
  if (!domain || !token) return null;

  const gid = inventoryItemId.startsWith('gid://')
    ? inventoryItemId
    : `gid://shopify/InventoryItem/${inventoryItemId}`;

  const query = `
    query ($id: ID!) {
      inventoryItem(id: $id) {
        variant { product { handle } }
      }
    }`;
  const res = await fetch(`https://${domain}/admin/api/${version}/graphql.json`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-shopify-access-token': token,
    },
    body: JSON.stringify({ query, variables: { id: gid } }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    data?: { inventoryItem?: { variant?: { product?: { handle?: string } } } };
  };
  return data.data?.inventoryItem?.variant?.product?.handle || null;
}

async function pathsForHandle(handle: string): Promise<string[]> {
  const paths = [`/pieces/${handle}`, '/pieces', '/'];
  if (!sanityConfigured()) return paths;
  try {
    const meta = await sanityFetch<{
      dropSlug?: string;
      categorySlug?: string;
    } | null>(
      `*[
        _type == "piece" &&
        coalesce(product->store.slug.current, handle.current) == $handle
      ][0]{
        "dropSlug": drop->slug.current,
        "categorySlug": category->slug.current
      }`,
      { handle },
    );
    if (meta?.dropSlug) paths.push(`/drops/${meta.dropSlug}`);
    if (meta?.categorySlug) paths.push(`/categories/${meta.categorySlug}`);
  } catch {
    /* ignore */
  }
  return paths;
}

async function lastPieceAlert(handle: string): Promise<void> {
  let left: number;
  let title: string;
  try {
    const provider = createCommerceProvider();
    const piece = await provider.getPiece(handle);
    if (!piece) return;
    left = leftCount(piece.variants);
    title = piece.title || handle;
  } catch {
    // Shopify provider may still be stubbed (prompt 12); skip alert, revalidate already ran.
    return;
  }
  if (left !== 1) return;

  const first = await logAlertOnce('last-piece', handle);
  if (!first || !sanityConfigured()) return;

  type Row = { email?: string };
  const rows = await sanityFetch<Row[]>(
    `*[_type == "customerProfile" && count(wishlist[
      piece->coalesce(product->store.slug.current, handle.current) == $handle
    ]) > 0]{email}`,
    { handle },
  );

  const origin = (serverEnv('PUBLIC_SITE_URL') || '').replace(/\/$/, '');
  const url = `${origin}/pieces/${handle}`;
  const mail = renderLastPiece(title, url);
  const seen = new Set<string>();
  for (const r of rows) {
    const email = (r.email || '').trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    await sendEmail({ to: email, ...mail }).catch(() => null);
  }
}

export async function handleInventoryUpdate(payload: InventoryPayload): Promise<{
  handle: string | null;
  revalidated: string[];
}> {
  const itemId = payload.inventory_item_id != null ? String(payload.inventory_item_id) : '';
  const handle = itemId ? await handleForInventoryItem(itemId) : null;
  if (!handle) return { handle: null, revalidated: await purgePaths(['/pieces', '/']) };

  const paths = await pathsForHandle(handle);
  const revalidated = await purgePaths(paths);
  await lastPieceAlert(handle).catch(() => null);
  return { handle, revalidated };
}
