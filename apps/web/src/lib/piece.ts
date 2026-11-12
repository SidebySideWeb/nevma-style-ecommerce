import { createCommerceProvider } from './commerce/provider';
import {
  describeEdition,
  shortLine,
  sizeChipAria,
  sizeNote,
  soldOutDetail,
} from './commerce/edition';
import {
  countdownParts,
  formatComingShort,
  formatDayMonth,
  formatOpensDayTime,
  formatSitePrice,
  formatTimeGmt,
} from './commerce/format';
import type { EditionState, PieceCommerce, PieceVariant } from './commerce/types';
import { fixtureFlagsFromCookie } from './chrome';
import { nowMs } from './now';
import { sanityConfigured, sanityFetch } from './sanity/client';
import { pieceQuery } from './sanity/queries';
import { TONE_BG } from './sanity/image';
import type { Photo } from './sanity/types';
import { ui } from '../content/ui';

export type PieceSizeChip = {
  size: string;
  variantId: string;
  qty: number;
  soldOut: boolean;
  aria: string;
  lastOne: boolean;
};

export type PieceColourSwatch = {
  colour: string;
  swatch: string;
  href: string;
  current: boolean;
  soldOut: boolean;
  aria: string;
};

export type WearWithCard = {
  title: string;
  href: string;
  photo: Photo | null;
  toneBg: string;
  left: string;
  right: string;
  placeholderLabel?: string;
};

export type PiecePageData = {
  id: string;
  title: string;
  handle: string;
  colour: string;
  reference: string;
  eyebrow: string;
  priceLabel: string;
  /** Raw commerce price for JSON-LD (null when unknown). */
  priceAmount: string | null;
  priceCurrency: string | null;
  state: EditionState;
  upcoming: boolean;
  soldOut: boolean;
  edition: ReturnType<typeof describeEdition>;
  stockSubline: string;
  gallery: Photo[];
  sizes: PieceSizeChip[];
  colours: PieceColourSwatch[];
  sizeNoteDefault: string;
  buyNotes: [string, string];
  lead: string;
  body: string;
  facts: string[];
  care: string;
  sizeGuide: {
    unit: string;
    sizes: string[];
    rows: { label: string; values: string[] }[];
  } | null;
  deliveryText: string;
  editionText: string;
  paymentText: string;
  film: {
    eyebrow: string;
    title: string;
    text: string;
    caption: string;
    poster: Photo | null;
    videoUrl: string | null;
    captionsUrl: string | null;
  };
  wearWith: null | {
    photo: Photo | null;
    cards: WearWithCard[];
  };
  keepExploring: { label: string; href: string; photo: Photo | null }[];
  services: {
    title: string;
    text: string;
    link: { label: string; href: string } | null;
  }[];
  notify: null | {
    label: string;
    button: string;
    dropId: string;
    pieceId?: string;
    success: string;
  };
  countdown: null | {
    opensAtMs: number;
    aria: string;
    days: string;
    hours: string;
    minutes: string;
    time: string;
  };
  drawerNoteTemplate: string;
  dropCode: string;
  dropName: string;
  dropSlug: string;
  opensAt: string;
  seo: {
    title?: string;
    description?: string;
    noindex?: boolean;
    image?: { asset?: { _id?: string; url?: string } | null } | null;
  };
};

type RawPiece = {
  _id?: string;
  title?: string;
  handle?: string;
  colour?: string;
  swatch?: string;
  reference?: string;
  lead?: string;
  body?: string;
  facts?: string[] | null;
  care?: string;
  editionText?: string;
  sizeGuide?: {
    unit?: string;
    sizes?: string[];
    rows?: { label?: string; values?: string[] }[];
  } | null;
  gallery?: Photo[] | null;
  otherColours?: {
    title?: string;
    handle?: string;
    swatch?: string;
    colour?: string;
    phase1State?: string;
  }[] | null;
  film?: {
    eyebrow?: string;
    title?: string;
    text?: string;
    caption?: string;
    poster?: Photo;
    videoUrl?: string;
    captionsUrl?: string;
  } | null;
  wearWith?: {
    photo?: Photo;
    pieces?: {
      title?: string;
      handle?: string;
      drop?: { code?: string; opensAt?: string };
      gallery0?: Photo;
      cardPhoto?: Photo;
      phase1State?: string;
    }[] | null;
  } | null;
  drop?: {
    code?: string;
    name?: string;
    slug?: string;
    opensAt?: string;
    _id?: string;
  } | null;
  seo?: {
    title?: string;
    description?: string;
    noindex?: boolean;
    image?: { asset?: { _id?: string; url?: string } | null } | null;
  };
};

type RawBundle = {
  piece?: RawPiece | null;
  defaults?: {
    pieceDefaults?: {
      editionText?: string;
      deliveryText?: string;
      paymentText?: string;
      buyNote?: string;
      deliveryLine?: string;
      keepExploring?: { label?: string; href?: string; photo?: Photo }[] | null;
      filmDefault?: {
        eyebrow?: string;
        title?: string;
        text?: string;
        caption?: string;
        poster?: Photo;
      } | null;
    };
    notify?: { pieceDone?: string };
    services?: {
      title?: string;
      text?: string;
      link?: { label?: string; href?: string } | null;
    }[] | null;
  };
  shop?: { bag?: { drawerNote?: string } };
  nextDrop?: {
    _id?: string;
    code?: string;
    name?: string;
    slug?: string;
    opensAt?: string;
  } | null;
};

function toneBg(photo: Photo | undefined | null): string {
  const t = photo?.tone;
  return (t && TONE_BG[t as keyof typeof TONE_BG]) || TONE_BG.bone;
}

function wearTitle(title: string, dropCode: string | undefined, upcoming: boolean): string {
  if (!upcoming || !dropCode) return title;
  const base = title.split('·')[0]?.trim() || title;
  return `${base} · ${dropCode}`;
}

function mapWearCards(
  raw: NonNullable<RawPiece['wearWith']>['pieces'],
  commerce: Map<string, PieceCommerce>,
  now: number,
): WearWithCard[] {
  return (raw || [])
    .filter((p) => p.handle && p.title)
    .map((p) => {
      const handle = p.handle!;
      const c =
        commerce.get(handle) ||
        ({
          handle,
          published: false,
          price: null,
          editionSize: 5,
          variants: [],
        } satisfies PieceCommerce);
      const edition = describeEdition(c, p.drop?.opensAt, now);
      const upcoming = edition.state === 'upcoming';
      const photo = p.cardPhoto || p.gallery0 || null;
      const hasImg = Boolean(photo?.image?.asset?._id || photo?.image?.asset?.url);
      const baseName = p.title!.split('·')[0]?.trim() || p.title!;
      return {
        title: wearTitle(p.title!, p.drop?.code, upcoming),
        href: `/pieces/${handle}`,
        photo,
        toneBg: toneBg(photo),
        left: upcoming
          ? formatDayMonth(p.drop?.opensAt || '')
          : c.price
            ? formatSitePrice(c.price.amount, c.price.currency)
            : '',
        right: upcoming ? ui.product.notifyMe : shortLine(edition.state, edition.left, edition.size),
        placeholderLabel: hasImg ? undefined : `[Photo · ${baseName}]`,
      };
    });
}

function mapPiece(
  raw: RawBundle,
  commerce: PieceCommerce,
  related: Map<string, PieceCommerce>,
  now: number,
): PiecePageData | null {
  const p = raw.piece;
  if (!p?.title || !p.handle || !p.drop?.code || !p.drop.opensAt) return null;

  const opensAt = p.drop.opensAt;
  const edition = describeEdition(commerce, opensAt, now);
  const upcoming = edition.state === 'upcoming';
  const soldOut = edition.state === 'sold-out';
  const defaults = raw.defaults?.pieceDefaults;
  const next = raw.nextDrop;

  const sizes: PieceSizeChip[] = commerce.variants.map((v: PieceVariant) => ({
    size: v.size,
    variantId: v.id,
    qty: v.quantityAvailable,
    soldOut: v.quantityAvailable <= 0,
    lastOne: v.quantityAvailable === 1,
    aria: sizeChipAria(v.size, v.quantityAvailable),
  }));

  const colours: PieceColourSwatch[] = [
    {
      colour: p.colour || '',
      swatch: p.swatch || '#F7F6F2',
      href: `/pieces/${p.handle}`,
      current: true,
      soldOut: false,
      aria: ui.product.colourSelected(p.colour || ''),
    },
    ...(p.otherColours || [])
      .filter((o) => o.handle && o.colour)
      .map((o) => {
        const oc = related.get(o.handle!);
        const otherSold =
          o.phase1State === 'sold-out' ||
          (oc ? describeEdition(oc, undefined, now).state === 'sold-out' : false);
        return {
          colour: o.colour!,
          swatch: o.swatch || '#D6CBB5',
          href: otherSold ? '/pieces?filter=sold-out' : `/pieces/${o.handle}`,
          current: false,
          soldOut: otherSold,
          aria: otherSold
            ? ui.product.colourSoldOut(o.colour!)
            : o.colour!,
        };
      }),
  ];

  const filmSrc = p.film || defaults?.filmDefault;
  // Seed/design gallery for upcoming boards; used when Sanity gallery is empty.
  const seededGallery: Record<string, Photo[]> = {
    'suede-cap-sand': [
      { alt: '', placeholder: 'Suede Cap · front', tone: 'ink' },
      { alt: '', placeholder: 'Suede Cap · back embroidery', tone: 'ink2' },
      { alt: '', placeholder: 'worn, on model', tone: 'bone' },
    ],
  };
  const gallery = (p.gallery?.length ? p.gallery : seededGallery[p.handle!] || []).slice(0, 3);
  while (gallery.length < 3) {
    gallery.push({
      alt: '',
      placeholder: 'worn, on model',
      tone: 'bone',
    } as Photo);
  }

  const notifyDrop = upcoming
    ? { id: p.drop._id || '', code: p.drop.code }
    : soldOut && next?.code
      ? { id: next._id || '', code: next.code }
      : null;

  const pieceDone = (raw.defaults?.notify?.pieceDone || '').replace(
    '{drop}',
    notifyDrop?.code || next?.code || p.drop.code,
  );

  const cd = upcoming ? countdownParts(opensAt, now) : null;

  return {
    id: p._id || `piece-${p.handle}`,
    title: p.title,
    handle: p.handle,
    colour: p.colour || '',
    reference: p.reference || '',
    eyebrow: upcoming
      ? `${p.drop.code} · ${p.drop.name} · ${formatComingShort(opensAt)}`
      : `${p.drop.code} · ${p.drop.name}`,
    priceLabel: upcoming
      ? ui.product.priceRevealed
      : commerce.price
        ? formatSitePrice(commerce.price.amount, commerce.price.currency)
        : '',
    priceAmount: commerce.price?.amount ?? null,
    priceCurrency: commerce.price?.currency ?? null,
    state: edition.state,
    upcoming,
    soldOut,
    edition,
    stockSubline: upcoming
      ? `${formatOpensDayTime(opensAt)}. ${ui.product.onePerCustomer}`
      : soldOut
        ? soldOutDetail(edition.size)
        : ui.product.liveStock,
    gallery,
    sizes,
    colours,
    sizeNoteDefault: sizeNote(null),
    buyNotes: [
      defaults?.buyNote ||
        'One per customer. A bag does not hold a piece: it is yours once paid.',
      defaults?.deliveryLine ||
        'UK delivery 2 to 4 working days · Returns within 14 days',
    ],
    lead: p.lead || '',
    body: p.body || '',
    facts: (p.facts || []).filter(Boolean) as string[],
    care: p.care || '',
    sizeGuide: p.sizeGuide?.sizes?.length
      ? {
          unit: p.sizeGuide.unit || 'cm',
          sizes: p.sizeGuide.sizes,
          rows: (p.sizeGuide.rows || [])
            .filter((r) => r.label && r.values?.length)
            .map((r) => ({ label: r.label!, values: r.values! })),
        }
      : null,
    deliveryText: defaults?.deliveryText || '',
    editionText: p.editionText || defaults?.editionText || '',
    paymentText: defaults?.paymentText || '',
    film: {
      eyebrow: filmSrc?.eyebrow || 'The art of the edition',
      title: filmSrc?.title || 'One number, written by hand',
      text: filmSrc?.text || '',
      caption: filmSrc?.caption || '[Film · 0:24, muted, captions on]',
      poster: filmSrc && 'poster' in filmSrc ? filmSrc.poster || null : null,
      videoUrl: p.film?.videoUrl || null,
      captionsUrl: p.film?.captionsUrl || null,
    },
    wearWith: p.wearWith?.pieces?.length
      ? {
          photo: p.wearWith.photo || null,
          cards: mapWearCards(p.wearWith.pieces, related, now),
        }
      : null,
    keepExploring: (defaults?.keepExploring || [])
      .filter((k) => k.label && k.href)
      .map((k) => ({
        label: k.label!,
        href: k.href!,
        photo: k.photo || null,
      })),
    services: (raw.defaults?.services || [])
      .filter((s) => s.title && s.text)
      .map((s) => ({
        title: s.title!,
        text: s.text!,
        link: s.link?.href && s.link.label
          ? { label: s.link.label, href: s.link.href }
          : null,
      })),
    notify: notifyDrop
      ? {
          label: upcoming ? ui.product.emailWhenOpens : ui.product.hearFirst,
          button: upcoming
            ? ui.product.notifyMe
            : ui.product.notifyMeOf(notifyDrop.code),
          dropId: notifyDrop.id,
          pieceId: upcoming ? p._id : undefined,
          success: pieceDone,
        }
      : null,
    countdown: cd
      ? {
          opensAtMs: Date.parse(opensAt),
          aria: `Opens ${formatOpensDayTime(opensAt).replace(/^Opens /, '').replace(', ', ' at ')}`,
          days: String(cd.days),
          hours: cd.display.hours,
          minutes: cd.display.minutes,
          time: formatTimeGmt(opensAt),
        }
      : null,
    drawerNoteTemplate:
      raw.shop?.bag?.drawerNote ||
      'Pieces are not held in a bag. {leftWords} Check out now to make it yours.',
    dropCode: p.drop.code,
    dropName: p.drop.name || '',
    dropSlug: p.drop.slug || '',
    opensAt,
    seo: {
      title: p.seo?.title || `NEVMA Style - ${p.title}`,
      description: p.seo?.description,
      noindex: p.seo?.noindex,
      image: p.seo?.image,
    },
  };
}

export async function loadPiece(
  handle: string,
  cookieHeader: string | null,
): Promise<PiecePageData | null> {
  const now = nowMs();
  if (!sanityConfigured()) return null;

  try {
    const raw = await sanityFetch<RawBundle>(pieceQuery, {
      handle,
      now: new Date(now).toISOString(),
    });
    if (!raw.piece?.handle) return null;

    const relatedHandles = [
      ...(raw.piece.otherColours || []).map((o) => o.handle).filter(Boolean),
      ...(raw.piece.wearWith?.pieces || []).map((p) => p.handle).filter(Boolean),
    ] as string[];
    const handles = [...new Set([handle, ...relatedHandles])];
    const provider = createCommerceProvider({
      fixtureFlags: fixtureFlagsFromCookie(cookieHeader),
    });
    const pieces = await provider.getPieces(handles);
    const map = new Map(pieces.map((p) => [p.handle, p]));
    const commerce = map.get(handle);
    if (!commerce) return null;
    return mapPiece(raw, commerce, map, now);
  } catch {
    return null;
  }
}

export function drawerNote(template: string, sizeQty: number): string {
  const leftWords =
    sizeQty === 1 ? ui.bag.drawerLast : ui.bag.drawerOthers;
  return template.replace('{leftWords}', leftWords);
}

export function sizeNoteFor(size: string | null, qty: number | undefined): string {
  return sizeNote(size, qty);
}
