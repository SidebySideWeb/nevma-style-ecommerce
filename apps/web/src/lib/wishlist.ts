import { createCommerceProvider } from './commerce/provider';
import { describeEdition } from './commerce/edition';
import { formatDayMonth, formatSitePrice, formatTimeGmt } from './commerce/format';
import type { PieceCommerce } from './commerce/types';
import { fixtureFlagsFromCookie } from './chrome';
import { nowMs } from './now';
import { isCommerceMock } from './server/env';
import { sanityConfigured, sanityFetch } from './sanity/client';
import { wishlistQuery } from './sanity/queries';
import type { Photo } from './sanity/types';
import { hasPhotoImage, TONE_BG } from './sanity/image';
import { ui } from '../content/ui';
import { resolveCustomer, isSignedInFixture } from './account/load';
import { getProfile } from './server/sanity-write';
import { readSession } from './account/auth';

export type WishlistCard = {
  handle: string;
  href: string;
  title: string;
  priceLabel: string;
  tag: string;
  tagStyle: string;
  stockLine: string;
  edition: ReturnType<typeof describeEdition>;
  photo: Photo | null;
  toneBg: string;
  objectPosition: string;
  imgFilter: string;
  hasImage: boolean;
  placeholderLabel?: string;
  cta: 'choose' | 'reminder' | 'archive';
  reminderOn?: boolean;
};

export type WishlistPageData = {
  signedIn: boolean;
  countLabel: string;
  note: string;
  guestTitle: string;
  guestText: string;
  guestCta: string;
  cards: WishlistCard[];
};

const LOCAL_SRC: Record<string, string> = {
  'definition-tee-white': '/images/definition-tee-white.jpg',
  'wordmark-tee-bone': '/images/wordmark-tee-bone.jpg',
  'definition-tee-bone': '/images/definition-tees-bone.jpg',
};

const LOCAL_POS: Record<string, string> = {
  'definition-tee-white': 'center 42%',
  'definition-tee-bone': 'center 35%',
};

const LOCAL_TONE: Record<string, string> = {
  'definition-tee-white': 'black',
  'definition-tee-bone': 'bone',
};

/** Card shell backgrounds from the design (not Sanity tone tokens). */
const LOCAL_CARD_BG: Record<string, string> = {
  'definition-tee-white': '#000000',
  'definition-tee-bone': '#D9D3C8',
  'suede-cap-sand': '#0B0B0C',
};

const NOTE =
  'Saving a piece doesn’t hold it. We email you if a saved piece is down to its last one.';
const GUEST_TITLE = 'Saved on this device only.';
const GUEST_TEXT =
  'Sign in and your wishlist follows you to your phone and laptop, with last-piece alerts.';
const GUEST_CTA = 'Sign in or create account';

function parseGuestList(cookieHeader: string | null): string[] {
  if (!cookieHeader) return [];
  const m = cookieHeader.match(/(?:^|;\s*)ns_wishlist=([^;]*)/);
  if (!m?.[1]) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(m[1])) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return decodeURIComponent(m[1])
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

function localPhoto(handle: string): Photo {
  const src = LOCAL_SRC[handle];
  return {
    alt: '',
    position: LOCAL_POS[handle] || 'center',
    tone: (LOCAL_TONE[handle] || 'black') as NonNullable<Photo>['tone'],
    image: src ? { asset: { url: src } } : null,
  };
}

function availableSizesLine(piece: PieceCommerce): string {
  const sizes = piece.variants.filter((v) => v.quantityAvailable > 0).map((v) => v.size);
  if (!sizes.length) return '';
  if (sizes.length === 1) return sizes[0]!;
  if (sizes.length === 2) return `${sizes[0]} and ${sizes[1]}`;
  return `${sizes.slice(0, -1).join(', ')} and ${sizes[sizes.length - 1]}`;
}

function tagStyle(state: string): string {
  if (state === 'sold-out') return 'background: #D9D3C8; color: #3E3B35';
  if (state === 'upcoming') return 'background: #F5F5F7; color: #000000';
  return 'background: #0B0B0C; color: #F5F2EC';
}

async function resolveHandles(
  cookieHeader: string | null,
  signedIn: boolean,
): Promise<string[]> {
  if (isCommerceMock()) {
    const provider = createCommerceProvider({
      fixtureFlags: fixtureFlagsFromCookie(cookieHeader),
    });
    return provider.getWishlist();
  }
  if (signedIn) {
    const session = await readSession(cookieHeader);
    if (session?.customerId) {
      const profile = await getProfile(session.customerId);
      const refs = (profile?.wishlist || [])
        .map((w) => w.piece?._ref)
        .filter((x): x is string => Boolean(x));
      if (refs.length) {
        // Resolve piece document ids → handles when possible.
        if (sanityConfigured()) {
          try {
            const rows = await sanityFetch<{ handle?: string }[]>(
              `*[_type == "piece" && _id in $ids]{"handle": coalesce(product->store.slug.current, handle.current)}`,
              { ids: refs },
            );
            const handles = rows.map((r) => r.handle).filter((h): h is string => Boolean(h));
            if (handles.length) return handles;
          } catch {
            /* fall through */
          }
        }
      }
    }
  }
  return parseGuestList(cookieHeader);
}

export async function loadWishlist(cookieHeader: string | null): Promise<WishlistPageData> {
  const customer = await resolveCustomer(cookieHeader);
  const signedIn = Boolean(customer) || isSignedInFixture(cookieHeader);

  type Raw = {
    shop?: {
      wishlist?: {
        title?: string;
        note?: string;
        guestTitle?: string;
        guestText?: string;
        guestCta?: string;
      };
    };
  };
  let raw: Raw | null = null;
  if (sanityConfigured()) {
    try {
      raw = await sanityFetch<Raw>(wishlistQuery);
    } catch {
      raw = null;
    }
  }

  const handles = await resolveHandles(cookieHeader, signedIn);
  const provider = createCommerceProvider({
    fixtureFlags: fixtureFlagsFromCookie(cookieHeader),
  });
  const pieces = await provider.getPieces(handles);
  const byHandle = new Map(pieces.map((p) => [p.handle, p]));
  const now = nowMs();

  // Drop opensAt for coming pieces (STYLE 002).
  const opensAtByHandle = new Map<string, string>();
  if (sanityConfigured()) {
    try {
      const rows = await sanityFetch<{ handle?: string; opensAt?: string }[]>(
        `*[_type == "piece" && handle.current in $handles]{
          "handle": coalesce(product->store.slug.current, handle.current),
          "opensAt": drop->opensAt
        }`,
        { handles },
      );
      for (const r of rows) if (r.handle && r.opensAt) opensAtByHandle.set(r.handle, r.opensAt);
    } catch {
      /* ignore */
    }
  }
  if (isCommerceMock()) {
    for (const h of ['suede-cap-sand', 'signal-overshirt', 'silk-square-70']) {
      if (!opensAtByHandle.has(h)) opensAtByHandle.set(h, '2026-12-04T18:00:00Z');
    }
  }

  const cards: WishlistCard[] = [];
  for (const handle of handles) {
    const piece = byHandle.get(handle);
    if (!piece) continue;
    const opensAt = opensAtByHandle.get(handle);
    const edition = describeEdition(piece, opensAt, now);
    const photo = localPhoto(handle);
    const hasImage = hasPhotoImage(photo);
    let priceLabel = piece.price ? formatSitePrice(piece.price.amount) : '';
    let stockLine: string;
    let cta: WishlistCard['cta'];
    let tag = edition.cardTag;

    if (edition.state === 'upcoming') {
      priceLabel = opensAt ? formatDayMonth(opensAt) : '';
      stockLine = `Edition of ${edition.size} · opens ${formatTimeGmt(opensAt || now)} GMT`;
      tag = ui.stock.coming;
      cta = 'reminder';
    } else if (edition.state === 'sold-out') {
      stockLine = edition.meterLine;
      cta = 'archive';
    } else {
      const sizes = availableSizesLine(piece);
      stockLine = sizes ? `${edition.stockLine} · ${sizes}` : edition.stockLine;
      cta = 'choose';
      tag = edition.cardTag;
    }

    cards.push({
      handle,
      href: `/pieces/${handle}`,
      title: piece.title || handle,
      priceLabel,
      tag,
      tagStyle: tagStyle(edition.state),
      stockLine,
      edition,
      photo: hasImage ? photo : null,
      toneBg:
        LOCAL_CARD_BG[handle] ||
        TONE_BG[(photo?.tone as keyof typeof TONE_BG) || 'black'] ||
        '#0B0B0C',
      objectPosition: photo?.position || 'center',
      imgFilter: edition.state === 'sold-out' ? 'grayscale(1) contrast(0.9)' : 'none',
      hasImage,
      placeholderLabel: hasImage ? undefined : `[Photo · ${piece.title || handle}]`,
      cta,
      reminderOn: cta === 'reminder',
    });
  }

  const n = cards.length;
  return {
    signedIn,
    countLabel: `${n} ${n === 1 ? 'piece' : 'pieces'} saved`,
    note: raw?.shop?.wishlist?.note || NOTE,
    guestTitle: raw?.shop?.wishlist?.guestTitle || GUEST_TITLE,
    guestText: raw?.shop?.wishlist?.guestText || GUEST_TEXT,
    guestCta: raw?.shop?.wishlist?.guestCta || GUEST_CTA,
    cards,
  };
}
