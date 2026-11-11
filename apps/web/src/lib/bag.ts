import { createCommerceProvider } from './commerce/provider';
import { describeEdition, dropTotals, leftCount } from './commerce/edition';
import {
  formatOpensDayAtTime,
  formatSitePrice,
} from './commerce/format';
import type { Cart, CartLine, PieceCommerce } from './commerce/types';
import { fixtureFlagsFromCookie } from './chrome';
import { nowMs } from './now';
import { isCommerceMock } from './server/env';
import {
  clearFlashCookieHeader,
  flashCookieHeader,
  parseFlash,
  readCookie,
  type BagFlash,
  type SoldFlashLine,
} from './server/cart-cookie';
import { sanityConfigured, sanityFetch } from './sanity/client';
import { bagQuery } from './sanity/queries';
import type { Photo } from './sanity/types';
import { hasPhotoImage, TONE_BG } from './sanity/image';
import { ui } from '../content/ui';

export type BagLineView = {
  id: string;
  handle: string;
  href: string;
  title: string;
  size: string;
  meta: string;
  priceLabel: string;
  stockLine: string;
  edition: ReturnType<typeof describeEdition>;
  sold: boolean;
  opacity: string;
  imgFilter: string;
  priceDecoration: string;
  photo: Photo | null;
  toneBg: string;
  objectPosition: string;
  hasImage: boolean;
  alt: string;
};

export type BagPageData = {
  empty: boolean;
  countLabel: string;
  activeCount: number;
  lines: BagLineView[];
  subtotalLabel: string;
  totalLabel: string;
  notHeldNote: string;
  dutiesNote: string;
  checkoutNote: string;
  checkoutHref: string;
  notice: null | { title: string; text: string };
  emptyEyebrow: string;
  emptyTitle: string;
  emptyText: string;
  emptyPrimaryHref: string;
  emptyPrimaryLabel: string;
  emptySecondaryHref: string;
  emptySecondaryLabel: string;
  /** Set-Cookie headers to apply on the response (flash clear / set). */
  setCookies: string[];
};

type RawBag = {
  shop?: {
    bag?: {
      notHeldNote?: string;
      dutiesNote?: string;
      checkoutNote?: string;
      soldTitle?: string;
      soldText?: string;
      emptyEyebrow?: string;
      emptyTitle?: string;
      emptyText?: string;
    };
  } | null;
  currentDrop?: {
    code?: string;
    slug?: string;
    opensAt?: string;
    pieces?: { handle?: string }[] | null;
  } | null;
  nextDrop?: {
    code?: string;
    name?: string;
    slug?: string;
    opensAt?: string;
  } | null;
};

const LOCAL_SRC: Record<string, string> = {
  'definition-tee-white': '/images/definition-tee-white.jpg',
  'wordmark-tee-bone': '/images/wordmark-tee-bone.jpg',
  'definition-tee-bone': '/images/definition-tees-bone.jpg',
};

const LOCAL_POS: Record<string, string> = {
  'definition-tee-white': 'center 42%',
  'wordmark-tee-bone': 'center 55%',
  'definition-tee-bone': 'center 35%',
};

const LOCAL_TONE: Record<string, string> = {
  'definition-tee-white': 'black',
  'wordmark-tee-bone': 'bone',
  'definition-tee-bone': 'bone',
};

function isUnavailable(line: CartLine): boolean {
  return Boolean(line.soldWhileInBag) || !line.availableForSale || line.quantityAvailable <= 0;
}

function toFlashLine(line: CartLine, dropCode?: string): SoldFlashLine {
  return {
    handle: line.handle,
    title: line.title,
    size: line.size,
    priceAmount: line.price.amount,
    priceCurrency: line.price.currency,
    dropCode,
  };
}

function localPhoto(handle: string): Photo {
  const src = LOCAL_SRC[handle];
  const tone = (LOCAL_TONE[handle] || 'bone') as NonNullable<Photo>['tone'];
  return {
    alt: '',
    position: LOCAL_POS[handle] || 'center',
    tone,
    image: src ? { asset: { url: src } } : null,
  };
}

async function pieceMeta(
  handles: string[],
): Promise<Map<string, { dropCode: string; photo: Photo | null; opensAt?: string }>> {
  const map = new Map<string, { dropCode: string; photo: Photo | null; opensAt?: string }>();
  if (!handles.length || !sanityConfigured()) return map;
  try {
    const rows = await sanityFetch<
      {
        handle?: string;
        dropCode?: string;
        opensAt?: string;
        cardPhoto?: Photo;
        gallery0?: Photo;
      }[]
    >(
      `*[_type == "piece" && handle.current in $handles]{
        "handle": coalesce(product->store.slug.current, handle.current),
        "dropCode": drop->code,
        "opensAt": drop->opensAt,
        cardPhoto{alt, position, tone, image{asset->{_id, url}, hotspot, crop}},
        "gallery0": gallery[0]{alt, position, tone, image{asset->{_id, url}, hotspot, crop}}
      }`,
      { handles },
    );
    for (const r of rows) {
      if (!r.handle) continue;
      let photo = r.cardPhoto || r.gallery0 || null;
      if (isCommerceMock() && LOCAL_SRC[r.handle]) {
        photo = localPhoto(r.handle);
      }
      map.set(r.handle, {
        dropCode: r.dropCode || '',
        photo,
        opensAt: r.opensAt,
      });
    }
  } catch {
    /* empty */
  }
  return map;
}

function lineView(
  line: CartLine,
  meta: { dropCode: string; photo: Photo | null; opensAt?: string } | undefined,
  commerce: PieceCommerce | undefined,
  now: number,
  sold: boolean,
): BagLineView {
  const dropCode = meta?.dropCode || '';
  const c =
    commerce ||
    ({
      handle: line.handle,
      published: true,
      price: line.price,
      editionSize: 5,
      variants: [{ id: line.variantId, size: line.size, quantityAvailable: line.quantityAvailable, availableForSale: line.availableForSale }],
    } satisfies PieceCommerce);
  const edition = describeEdition(c, meta?.opensAt, now);
  const photo =
    meta?.photo ||
    (isCommerceMock() && LOCAL_SRC[line.handle] ? localPhoto(line.handle) : null);
  const tone = (photo?.tone as keyof typeof TONE_BG) || 'bone';
  return {
    id: line.id,
    handle: line.handle,
    href: `/pieces/${line.handle}`,
    title: line.title,
    size: line.size,
    meta: ui.bag.lineMeta(dropCode || 'STYLE', line.size),
    priceLabel: formatSitePrice(line.price.amount, line.price.currency),
    stockLine: sold ? ui.stock.soldOutWhileInBag : edition.stockLine,
    edition: sold
      ? {
          ...edition,
          meter: { filled: 0, total: edition.size, dashed: false },
          stockLine: ui.stock.soldOutWhileInBag,
        }
      : edition,
    sold,
    opacity: sold ? '0.6' : '1',
    imgFilter: sold ? 'grayscale(1)' : 'none',
    priceDecoration: sold ? 'line-through' : 'none',
    photo,
    toneBg: TONE_BG[tone] || TONE_BG.bone,
    objectPosition: photo?.position || LOCAL_POS[line.handle] || 'center',
    hasImage: hasPhotoImage(photo),
    alt: photo?.alt || line.title,
  };
}

function fillEmptyText(
  template: string,
  vars: { drop: string; left: string; nextDrop: string; nextDate: string },
): string {
  return template
    .replaceAll('{drop}', vars.drop)
    .replaceAll('{left}', vars.left)
    .replaceAll('{nextDrop}', vars.nextDrop)
    .replaceAll('{nextDate}', vars.nextDate);
}

function fillSoldTitle(template: string, piece: string): string {
  return template.replaceAll('{piece}', piece);
}

/**
 * Load bag page data: re-validate stock, peel sold lines into a one-shot flash,
 * build active + greyed lines for this render.
 */
export async function loadBag(cookieHeader: string | null): Promise<BagPageData> {
  const now = nowMs();
  const setCookies: string[] = [];
  const provider = createCommerceProvider({
    fixtureFlags: fixtureFlagsFromCookie(cookieHeader),
  });

  const cart = await provider.getCart();
  const unavailable = cart.lines.filter(isUnavailable);
  const active = cart.lines.filter((l) => !isUnavailable(l));

  // Remove sold lines from the cart (Shopify / fixture).
  for (const line of unavailable) {
    await provider.removeLine(line.id);
  }

  const existingFlash = parseFlash(readCookie(cookieHeader, 'ns_flash'));
  let soldForView: SoldFlashLine[] = [];

  if (unavailable.length) {
    const meta = await pieceMeta(unavailable.map((l) => l.handle));
    soldForView = unavailable.map((l) => toFlashLine(l, meta.get(l.handle)?.dropCode));
    setCookies.push(flashCookieHeader({ sold: soldForView }));
  } else if (existingFlash?.sold?.length) {
    soldForView = existingFlash.sold;
    setCookies.push(clearFlashCookieHeader());
  }

  const raw = sanityConfigured()
    ? await sanityFetch<RawBag>(bagQuery, { now: new Date(now).toISOString() }).catch(() => null)
    : null;

  const bagCopy = raw?.shop?.bag || {};
  const handles = [
    ...new Set([
      ...active.map((l) => l.handle),
      ...soldForView.map((l) => l.handle),
      ...(raw?.currentDrop?.pieces || []).map((p) => p.handle).filter(Boolean) as string[],
    ]),
  ];
  const [meta, pieces] = await Promise.all([
    pieceMeta(handles),
    provider.getPieces(handles),
  ]);
  const commerce = new Map(pieces.map((p) => [p.handle, p]));

  const activeViews = active.map((l) =>
    lineView(l, meta.get(l.handle), commerce.get(l.handle), now, false),
  );
  const soldViews = soldForView.map((s) => {
    const fake: CartLine = {
      id: `sold-${s.handle}-${s.size}`,
      variantId: '',
      handle: s.handle,
      title: s.title,
      size: s.size,
      quantity: 1,
      price: { amount: s.priceAmount, currency: s.priceCurrency },
      availableForSale: false,
      quantityAvailable: 0,
      soldWhileInBag: true,
    };
    return lineView(fake, meta.get(s.handle), commerce.get(s.handle), now, true);
  });

  const lines = [...activeViews, ...soldViews];
  const subtotal = active.reduce((s, l) => s + Number.parseFloat(l.price.amount) * l.quantity, 0);
  const currency = active[0]?.price.currency || soldForView[0]?.priceCurrency || 'GBP';
  const subtotalLabel = formatSitePrice(String(subtotal), currency);

  let notice: BagPageData['notice'] = null;
  if (soldForView.length) {
    const first = soldForView[0]!;
    const piece = ui.bag.soldPieceLabel(first.title, first.size);
    notice = {
      title: fillSoldTitle(
        bagCopy.soldTitle || '{piece} has just found a home.',
        piece,
      ),
      text:
        bagCopy.soldText ||
        'Someone completed payment for the last piece a moment ago. We’ve taken it out of your total. You can still check out the rest.',
    };
  }

  const empty = active.length === 0 && soldForView.length === 0;

  // Empty-state placeholders from current + next drop.
  let leftInCurrent = 0;
  if (raw?.currentDrop?.pieces?.length) {
    const dropHandles = raw.currentDrop.pieces
      .map((p) => p.handle)
      .filter(Boolean) as string[];
    const dropPieces = dropHandles.map((h) => commerce.get(h)).filter(Boolean) as PieceCommerce[];
    leftInCurrent = dropTotals(
      dropPieces.map((p) => ({ left: leftCount(p.variants), editionSize: p.editionSize })),
    ).left;
  }

  const emptyText = fillEmptyText(
    bagCopy.emptyText ||
      '{drop} still has {left} numbered pieces. {nextDrop} opens on {nextDate}.',
    {
      drop: raw?.currentDrop?.code || 'STYLE 001',
      left: String(leftInCurrent || 4),
      nextDrop: raw?.nextDrop?.code || 'STYLE 002',
      nextDate: raw?.nextDrop?.opensAt
        ? formatOpensDayAtTime(raw.nextDrop.opensAt)
        : 'Friday 4 December at 18:00 GMT',
    },
  );

  return {
    empty,
    countLabel: empty
      ? bagCopy.emptyEyebrow || 'Nothing here yet'
      : ui.bag.piecesCount(active.length),
    activeCount: active.length,
    lines,
    subtotalLabel,
    totalLabel: subtotalLabel,
    notHeldNote:
      bagCopy.notHeldNote ||
      'Pieces in a bag are not held. Each one is yours as soon as payment goes through.',
    dutiesNote:
      bagCopy.dutiesNote ||
      'Prices include UK VAT. Orders outside the UK may pay import duties on delivery [confirm DDP or DAP].',
    checkoutNote:
      bagCopy.checkoutNote ||
      'You’ll confirm delivery with us, then pay on Viva’s secure page: card, Apple Pay or Google Pay.',
    checkoutHref: '/api/checkout',
    notice,
    emptyEyebrow: bagCopy.emptyEyebrow || 'Nothing here yet',
    emptyTitle: bagCopy.emptyTitle || 'Your bag is empty',
    emptyText,
    emptyPrimaryHref: raw?.currentDrop?.slug
      ? `/drops/${raw.currentDrop.slug}`
      : '/drops/style-001',
    emptyPrimaryLabel: ui.bag.emptyCta,
    emptySecondaryHref: '/wishlist',
    emptySecondaryLabel: ui.bag.yourWishlist,
    setCookies,
  };
}

/** Re-validate cart before checkout; returns checkout URL or null if empty. */
export async function prepareCheckout(cookieHeader: string | null): Promise<{
  url: string | null;
  cart: Cart;
  flash?: BagFlash;
}> {
  const provider = createCommerceProvider({
    fixtureFlags: fixtureFlagsFromCookie(cookieHeader),
  });
  let cart = await provider.getCart();
  const unavailable = cart.lines.filter(isUnavailable);
  const flashSold: SoldFlashLine[] = [];
  if (unavailable.length) {
    const meta = await pieceMeta(unavailable.map((l) => l.handle));
    for (const line of unavailable) {
      flashSold.push(toFlashLine(line, meta.get(line.handle)?.dropCode));
      cart = await provider.removeLine(line.id);
    }
  }
  const url = cart.lines.length ? await provider.checkoutUrl() : null;
  return {
    url,
    cart,
    flash: flashSold.length ? { sold: flashSold } : undefined,
  };
}
