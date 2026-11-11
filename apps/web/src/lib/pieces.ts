import { createCommerceProvider } from './commerce/provider';
import {
  describeEdition,
  editionSizeOf,
} from './commerce/edition';
import { formatSitePrice } from './commerce/format';
import type { EditionState, PieceCommerce } from './commerce/types';
import { fixtureFlagsFromCookie } from './chrome';
import { nowMs } from './now';
import { isCommerceMock } from './server/env';
import { sanityConfigured, sanityFetch } from './sanity/client';
import { piecesQuery } from './sanity/queries';
import type { Photo } from './sanity/types';
import { hasPhotoImage, TONE_BG } from './sanity/image';
import { ui } from '../content/ui';

export type PiecesFilter = 'all' | 'available' | 'coming' | 'sold-out';
export type PiecesView = 'index' | 'gallery';

export type PiecesRow = {
  title: string;
  handle: string;
  href: string;
  number: number;
  numberPad: string;
  numberLabel: string;
  filter: 'available' | 'coming' | 'sold-out';
  dropLabel: string;
  dropCode: string;
  edition: ReturnType<typeof describeEdition>;
  editionLine: string;
  galleryEditionLine: string;
  priceLabel: string;
  ariaIndex: string;
  ariaGallery: string;
  photo: Photo | null;
  toneBg: string;
  objectPosition: string;
  imgFilter: string;
  numberColor: string;
  hasImage: boolean;
  indexPlaceholder: string;
  galleryPlaceholder: string;
};

export type PiecesPageData = {
  title: string;
  intro: string;
  eyebrow: string;
  filter: PiecesFilter;
  view: PiecesView;
  counts: { all: number; available: number; coming: number; soldOut: number };
  shown: number;
  shownLabel: string;
  rows: PiecesRow[];
  seo: { title?: string; description?: string; noindex?: boolean };
};

type RawPiece = {
  title?: string;
  handle?: string;
  number?: number;
  cardStory?: string;
  cardPhoto?: Photo;
  gallery0?: Photo;
  phase1State?: string;
  drop?: { code?: string; name?: string; slug?: string; opensAt?: string } | null;
};

type RawPieces = {
  shop?: {
    allPieces?: { title?: string; intro?: string };
    seo?: { title?: string; description?: string; noindex?: boolean };
  } | null;
  pieces?: RawPiece[] | null;
  drops?: { code?: string; opensAt?: string }[] | null;
};

const LOCAL_SRC: Record<string, string> = {
  'definition-tee-white': '/images/definition-tee-white.jpg',
  'wordmark-tee-bone': '/images/wordmark-tee-bone.jpg',
  'definition-tee-bone': '/images/definition-tees-bone.jpg',
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** "4 Dec" — archive coming drop label (design). */
export function formatDayMon(input: string | number | Date): string {
  const d = typeof input === 'object' && !(input instanceof Date) ? new Date(String(input)) : new Date(input);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'short',
  }).formatToParts(d);
  const day = parts.find((p) => p.type === 'day')?.value || '';
  const month = parts.find((p) => p.type === 'month')?.value || '';
  return `${day} ${month}`;
}

export function parsePiecesFilter(raw: string | null): PiecesFilter {
  if (raw === 'available' || raw === 'coming' || raw === 'sold-out') return raw;
  return 'all';
}

export function parsePiecesView(raw: string | null): PiecesView {
  return raw === 'gallery' ? 'gallery' : 'index';
}

export function piecesHref(filter: PiecesFilter, view: PiecesView): string {
  const q = new URLSearchParams();
  if (filter !== 'all') q.set('filter', filter);
  if (view === 'gallery') q.set('view', 'gallery');
  const s = q.toString();
  return s ? `/pieces?${s}` : '/pieces';
}

export function filterBucket(state: EditionState): 'available' | 'coming' | 'sold-out' {
  if (state === 'upcoming') return 'coming';
  if (state === 'sold-out') return 'sold-out';
  return 'available';
}

function commerceMap(pieces: PieceCommerce[]): Map<string, PieceCommerce> {
  return new Map(pieces.map((p) => [p.handle, p]));
}

function toneBg(photo: Photo | null | undefined): string {
  const t = photo?.tone;
  return (t && TONE_BG[t as keyof typeof TONE_BG]) || TONE_BG.ink;
}

function withLocalSrc(handle: string, photo: Photo | null): Photo | null {
  if (!photo || !isCommerceMock()) return photo;
  const src = LOCAL_SRC[handle];
  if (!src || !hasPhotoImage(photo)) return photo;
  return {
    ...photo,
    image: {
      ...(photo.image || {}),
      asset: { ...(photo.image?.asset || {}), url: src },
    },
  };
}

function buildRows(
  rawPieces: RawPiece[],
  commerce: Map<string, PieceCommerce>,
  now: number,
): PiecesRow[] {
  return rawPieces
    .filter((p) => p.handle && p.title)
    .map((p) => {
      const handle = p.handle!;
      const title = p.title!;
      const number = p.number ?? 0;
      const opensAt = p.drop?.opensAt;
      const code = p.drop?.code || '';
      const c =
        commerce.get(handle) ||
        ({
          handle,
          published: false,
          price: null,
          editionSize: 5,
          variants: [],
        } satisfies PieceCommerce);
      const edition = describeEdition(c, opensAt, now);
      const bucket = filterBucket(edition.state);
      const upcoming = edition.state === 'upcoming';
      const priceLabel =
        upcoming || !c.price
          ? ui.pieces.priceHidden
          : formatSitePrice(c.price.amount, c.price.currency);
      const dayMon = opensAt ? formatDayMon(opensAt) : '';
      const dropLabel = upcoming && dayMon ? `${code} · ${dayMon}` : code;
      const editionLine = edition.shortLine;
      const galleryEditionLine = upcoming
        ? `${editionLine} · ${dropLabel}`
        : `${edition.cardTag} · ${code}`;
      const photo = withLocalSrc(handle, p.cardPhoto || p.gallery0 || null);
      const hasImage = hasPhotoImage(photo);
      const numberPad = pad2(number);
      return {
        title,
        handle,
        href: `/pieces/${handle}`,
        number,
        numberPad,
        numberLabel: `N° ${numberPad}`,
        filter: bucket,
        dropLabel,
        dropCode: code,
        edition,
        editionLine,
        galleryEditionLine,
        priceLabel,
        ariaIndex: upcoming
          ? `${title}, ${dropLabel}, ${editionLine}`
          : `${title}, ${code}, ${edition.cardTag}, ${priceLabel}`,
        ariaGallery: upcoming
          ? `${title}, ${dropLabel}, ${editionLine}`
          : `${title}, ${code}, ${edition.cardTag}, ${priceLabel}`,
        photo,
        toneBg: toneBg(photo),
        objectPosition: photo?.position || 'center',
        imgFilter: edition.state === 'sold-out' ? 'grayscale(1) contrast(0.9)' : 'none',
        numberColor:
          photo?.tone === 'bone' || !photo?.tone ? '#0B0B0C' : '#F5F5F7',
        hasImage,
        indexPlaceholder: ui.pieces.photo,
        galleryPlaceholder: ui.pieces.photoTitle(title),
      };
    });
}

function mapPieces(
  raw: RawPieces,
  commerce: Map<string, PieceCommerce>,
  now: number,
  filter: PiecesFilter,
  view: PiecesView,
): PiecesPageData {
  const rows = buildRows(raw.pieces || [], commerce, now);
  const counts = {
    all: rows.length,
    available: rows.filter((r) => r.filter === 'available').length,
    coming: rows.filter((r) => r.filter === 'coming').length,
    soldOut: rows.filter((r) => r.filter === 'sold-out').length,
  };
  const shown = filter === 'all' ? counts.all : rows.filter((r) => r.filter === filter).length;
  const editionSize = rows[0] ? rows[0].edition.size : 5;
  const dropCount = new Set((raw.drops || []).map((d) => d.code).filter(Boolean)).size ||
    new Set(rows.map((r) => r.dropCode).filter(Boolean)).size;
  const numbered = counts.all * editionSizeOf({ editionSize });

  return {
    title: raw.shop?.allPieces?.title || ui.product.allPieces,
    intro:
      raw.shop?.allPieces?.intro ||
      'Everything NEVMA Style has made, newest first. Sold-out pieces stay here with their story, so the archive grows with every drop.',
    eyebrow: ui.pieces.stats(dropCount, counts.all, numbered),
    filter,
    view,
    counts,
    shown,
    shownLabel: ui.pieces.shown(shown),
    rows,
    seo: {
      title: raw.shop?.seo?.title || 'NEVMA Style — All pieces',
      description: raw.shop?.seo?.description,
      noindex: raw.shop?.seo?.noindex,
    },
  };
}

export async function loadPieces(
  cookieHeader: string | null,
  filter: PiecesFilter = 'all',
  view: PiecesView = 'index',
): Promise<PiecesPageData | null> {
  const now = nowMs();
  if (!sanityConfigured()) return null;
  try {
    const raw = await sanityFetch<RawPieces>(piecesQuery);
    const handles = (raw.pieces || []).map((p) => p.handle).filter(Boolean) as string[];
    const provider = createCommerceProvider({
      fixtureFlags: fixtureFlagsFromCookie(cookieHeader),
    });
    const pieces = await provider.getPieces(handles);
    return mapPieces(raw, commerceMap(pieces), now, filter, view);
  } catch {
    return null;
  }
}
