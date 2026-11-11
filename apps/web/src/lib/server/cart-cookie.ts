/** `ns_cart` — Shopify/fixture cart id (HttpOnly, 14 days). */

export const CART_COOKIE = 'ns_cart';
export const CART_MAX_AGE = 60 * 60 * 24 * 14;

export const FLASH_COOKIE = 'ns_flash';
/** Flash is one-shot; short max-age as a safety net. */
export const FLASH_MAX_AGE = 60 * 5;

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const m = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

export function cartCookieHeader(id: string): string {
  return `${CART_COOKIE}=${encodeURIComponent(id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${CART_MAX_AGE}`;
}

export function clearCartCookieHeader(): string {
  return `${CART_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export type SoldFlashLine = {
  handle: string;
  title: string;
  size: string;
  priceAmount: string;
  priceCurrency: string;
  dropCode?: string;
};

export type BagFlash = {
  sold: SoldFlashLine[];
};

export function flashCookieHeader(flash: BagFlash): string {
  const value = encodeURIComponent(JSON.stringify(flash));
  return `${FLASH_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${FLASH_MAX_AGE}`;
}

export function clearFlashCookieHeader(): string {
  return `${FLASH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function parseFlash(raw: string | null): BagFlash | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BagFlash;
    if (!parsed || !Array.isArray(parsed.sold)) return null;
    return parsed;
  } catch {
    return null;
  }
}
