import { assertServerOnly, serverEnv } from '../server/env';
import { getCommerceContext } from './request-context';

assertServerOnly('commerce/storefront');

type GqlResponse<T> = {
  data?: T;
  errors?: { message: string; extensions?: { code?: string } }[];
};

const TIMEOUT_MS = 5_000;
const MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function shopConfig(): {
  endpoint: string;
  privateToken: string | null;
  publicToken: string | null;
} {
  const domain = serverEnv('SHOPIFY_STORE_DOMAIN');
  const version = serverEnv('SHOPIFY_API_VERSION') || '2026-10';
  if (!domain) throw new Error('SHOPIFY_STORE_DOMAIN is not set');
  // Headless private tokens are opaque; Admin `shpat_` must never be sent as Storefront auth.
  const rawPrivate = (serverEnv('SHOPIFY_STOREFRONT_PRIVATE_TOKEN') || '').trim();
  const privateToken = rawPrivate && !rawPrivate.startsWith('shpat_') ? rawPrivate : null;
  const publicToken = (serverEnv('SHOPIFY_STOREFRONT_PUBLIC_TOKEN') || '').trim() || null;
  if (!privateToken && !publicToken) {
    throw new Error('SHOPIFY_STOREFRONT_PRIVATE_TOKEN or PUBLIC_TOKEN is required');
  }
  return {
    endpoint: `https://${domain}/api/${version}/graphql.json`,
    privateToken,
    publicToken,
  };
}

function authHeaders(buyerIp: string | null): Record<string, string> {
  const { privateToken, publicToken } = shopConfig();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (privateToken) {
    headers['Shopify-Storefront-Private-Token'] = privateToken;
    if (buyerIp) headers['Shopify-Storefront-Buyer-IP'] = buyerIp;
  } else if (publicToken) {
    headers['X-Shopify-Storefront-Access-Token'] = publicToken;
  }
  return headers;
}

/** Field-level ACCESS_DENIED (e.g. quantityAvailable without inventory scope) is tolerated when data is present. */
function hardErrors(errors: GqlResponse<unknown>['errors']): string[] {
  if (!errors?.length) return [];
  return errors
    .filter((e) => e.extensions?.code !== 'ACCESS_DENIED')
    .map((e) => e.message);
}

export async function storefrontGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
  opts?: { buyerIp?: string | null },
): Promise<T> {
  const { endpoint } = shopConfig();
  const buyerIp = opts?.buyerIp ?? getCommerceContext().buyerIp;
  const headers = authHeaders(buyerIp);
  const body = JSON.stringify({ query, variables });

  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
        signal: ac.signal,
      });
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`Storefront HTTP ${res.status}`);
        await sleep(200 * attempt * attempt);
        continue;
      }
      if (!res.ok) throw new Error(`Storefront HTTP ${res.status}`);
      const json = (await res.json()) as GqlResponse<T>;
      const hard = hardErrors(json.errors);
      if (hard.length) throw new Error(hard.join('; '));
      if (json.data == null) throw new Error('Storefront returned no data');
      return json.data;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (attempt < MAX_ATTEMPTS && (lastErr.name === 'AbortError' || /HTTP 5|429/.test(lastErr.message))) {
        await sleep(200 * attempt * attempt);
        continue;
      }
      throw lastErr;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error('Storefront request failed');
}
