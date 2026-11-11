import imageUrlBuilder from '@sanity/image-url';
import { serverEnv } from '../server/env';
import type { Photo, PhotoTone, SanityHotspot, SanityImage } from './types';

export type ImageSlot = {
  /** Default `src` width. */
  width: number;
  /** Intrinsic height hint when metadata is missing (or aspect for sizing). */
  height?: number;
  /** Widths included in `srcset`. */
  widths?: number[];
  /** CSS `sizes` attribute. */
  sizes: string;
  quality?: number;
};

/** Common responsive slots used across the design. */
export const slots = {
  hero: {
    width: 1200,
    height: 1500,
    widths: [640, 960, 1200, 1600],
    sizes: '(max-width: 768px) 100vw, 56vw',
  },
  gallery: {
    width: 960,
    height: 1200,
    widths: [480, 720, 960, 1280],
    sizes: '(max-width: 768px) 100vw, 48vw',
  },
  card: {
    width: 640,
    height: 800,
    widths: [320, 480, 640, 960],
    sizes: '(max-width: 768px) 50vw, 22vw',
  },
  thumb: {
    width: 92,
    height: 116,
    widths: [46, 92, 138],
    sizes: '46px',
  },
  story: {
    width: 1200,
    height: 800,
    widths: [640, 960, 1200, 1600],
    sizes: '(max-width: 768px) 100vw, 60vw',
  },
  world: {
    width: 800,
    height: 1000,
    widths: [400, 640, 800, 1200],
    sizes: '(max-width: 768px) 100vw, 40vw',
  },
} as const satisfies Record<string, ImageSlot>;

export type ResolvedImage = {
  src: string;
  srcset: string;
  sizes: string;
  width: number;
  height: number;
  alt: string;
  /** CSS object-position from `position` or hotspot. */
  objectPosition: string | undefined;
  lqip?: string;
  zoom: number;
};

export const TONE_BG: Record<PhotoTone, string> = {
  black: '#000000',
  ink: '#0B0B0C',
  ink2: '#141418',
  bone: '#D9D3C8',
};

/** Placeholder label colour on each tone (matches product gallery / card slots). */
export const TONE_FG: Record<PhotoTone, string> = {
  black: '#A8A8B4',
  ink: '#A8A8B4',
  ink2: '#A8A8B4',
  bone: '#615D55',
};

export function photoTone(photo: Photo | undefined | null): PhotoTone {
  const t = photo?.tone;
  if (t === 'black' || t === 'ink' || t === 'ink2' || t === 'bone') return t;
  return 'bone';
}

export function placeholderLabel(photo: Photo | undefined | null): string {
  const label = photo?.placeholder?.trim();
  return label ? `[Photo · ${label}]` : '[Photo]';
}

function projectConfig(): { projectId: string; dataset: string } | null {
  const projectId =
    serverEnv('PUBLIC_SANITY_PROJECT_ID') ||
    serverEnv('SANITY_STUDIO_PROJECT_ID') ||
    (typeof import.meta !== 'undefined'
      ? (import.meta.env?.PUBLIC_SANITY_PROJECT_ID as string | undefined)
      : undefined);
  const dataset =
    serverEnv('PUBLIC_SANITY_DATASET') ||
    serverEnv('SANITY_STUDIO_DATASET') ||
    (typeof import.meta !== 'undefined'
      ? (import.meta.env?.PUBLIC_SANITY_DATASET as string | undefined)
      : undefined) ||
    'production';
  if (!projectId) return null;
  return { projectId, dataset };
}

function builder() {
  const cfg = projectConfig();
  if (!cfg) return null;
  return imageUrlBuilder(cfg);
}

function imageSource(image: SanityImage) {
  if (!image?.asset) return null;
  const ref = image.asset._id;
  if (!ref) return null;
  return {
    asset: { _ref: ref },
    hotspot: image.hotspot ?? undefined,
    crop: image.crop ?? undefined,
  };
}

/**
 * Hotspot centre → CSS object-position percentages.
 * Prefer an explicit `position` string from the design when set.
 */
export function objectPositionFrom(
  position: string | null | undefined,
  hotspot: SanityHotspot | null | undefined,
): string | undefined {
  const explicit = position?.trim();
  if (explicit) return explicit;
  if (!hotspot || hotspot.x == null || hotspot.y == null) return undefined;
  const x = Math.round(hotspot.x * 1000) / 10;
  const y = Math.round(hotspot.y * 1000) / 10;
  return `${x}% ${y}%`;
}

export function hasPhotoImage(photo: Photo | undefined | null): boolean {
  return Boolean(photo?.image?.asset?._id || photo?.image?.asset?.url);
}

/**
 * Build CDN URLs for a photo slot: width/height/srcset/sizes and object-position.
 */
export function resolvePhoto(
  photo: Photo | undefined | null,
  slot: ImageSlot,
): ResolvedImage | null {
  if (!hasPhotoImage(photo)) return null;
  const image = photo!.image!;
  const dims = image.asset?.metadata?.dimensions;
  const naturalW = dims?.width || slot.width;
  const naturalH = dims?.height || slot.height || Math.round(naturalW * 1.25);
  const alt = photo?.alt?.trim() || '';
  const objectPosition = objectPositionFrom(photo?.position, image.hotspot);
  const zoom = photo?.zoom && photo.zoom > 1 ? photo.zoom : 1;
  const widths = slot.widths ?? [slot.width];
  const quality = slot.quality ?? 75;

  const b = builder();
  const source = imageSource(image);

  if (b && source) {
    const base = b.image(source).auto('format').fit('max').quality(quality);
    const src = base.width(slot.width).url();
    const srcset = widths.map((w) => `${base.width(w).url()} ${w}w`).join(', ');
    return {
      src,
      srcset,
      sizes: slot.sizes,
      width: naturalW,
      height: naturalH,
      alt,
      objectPosition,
      lqip: image.asset?.metadata?.lqip,
      zoom,
    };
  }

  const raw = image.asset?.url;
  if (!raw) return null;
  return {
    src: raw,
    srcset: `${raw} ${slot.width}w`,
    sizes: slot.sizes,
    width: naturalW,
    height: naturalH,
    alt,
    objectPosition,
    lqip: image.asset?.metadata?.lqip,
    zoom,
  };
}

/** Merge object-position (and optional zoom scale) into an img style string. */
export function imgStyle(
  base: string | undefined,
  resolved: Pick<ResolvedImage, 'objectPosition' | 'zoom'> | null,
): string | undefined {
  const parts: string[] = [];
  if (base?.trim()) parts.push(base.trim().replace(/;?\s*$/, ''));
  if (resolved?.objectPosition) {
    parts.push(`object-position: ${resolved.objectPosition}`);
  }
  if (resolved && resolved.zoom > 1) {
    parts.push(`transform: scale(${resolved.zoom})`);
    // Product gallery zoomed crops use 50% 45% (design); skip if caller set origin.
    if (!base?.includes('transform-origin')) {
      parts.push('transform-origin: 50% 45%');
    }
  }
  if (!parts.length) return undefined;
  return parts.join('; ');
}
