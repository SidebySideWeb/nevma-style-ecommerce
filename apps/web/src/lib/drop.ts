import { createCommerceProvider } from './commerce/provider';
import {
  describeEdition,
  dropTotals,
  editionSizeOf,
  sizeSummary,
} from './commerce/edition';
import {
  formatDayMonthYear,
  formatOpensLong,
  formatReleasedLong,
  formatSitePrice,
} from './commerce/format';
import type { PieceCommerce } from './commerce/types';
import { fixtureFlagsFromCookie } from './chrome';
import { nowMs } from './now';
import { sanityConfigured, sanityFetch } from './sanity/client';
import { dropQuery } from './sanity/queries';
import { lineTextToHtml } from './sanity/prose';
import type { Photo, Prose } from './sanity/types';
import { ui } from '../content/ui';

export type DropPieceRow = {
  title: string;
  handle: string;
  href: string;
  number: number;
  numberLabel: string;
  pieceIndexLabel: string;
  cardStory: string;
  photo: Photo | null;
  toneBg: string;
  objectPosition: string;
  filter: string;
  numberColor: string;
  flip: boolean;
  price: string | null;
  upcoming: boolean;
  edition: ReturnType<typeof describeEdition>;
  sizeSummary: string;
  ctaHref: string;
  ctaLabel: string;
  ctaClass: string;
};

export type DropPageData = {
  code: string;
  name: string;
  slug: string;
  opensAt: string;
  upcoming: boolean;
  eyebrow: string;
  introHtml: string;
  piecesCountLabel: string;
  editionLabel: string;
  leftPad: string;
  capacity: number;
  left: number;
  pieces: DropPieceRow[];
  definition: null | {
    word: string;
    pos: string;
    meaning: string;
    photo: Photo | null;
  };
  notesIntro: string;
  notes: { title: string; text: string }[];
  next: null | { code: string; name: string; slug: string; eyebrow: string };
  prev: null | { code: string; name: string; slug: string };
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
};

type RawDrop = {
  drop?: {
    code?: string;
    name?: string;
    slug?: string;
    opensAt?: string;
    intro?: Prose;
    pieces?: RawPiece[] | null;
    definition?: {
      word?: string;
      pos?: string;
      meaning?: string;
      image?: Photo;
    } | null;
    notesIntro?: string | null;
    notes?: { title?: string; text?: string }[] | null;
    seo?: { title?: string; description?: string; noindex?: boolean };
  } | null;
  siblings?: {
    prev?: { code?: string; name?: string; slug?: string; opensAt?: string } | null;
    next?: { code?: string; name?: string; slug?: string; opensAt?: string } | null;
  };
};

const TONE_BG: Record<string, string> = {
  black: '#000000',
  ink: '#0B0B0C',
  ink2: '#141418',
  bone: '#D9D3C8',
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toneBg(photo: Photo | undefined | null): string {
  const t = photo?.tone;
  return (t && TONE_BG[t]) || TONE_BG.bone!;
}

function commerceMap(pieces: PieceCommerce[]): Map<string, PieceCommerce> {
  return new Map(pieces.map((p) => [p.handle, p]));
}

function buildRows(
  rawPieces: RawPiece[],
  commerce: Map<string, PieceCommerce>,
  opensAt: string | undefined,
  now: number,
  upcoming: boolean,
): DropPieceRow[] {
  const total = rawPieces.length;
  return rawPieces
    .filter((p) => p.handle && p.title)
    .map((p, i) => {
      const handle = p.handle!;
      const title = p.title!;
      const number = p.number ?? i + 1;
      const c =
        commerce.get(handle) ||
        ({
          handle,
          published: !upcoming,
          price: null,
          editionSize: 5,
          variants: [],
        } satisfies PieceCommerce);
      const edition = describeEdition(c, opensAt, now);
      const photo = p.cardPhoto || p.gallery0 || null;
      const soldOut = edition.state === 'sold-out';
      const price =
        upcoming || !c.price
          ? null
          : formatSitePrice(c.price.amount, c.price.currency);
      return {
        title,
        handle,
        href: `/pieces/${handle}`,
        number,
        numberLabel: `N° ${pad2(number)}`,
        pieceIndexLabel: ui.drop.pieceOf(pad2(i + 1), pad2(total)),
        cardStory: p.cardStory || '',
        photo,
        toneBg: toneBg(photo),
        objectPosition: photo?.position || 'center',
        filter: soldOut ? 'grayscale(1) contrast(0.9)' : 'none',
        numberColor: photo?.tone === 'black' ? '#F5F5F7' : '#0B0B0C',
        flip: i % 2 === 1,
        price,
        upcoming: edition.state === 'upcoming',
        edition,
        sizeSummary: sizeSummary(c.variants, { includeGone: true }),
        ctaHref: soldOut ? '/pieces?filter=sold-out' : `/pieces/${handle}`,
        ctaLabel: soldOut ? ui.stock.seeItInArchive : ui.drop.viewThePiece,
        ctaClass: soldOut ? 's-btn s-btn-o' : 's-btn s-btn-p',
      };
    });
}

function mapDrop(raw: RawDrop, commerce: Map<string, PieceCommerce>, now: number): DropPageData | null {
  const d = raw.drop;
  if (!d?.code || !d.name || !d.slug || !d.opensAt) return null;

  const opensMs = Date.parse(d.opensAt);
  const upcoming = !Number.isNaN(opensMs) && opensMs > now;
  const pieces = buildRows(d.pieces || [], commerce, d.opensAt, now, upcoming);
  const totals = dropTotals(
    pieces.map((p) => ({ left: p.edition.left, editionSize: p.edition.size })),
  );
  const editionSize = pieces[0] ? editionSizeOf({ editionSize: pieces[0].edition.size }) : 5;

  const next = raw.siblings?.next;
  const prev = raw.siblings?.prev;

  return {
    code: d.code,
    name: d.name,
    slug: d.slug,
    opensAt: d.opensAt,
    upcoming,
    eyebrow: upcoming
      ? `Drop · ${formatOpensLong(d.opensAt)}`
      : `Drop · ${formatReleasedLong(d.opensAt)}`,
    introHtml: lineTextToHtml(d.intro),
    piecesCountLabel: pad2(pieces.length),
    editionLabel: ui.drop.editionEachValue(editionSize),
    leftPad: pad2(totals.left),
    capacity: totals.capacity,
    left: totals.left,
    pieces,
    definition:
      d.definition?.word && d.definition.meaning
        ? {
            word: d.definition.word,
            pos: d.definition.pos || 'noun',
            meaning: d.definition.meaning,
            photo: d.definition.image || null,
          }
        : null,
    notesIntro: d.notesIntro || '',
    notes: (d.notes || [])
      .filter((n) => n.title && n.text)
      .map((n) => ({ title: n.title!, text: n.text! })),
    next:
      next?.code && next.name && next.slug && next.opensAt
        ? {
            code: next.code,
            name: next.name,
            slug: next.slug,
            eyebrow: ui.drop.nextDropEyebrow(formatDayMonthYear(next.opensAt)),
          }
        : null,
    prev:
      prev?.code && prev.name && prev.slug
        ? { code: prev.code, name: prev.name, slug: prev.slug }
        : null,
    seo: {
      title: d.seo?.title || `NEVMA Style — ${d.code}`,
      description: d.seo?.description,
      noindex: d.seo?.noindex,
    },
  };
}

export async function loadDrop(
  slug: string,
  cookieHeader: string | null,
): Promise<DropPageData | null> {
  const now = nowMs();
  if (!sanityConfigured()) return null;

  try {
    const raw = await sanityFetch<RawDrop>(dropQuery, { slug });
    if (!raw.drop) return null;
    const handles = (raw.drop.pieces || [])
      .map((p) => p.handle)
      .filter(Boolean) as string[];
    const provider = createCommerceProvider({
      fixtureFlags: fixtureFlagsFromCookie(cookieHeader),
    });
    const pieces = await provider.getPieces(handles);
    return mapDrop(raw, commerceMap(pieces), now);
  } catch {
    return null;
  }
}

/** Prefer the latest opened drop; else the soonest upcoming. */
export async function currentDropSlug(): Promise<string | null> {
  if (!sanityConfigured()) return 'style-001';
  try {
    const now = new Date(nowMs()).toISOString();
    const row = await sanityFetch<{ slug?: string } | null>(
      `coalesce(
        *[_type == "drop" && opensAt <= $now] | order(opensAt desc)[0]{ "slug": slug.current },
        *[_type == "drop" && opensAt > $now] | order(opensAt asc)[0]{ "slug": slug.current }
      )`,
      { now },
    );
    return row?.slug || null;
  } catch {
    return 'style-001';
  }
}
