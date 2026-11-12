import { createCommerceProvider } from './commerce/provider';
import { describeEdition, sizeSummary } from './commerce/edition';
import { formatDayMonth, formatSitePrice } from './commerce/format';
import type { PieceCommerce } from './commerce/types';
import { fixtureFlagsFromCookie } from './chrome';
import { nowMs } from './now';
import { isCommerceMock } from './server/env';
import { sanityConfigured, sanityFetch } from './sanity/client';
import { categoryQuery } from './sanity/queries';
import type { Photo } from './sanity/types';
import { hasPhotoImage, TONE_BG } from './sanity/image';
import { filterBucket, formatDayMon } from './pieces';
import { ui } from '../content/ui';

export type CategoryChip = {
  name: string;
  slug: string;
  href: string;
  count: number;
  current: boolean;
};

export type CategoryPieceCard = {
  title: string;
  handle: string;
  href: string;
  numberPad: string;
  dropCode: string;
  cardStory: string;
  priceLabel: string;
  edition: ReturnType<typeof describeEdition>;
  sizeSummary: string;
  photo: Photo | null;
  toneBg: string;
  objectPosition: string;
  imgFilter: string;
  numberColor: string;
  hasImage: boolean;
  aria: string;
  featuredAria: string;
  archiveAria: string;
  tag: string;
  meterWithDrop: string;
  archiveLine: string;
};

export type ComingPieceData = {
  title: string;
  handle: string;
  href: string;
  eyebrow: string;
  text: string;
  meterLine: string;
  edition: ReturnType<typeof describeEdition>;
  photoLabel: string;
  notifyLabel: string;
};

export type CategoryPageData = {
  name: string;
  slug: string;
  intro: string;
  eyebrow: string;
  chips: CategoryChip[];
  featured: CategoryPieceCard | null;
  more: CategoryPieceCard[];
  archive: CategoryPieceCard[];
  coming: ComingPieceData | null;
  seo: { title?: string; description?: string; noindex?: boolean };
};

type RawPiece = {
  title?: string;
  handle?: string;
  number?: number;
  cardStory?: string;
  cardPhoto?: Photo;
  gallery0?: Photo;
  drop?: { code?: string; name?: string; slug?: string; opensAt?: string } | null;
};

type RawCategory = {
  category?: {
    name?: string;
    slug?: string;
    order?: number;
    intro?: string;
    comingText?: string;
    seo?: { title?: string; description?: string; noindex?: boolean };
  } | null;
  categories?: { name?: string; slug?: string; order?: number }[] | null;
  pieces?: RawPiece[] | null;
};

const LOCAL_SRC: Record<string, string> = {
  'definition-tee-white': '/images/definition-tee-white.jpg',
  'wordmark-tee-bone': '/images/wordmark-tee-bone.jpg',
  'definition-tee-bone': '/images/definition-tees-bone.jpg',
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function commerceMap(pieces: PieceCommerce[]): Map<string, PieceCommerce> {
  return new Map(pieces.map((p) => [p.handle, p]));
}

function toneBg(photo: Photo | null | undefined): string {
  const t = photo?.tone;
  return (t && TONE_BG[t as keyof typeof TONE_BG]) || TONE_BG.bone;
}

function pickPhoto(card: Photo | null | undefined, gallery0: Photo | null | undefined): Photo | null {
  if (hasPhotoImage(card)) return card!;
  if (hasPhotoImage(gallery0)) return gallery0!;
  return card || gallery0 || null;
}

/** Mock/fidelity: STYLE 001 uses local stand-ins; STYLE 002 stays [Photo] like the boards. */
function withLocalSrc(handle: string, photo: Photo | null): Photo | null {
  if (!isCommerceMock()) return photo;
  const src = LOCAL_SRC[handle];
  if (!src) return null;
  if (!photo || !hasPhotoImage(photo)) return photo;
  return {
    ...photo,
    image: {
      ...(photo.image || {}),
      asset: { ...(photo.image?.asset || {}), url: src },
    },
  };
}

function toCard(
  p: RawPiece,
  commerce: Map<string, PieceCommerce>,
  now: number,
): CategoryPieceCard | null {
  if (!p.handle || !p.title) return null;
  const handle = p.handle;
  const title = p.title;
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
  const photo = withLocalSrc(handle, pickPhoto(p.cardPhoto, p.gallery0));
  const priceLabel =
    edition.state === 'upcoming' || !c.price
      ? ui.pieces.priceHidden
      : formatSitePrice(c.price.amount, c.price.currency);
  return {
    title,
    handle,
    href: `/pieces/${handle}`,
    numberPad: pad2(number),
    dropCode: code,
    cardStory: p.cardStory || '',
    priceLabel,
    edition,
    sizeSummary: sizeSummary(c.variants, { includeGone: false }),
    photo,
    toneBg: toneBg(photo),
    objectPosition: photo?.position || 'center',
    imgFilter: edition.state === 'sold-out' ? 'grayscale(1) contrast(0.9)' : 'none',
    numberColor: photo?.tone === 'bone' ? '#0B0B0C' : '#F5F5F7',
    hasImage: hasPhotoImage(photo),
    aria: `${title}, ${priceLabel}, ${edition.stockLine}`,
    featuredAria: title,
    archiveAria: `${title}, sold out`,
    tag: edition.cardTag,
    meterWithDrop: ui.category.moreMeter(edition.stockLine, code),
    archiveLine: ui.category.archiveLine(code, edition.meterLine),
  };
}

function mapCategory(
  raw: RawCategory,
  commerce: Map<string, PieceCommerce>,
  now: number,
  pieceCounts: Map<string, number>,
): CategoryPageData | null {
  const cat = raw.category;
  if (!cat?.name || !cat.slug) return null;

  const cards = (raw.pieces || [])
    .map((p) => toCard(p, commerce, now))
    .filter((c): c is CategoryPieceCard => !!c);

  const live = cards
    .filter((c) => filterBucket(c.edition.state) === 'available')
    .sort((a, b) => {
      if (b.edition.left !== a.edition.left) return b.edition.left - a.edition.left;
      return Number(a.numberPad) - Number(b.numberPad);
    });
  const archive = cards.filter((c) => c.edition.state === 'sold-out');
  const upcoming = cards.filter((c) => c.edition.state === 'upcoming');

  const featured = live[0] || null;
  const more = live.slice(1);

  let coming: ComingPieceData | null = null;
  if (!featured && upcoming[0]) {
    const u = upcoming[0];
    const opensAt = (raw.pieces || []).find((p) => p.handle === u.handle)?.drop?.opensAt;
    const day = opensAt ? formatDayMonth(opensAt) : '';
    coming = {
      title: u.title,
      handle: u.handle,
      href: u.href,
      eyebrow: ui.category.comingIn(cat.name, u.dropCode, day),
      text: cat.comingText || u.cardStory,
      meterLine: ui.category.priceRevealedLine(u.edition.size),
      edition: u.edition,
      photoLabel: ui.category.photoVeiled(u.title),
      notifyLabel: ui.category.notifyMe,
    };
  }

  const availableCount = live.length;
  const eyebrow = featured
    ? ui.category.piecesAvailable(cards.length, availableCount)
    : (() => {
        const opensAt = upcoming[0]
          ? (raw.pieces || []).find((p) => p.handle === upcoming[0]!.handle)?.drop?.opensAt
          : null;
        const code = upcoming[0]?.dropCode || '';
        const day = opensAt ? formatDayMonth(opensAt) : formatDayMon(opensAt || '');
        return ui.category.arrives(day || '', code);
      })();

  const chips: CategoryChip[] = (raw.categories || [])
    .filter((c) => c.slug && c.name)
    .map((c) => ({
      name: c.name!,
      slug: c.slug!,
      href: `/categories/${c.slug}`,
      count: pieceCounts.get(c.slug!) || 0,
      current: c.slug === cat.slug,
    }));

  return {
    name: cat.name,
    slug: cat.slug,
    intro: cat.intro || '',
    eyebrow,
    chips,
    featured,
    more,
    archive,
    coming,
    seo: {
      title: cat.seo?.title || `NEVMA Style - ${cat.name}`,
      description: cat.seo?.description,
      noindex: cat.seo?.noindex,
    },
  };
}

/** Counts per category slug across the site (for chips). */
async function categoryPieceCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  try {
    const rows = await sanityFetch<{ slug?: string }[]>(
      `*[_type == "piece"]{ "slug": category->slug.current }`,
    );
    for (const r of rows) {
      if (!r.slug) continue;
      counts.set(r.slug, (counts.get(r.slug) || 0) + 1);
    }
  } catch {
    /* empty */
  }
  return counts;
}

export async function loadCategory(
  slug: string,
  cookieHeader: string | null,
): Promise<CategoryPageData | null> {
  const now = nowMs();
  if (!sanityConfigured()) return null;
  try {
    const [raw, pieceCounts] = await Promise.all([
      sanityFetch<RawCategory>(categoryQuery, { slug }),
      categoryPieceCounts(),
    ]);
    if (!raw.category) return null;
    const handles = (raw.pieces || []).map((p) => p.handle).filter(Boolean) as string[];
    const provider = createCommerceProvider({
      fixtureFlags: fixtureFlagsFromCookie(cookieHeader),
    });
    const pieces = await provider.getPieces(handles);
    return mapCategory(raw, commerceMap(pieces), now, pieceCounts);
  } catch {
    return null;
  }
}

export async function firstCategorySlug(): Promise<string | null> {
  if (!sanityConfigured()) return 'tees';
  try {
    const row = await sanityFetch<{ slug?: string } | null>(
      `*[_type == "category"] | order(order asc)[0]{ "slug": slug.current }`,
    );
    return row?.slug || 'tees';
  } catch {
    return 'tees';
  }
}
