import { sanityFetch, sanityConfigured } from '../sanity/client';
import { isCommerceMock, serverEnv } from './env';

const PRIVATE_TYPES = new Set(['formSubmission', 'customerProfile', 'alertLog']);

export type SanityHookBody = {
  _type?: string;
  _id?: string;
  slug?: string | null;
  paths?: string[];
  path?: string;
};

/** Paths that always need a refresh when editorial chrome / home changes. */
export const FULL_SITE_PATHS = [
  '/',
  '/pieces',
  '/story',
  '/client-care/shipping',
  '/client-care/returns',
  '/client-care/faq',
  '/client-care/contact',
  '/legal/terms',
  '/legal/privacy',
  '/legal/cookies',
];

export function siteOrigin(): string {
  return (serverEnv('PUBLIC_SITE_URL') || 'http://localhost:4321').replace(/\/$/, '');
}

export function bypassToken(): string | undefined {
  return serverEnv('SANITY_REVALIDATE_SECRET') || serverEnv('CRON_SECRET');
}

/** HEAD each path with x-prerender-revalidate so Vercel ISR rebuilds and re-caches. */
export async function purgePaths(
  paths: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const token = bypassToken();
  const origin = siteOrigin();
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return [];
  if (isCommerceMock() || !token) return unique;

  await Promise.all(
    unique.map(async (path) => {
      const url = `${origin}${path.startsWith('/') ? path : `/${path}`}`;
      try {
        await fetchImpl(url, {
          method: 'HEAD',
          headers: { 'x-prerender-revalidate': token },
        });
      } catch {
        /* best-effort */
      }
    }),
  );
  return unique;
}

async function piecePathsForProduct(productId: string): Promise<string[]> {
  if (!sanityConfigured()) return ['/pieces', '/'];
  try {
    const rows = await sanityFetch<
      {
        handle?: string;
        dropSlug?: string;
        categorySlug?: string;
      }[]
    >(
      `*[_type == "piece" && product._ref == $id]{
        "handle": coalesce(product->store.slug.current, handle.current),
        "dropSlug": drop->slug.current,
        "categorySlug": category->slug.current
      }`,
      { id: productId },
    );
    const paths = ['/pieces', '/'];
    for (const r of rows) {
      if (r.handle) paths.push(`/pieces/${r.handle}`);
      if (r.dropSlug) paths.push(`/drops/${r.dropSlug}`);
      if (r.categorySlug) paths.push(`/categories/${r.categorySlug}`);
    }
    return paths;
  } catch {
    return ['/pieces', '/'];
  }
}

async function dropPiecePaths(dropId: string): Promise<string[]> {
  if (!sanityConfigured()) return [];
  try {
    const handles = await sanityFetch<(string | null)[]>(
      `*[_type == "piece" && drop._ref == $id].coalesce(product->store.slug.current, handle.current)`,
      { id: dropId },
    );
    return (handles || []).filter((h): h is string => Boolean(h)).map((h) => `/pieces/${h}`);
  } catch {
    return [];
  }
}

/** Map a Sanity webhook payload to site paths (CONTENT-MODEL.md). */
export async function pathsForSanityDoc(body: SanityHookBody): Promise<string[]> {
  if (Array.isArray(body.paths) && body.paths.length) return body.paths;
  if (body.path) return [body.path];

  const type = body._type;
  const id = body._id || '';
  const slug = body.slug || undefined;
  if (!type || PRIVATE_TYPES.has(type)) return [];

  switch (type) {
    case 'homePage':
    case 'siteSettings':
    case 'storyPage':
    case 'shopPages':
    case 'clientCarePage':
      return [...FULL_SITE_PATHS];
    case 'piece': {
      const handle = slug;
      const paths = ['/pieces', '/'];
      if (handle) paths.push(`/pieces/${handle}`);
      if (id && sanityConfigured()) {
        try {
          const meta = await sanityFetch<{
            dropSlug?: string;
            categorySlug?: string;
          } | null>(
            `*[_id == $id][0]{"dropSlug": drop->slug.current, "categorySlug": category->slug.current}`,
            { id },
          );
          if (meta?.dropSlug) paths.push(`/drops/${meta.dropSlug}`);
          if (meta?.categorySlug) paths.push(`/categories/${meta.categorySlug}`);
        } catch {
          /* ignore */
        }
      }
      return paths;
    }
    case 'drop': {
      const paths = ['/', '/pieces'];
      if (slug) paths.push(`/drops/${slug}`);
      if (id) paths.push(...(await dropPiecePaths(id)));
      return paths;
    }
    case 'category':
      return slug ? [`/categories/${slug}`] : [];
    case 'infoPage': {
      if (!slug) return FULL_SITE_PATHS.filter((p) => p.startsWith('/client-care') || p.startsWith('/legal'));
      // section unknown without a fetch — purge both namespaces for the slug.
      return [`/client-care/${slug}`, `/legal/${slug}`];
    }
    case 'product':
      return piecePathsForProduct(id);
    case 'collection':
      return ['/', '/pieces'];
    default:
      return ['/'];
  }
}
