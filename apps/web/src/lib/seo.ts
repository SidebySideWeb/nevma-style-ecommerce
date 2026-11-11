import { resolvePhoto, slots, type ImageSlot } from './sanity/image';
import type { Photo } from './sanity/types';
import { serverEnv } from './server/env';
import type { EditionState } from './commerce/types';

export type SeoFields = {
  title?: string;
  description?: string;
  noindex?: boolean;
  image?: {
    asset?: { _id?: string; url?: string } | null;
  } | null;
};

export type PageMeta = {
  title: string;
  description?: string;
  canonicalPath: string;
  ogImage?: string;
  ogType?: 'website' | 'product';
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

/** Absolute site origin (no trailing slash). */
export function siteOrigin(): string {
  return (serverEnv('PUBLIC_SITE_URL') || 'http://localhost:4321').replace(/\/$/, '');
}

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${siteOrigin()}${path}`;
}

/** Vercel preview / non-production → noindex. */
export function isPreviewDeploy(): boolean {
  const env = serverEnv('VERCEL_ENV');
  if (env === 'preview' || env === 'development') return true;
  if (env === 'production') return false;
  // Local / unset: indexable so fidelity and crawlers see normal meta; still noindex private routes.
  return false;
}

export function shouldNoindex(opts: {
  routeNoindex?: boolean;
  seoNoindex?: boolean;
}): boolean {
  return Boolean(opts.routeNoindex || opts.seoNoindex || isPreviewDeploy());
}

const ogSlot = {
  width: 1200,
  height: 630,
  widths: [1200],
  sizes: '1200px',
  quality: 80,
} satisfies ImageSlot;

/** Sanity SEO share image → absolute CDN URL. */
export function seoShareImageUrl(seo?: SeoFields | null): string | undefined {
  const asset = seo?.image?.asset;
  if (!asset) return undefined;
  if (asset.url) return asset.url;
  if (!asset._id) return undefined;
  const asPhoto: Photo = {
    alt: '',
    image: { asset: { _id: asset._id, url: asset.url } },
  };
  return resolvePhoto(asPhoto, ogSlot)?.src;
}

/** First usable gallery / card photo for OG. */
export function photoShareUrl(photo?: Photo | null): string | undefined {
  return resolvePhoto(photo, ogSlot)?.src ?? resolvePhoto(photo, slots.gallery)?.src;
}

export function availabilityUrl(state: EditionState): string {
  switch (state) {
    case 'upcoming':
      return 'https://schema.org/PreOrder';
    case 'sold-out':
      return 'https://schema.org/SoldOut';
    default:
      return 'https://schema.org/InStock';
  }
}

export function organizationJsonLd(opts: {
  name?: string;
  url?: string;
  email?: string;
  sameAs?: string[];
}): Record<string, unknown> {
  const url = opts.url || siteOrigin();
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: opts.name || 'NEVMA Style',
    url,
    ...(opts.email ? { email: opts.email } : {}),
    ...(opts.sameAs?.length ? { sameAs: opts.sameAs } : {}),
  };
}

export function websiteJsonLd(opts: { name?: string; url?: string; description?: string }): Record<string, unknown> {
  const url = opts.url || siteOrigin();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: opts.name || 'NEVMA Style',
    url,
    ...(opts.description ? { description: opts.description } : {}),
    publisher: { '@type': 'Organization', name: 'NEVMA', url },
  };
}

export function productJsonLd(input: {
  name: string;
  description?: string;
  url: string;
  image?: string;
  sku?: string;
  brand?: string;
  priceAmount?: string | null;
  priceCurrency?: string | null;
  state: EditionState;
}): Record<string, unknown> {
  const offer: Record<string, unknown> = {
    '@type': 'Offer',
    url: input.url,
    availability: availabilityUrl(input.state),
    itemCondition: 'https://schema.org/NewCondition',
  };
  if (input.priceAmount && input.state !== 'upcoming') {
    offer.price = input.priceAmount;
    offer.priceCurrency = input.priceCurrency || 'GBP';
  } else if (input.priceAmount && input.state === 'upcoming') {
    // Price known but not yet buyable.
    offer.price = input.priceAmount;
    offer.priceCurrency = input.priceCurrency || 'GBP';
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    ...(input.image ? { image: [input.image] } : {}),
    ...(input.sku ? { sku: input.sku } : {}),
    brand: { '@type': 'Brand', name: input.brand || 'NEVMA Style' },
    offers: offer,
  };
}

export function titleFallback(page: string): string {
  return `NEVMA Style — ${page}`;
}
