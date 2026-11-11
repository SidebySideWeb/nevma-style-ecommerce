import { createCommerceProvider } from './commerce/provider';
import {
  describeEdition,
  dropTotals,
  editionSizeOf,
  leftCount,
} from './commerce/edition';
import { formatReleasedShort, formatSitePrice } from './commerce/format';
import type { PieceCommerce } from './commerce/types';
import { fixtureFlagsFromCookie } from './chrome';
import { nowMs } from './now';
import { sanityConfigured, sanityFetch } from './sanity/client';
import { homeQuery } from './sanity/queries';
import type { Photo } from './sanity/types';
import { ui } from '../content/ui';

export type HomePieceCard = {
  title: string;
  handle: string;
  href: string;
  photo: Photo;
  toneBg: string;
  objectPosition: string;
  filter: string;
  tagStyle: string;
  ariaLabel: string;
  edition: ReturnType<typeof describeEdition>;
  price: string;
};

export type HomeTeaser = {
  label: string;
  index: string;
  photo: Photo;
  editionSize: number;
};

export type HomePageData = {
  /** Current (hero) drop opensAt — for edition state on STYLE 001 cards. */
  dropOpensAt: string;
  hero: {
    eyebrow: string;
    titleLines: string[];
    intro: string;
    leftLabel: string;
    left: number;
    capacity: number;
    statSuffix: string;
    primaryHref: string;
    primaryLabel: string;
    secondaryHref: string;
    secondaryLabel: string;
    piece: {
      title: string;
      handle: string;
      href: string;
      ariaLabel: string;
      photo: Photo;
      objectPosition: string;
      edition: ReturnType<typeof describeEdition>;
    };
  };
  pieces: {
    eyebrow: string;
    title: string;
    linkLabel: string;
    linkHref: string;
    cards: HomePieceCard[];
  };
  signal: null | {
    code: string;
    name: string;
    slug: string;
    opensAt: string;
    opensAtMs: number;
    summary: string;
    homeNote: string;
    backgroundSrc: string;
    dropId: string;
    teasers: HomeTeaser[];
  };
  rules: {
    title: string;
    titleMuted: string;
    items: { mark: string; title: string; text: string }[];
  };
  story: {
    eyebrow: string;
    title: string;
    text: string;
    linkLabel: string;
    photo: Photo;
  };
  world: {
    title: string;
    titleMuted: string;
    cards: {
      label: string;
      labelMuted: string;
      text: string;
      url: string;
      ariaLabel: string;
      photo: Photo;
    }[];
  };
  seo: {
    title?: string;
    description?: string;
    noindex?: boolean;
    image?: { asset?: { _id?: string; url?: string } | null } | null;
  };
};

type RawPiece = {
  title?: string;
  handle?: string;
  cardPhoto?: Photo;
  gallery0?: Photo;
  drop?: { code?: string; name?: string; slug?: string; opensAt?: string };
};

type RawHome = {
  page?: {
    hero?: {
      titleLines?: string[];
      intro?: string;
      statSuffix?: string;
      primaryLabel?: string;
      secondaryLabel?: string;
      drop?: {
        code?: string;
        name?: string;
        slug?: string;
        opensAt?: string;
        pieces?: RawPiece[] | null;
      } | null;
      piece?: RawPiece | null;
      photo?: Photo;
    };
    pieces?: { title?: string; linkLabel?: string };
    next?: {
      drop?: {
        _id?: string;
        code?: string;
        name?: string;
        slug?: string;
        opensAt?: string;
        summary?: string;
        pieces?: RawPiece[] | null;
      } | null;
      background?: Photo;
      teasers?: Photo[] | null;
    };
    rules?: {
      title?: string;
      titleMuted?: string;
      items?: { mark?: string; title?: string; text?: string }[] | null;
    };
    story?: {
      photo?: Photo;
      eyebrow?: string;
      title?: string;
      text?: string;
      linkLabel?: string;
    };
    world?: {
      title?: string;
      titleMuted?: string;
      cards?: {
        photo?: Photo;
        label?: string;
        labelMuted?: string;
        text?: string;
        url?: string;
        ariaLabel?: string;
      }[] | null;
    };
    seo?: {
      title?: string;
      description?: string;
      noindex?: boolean;
      image?: { asset?: { _id?: string; url?: string } | null } | null;
    };
  } | null;
  defaults?: { notify?: { homeNote?: string } } | null;
};

const TONE_BG: Record<string, string> = {
  black: '#000000',
  ink: '#0B0B0C',
  ink2: '#141418',
  bone: '#D9D3C8',
};

function toneBg(photo: Photo | undefined | null): string {
  const t = photo?.tone;
  return (t && TONE_BG[t]) || TONE_BG.bone!;
}

function localPhoto(src: string, alt: string, position?: string, tone?: string): Photo {
  return {
    alt,
    position: position ?? null,
    tone: (tone as Photo extends { tone?: infer T } ? T : never) ?? null,
    // Local fidelity stand-in when Sanity asset missing — Photo.astro needs asset.url-shaped data.
    image: {
      asset: { url: src, metadata: { dimensions: { width: 1200, height: 1500 } } },
    },
  };
}

/** Signal teaser label: design shows "Suede Cap", seed title is "Suede Cap · Sand". */
export function teaserLabel(title: string): string {
  const i = title.indexOf(' · ');
  return i === -1 ? title : title.slice(0, i);
}

function heroAria(title: string): string {
  return title.replace(/ · /g, ', ');
}

function cardAria(title: string, price: string, edition: ReturnType<typeof describeEdition>): string {
  const stock =
    edition.state === 'sold-out'
      ? 'sold out'
      : `${edition.left} of ${edition.size} left`;
  return `${title}, ${price}, ${stock}`;
}

function tagStyle(state: ReturnType<typeof describeEdition>['state']): string {
  if (state === 'sold-out') return 'position: absolute; left: 14px; top: 14px; background: #D9D3C8; color: #3E3B35';
  return 'position: absolute; left: 14px; top: 14px; background: #0B0B0C; color: #F5F2EC';
}

function piecePhoto(p: RawPiece | null | undefined, fallback: Photo): Photo {
  return p?.cardPhoto || p?.gallery0 || fallback;
}

function commerceMap(
  pieces: PieceCommerce[],
): Map<string, PieceCommerce> {
  return new Map(pieces.map((p) => [p.handle, p]));
}

function buildCards(
  rawPieces: RawPiece[],
  commerce: Map<string, PieceCommerce>,
  opensAt: string | undefined,
  now: number,
): HomePieceCard[] {
  return rawPieces
    .filter((p) => p.handle && p.title)
    .map((p) => {
      const handle = p.handle!;
      const title = p.title!;
      const c =
        commerce.get(handle) ||
        ({
          handle,
          published: true,
          price: null,
          editionSize: 5,
          variants: [],
        } satisfies PieceCommerce);
      const edition = describeEdition(c, opensAt, now);
      const price = c.price ? formatSitePrice(c.price.amount, c.price.currency) : '';
      const photo = piecePhoto(p, localPhoto(`/images/${handle}.jpg`, '', 'center', 'bone'));
      return {
        title,
        handle,
        href: `/pieces/${handle}`,
        photo,
        toneBg: toneBg(photo),
        objectPosition: photo?.position || 'center',
        filter: edition.state === 'sold-out' ? 'grayscale(1) contrast(0.9)' : 'none',
        tagStyle: tagStyle(edition.state),
        ariaLabel: cardAria(title, price, edition),
        edition,
        price,
      };
    });
}

/** Design-matching home when Sanity is offline. */
export const homeFallback: HomePageData = (() => {
  const now = Date.parse('2026-10-23T13:00:00Z');
  const opensAt = '2026-10-02T17:00:00Z';
  const signalOpens = '2026-12-04T18:00:00Z';
  const fixture = {
    'definition-tee-white': {
      handle: 'definition-tee-white',
      published: true,
      price: { amount: '85.00', currency: 'GBP' },
      editionSize: 5,
      variants: [
        { id: 'a', size: 'S', quantityAvailable: 0, availableForSale: false },
        { id: 'b', size: 'M', quantityAvailable: 1, availableForSale: true },
        { id: 'c', size: 'L', quantityAvailable: 2, availableForSale: true },
        { id: 'd', size: 'XL', quantityAvailable: 0, availableForSale: false },
      ],
    },
    'wordmark-tee-bone': {
      handle: 'wordmark-tee-bone',
      published: true,
      price: { amount: '75.00', currency: 'GBP' },
      editionSize: 5,
      variants: [
        { id: 'a', size: 'S', quantityAvailable: 0, availableForSale: false },
        { id: 'b', size: 'M', quantityAvailable: 0, availableForSale: false },
        { id: 'c', size: 'L', quantityAvailable: 1, availableForSale: true },
        { id: 'd', size: 'XL', quantityAvailable: 0, availableForSale: false },
      ],
    },
    'definition-tee-bone': {
      handle: 'definition-tee-bone',
      published: true,
      price: { amount: '85.00', currency: 'GBP' },
      editionSize: 5,
      variants: [
        { id: 'a', size: 'S', quantityAvailable: 0, availableForSale: false },
        { id: 'b', size: 'M', quantityAvailable: 0, availableForSale: false },
        { id: 'c', size: 'L', quantityAvailable: 0, availableForSale: false },
        { id: 'd', size: 'XL', quantityAvailable: 0, availableForSale: false },
      ],
    },
  } as const satisfies Record<string, PieceCommerce>;

  const raw: RawPiece[] = [
    {
      title: 'Definition Tee · White',
      handle: 'definition-tee-white',
      cardPhoto: localPhoto(
        '/images/definition-tee-white.jpg',
        'White NEVMA definition t-shirt on black',
        'center 42%',
        'black',
      ),
    },
    {
      title: 'Wordmark Tee · Bone',
      handle: 'wordmark-tee-bone',
      cardPhoto: localPhoto(
        '/images/wordmark-tee-bone.jpg',
        '',
        'center 55%',
        'bone',
      ),
    },
    {
      title: 'Definition Tee · Bone',
      handle: 'definition-tee-bone',
      cardPhoto: localPhoto(
        '/images/definition-tees-bone.jpg',
        '',
        'center 35%',
        'bone',
      ),
    },
  ];
  const map = commerceMap(Object.values(fixture));
  const cards = buildCards(raw, map, opensAt, now);
  const totals = dropTotals(
    cards.map((c) => ({ left: c.edition.left, editionSize: c.edition.size })),
  );
  const heroPiece = cards[0]!;
  return {
    dropOpensAt: opensAt,
    hero: {
      eyebrow: `STYLE 001 · Definition · Available now`,
      titleLines: ['The word,', 'worn.'],
      intro:
        'Three pieces, five of each, printed with the definition of the name. When an edition is gone, it is gone: nothing is restocked.',
      leftLabel: totals.label,
      left: totals.left,
      capacity: totals.capacity,
      statSuffix: 'numbered pieces left in this drop',
      primaryHref: '/drops/style-001',
      primaryLabel: ui.home.shopTheDrop,
      secondaryHref: '/story',
      secondaryLabel: ui.home.theStory,
      piece: {
        title: heroPiece.title,
        handle: heroPiece.handle,
        href: heroPiece.href,
        ariaLabel: heroAria(heroPiece.title),
        photo: heroPiece.photo,
        objectPosition: heroPiece.objectPosition,
        edition: heroPiece.edition,
      },
    },
    pieces: {
      eyebrow: `STYLE 001 · Definition · ${formatReleasedShort(opensAt)}`,
      title: 'The pieces',
      linkLabel: ui.home.aboutThisDrop,
      linkHref: '/drops/style-001',
      cards,
    },
    signal: {
      code: 'STYLE 002',
      name: 'Signal',
      slug: 'style-002',
      opensAt: signalOpens,
      opensAtMs: Date.parse(signalOpens),
      summary:
        'An overshirt, a suede cap and a silk square, five of each. Revealed on Friday 4 December at 18:00 GMT. People on the list hear first.',
      homeNote: 'One email when the drop opens. No newsletter unless you ask for it.',
      backgroundSrc: '/images/ribbon-cut.webp',
      dropId: 'drop.style-002',
      teasers: [
        {
          label: 'Signal Overshirt',
          index: '01',
          photo: { placeholder: 'overshirt', tone: 'ink', image: null },
          editionSize: 5,
        },
        {
          label: 'Suede Cap',
          index: '02',
          photo: { placeholder: 'cap', tone: 'ink', image: null },
          editionSize: 5,
        },
        {
          label: 'Silk Square 70',
          index: '03',
          photo: { placeholder: 'silk square', tone: 'ink', image: null },
          editionSize: 5,
        },
      ],
    },
    rules: {
      title: 'Five.',
      titleMuted: 'Then never again.',
      items: [
        {
          mark: '05',
          title: 'Made in five',
          text: 'Each colourway exists five times, across all sizes. The counter on every piece is live.',
        },
        {
          mark: 'N°',
          title: 'Numbered by hand',
          text: 'Your piece is numbered when it is packed, and the number is written into your order.',
        },
        {
          mark: '00',
          title: 'Never restocked',
          text: 'No second runs, no new colours of an old piece. A sold-out edition stays sold out.',
        },
        {
          mark: '∞',
          title: 'Kept in the archive',
          text: 'Every piece stays on the site after it sells out, with its drop, story and edition.',
        },
      ],
    },
    story: {
      eyebrow: 'The story',
      title: 'Not merchandise. Limited objects of identity.',
      text: 'NEVMA Style is the third pillar of NEVMA, next to the label and Moments. It makes few things, slowly, in deliberate numbers, so that wearing one means something.',
      linkLabel: ui.home.readTheStory,
      photo: localPhoto(
        '/images/carved-wall.jpg',
        'The NEVMA name carved into a stone wall',
      ),
    },
    world: {
      title: 'The world of',
      titleMuted: 'NEVMA',
      cards: [
        {
          label: 'NEVMA',
          labelMuted: 'The Label',
          text: 'Original music every month across Pop, House, Techno and Chill & Instrumental.',
          url: 'https://example.com/[nevma-music]',
          ariaLabel: 'NEVMA Music, opens the music site',
          photo: localPhoto('/images/crowd.jpg', ''),
        },
        {
          label: 'NEVMA',
          labelMuted: 'Moments',
          text: 'More than events. Some pieces are released only at a Moment, then online.',
          url: 'https://example.com/[nevma-moments]',
          ariaLabel: 'NEVMA Moments, opens the music site',
          photo: localPhoto('/images/stage.jpg', ''),
        },
      ],
    },
    seo: { title: 'NEVMA Style — Home' },
  };
})();

function mapHome(raw: RawHome, commerce: Map<string, PieceCommerce>, now: number): HomePageData {
  const page = raw.page;
  if (!page?.hero?.drop?.pieces?.length) return homeFallback;

  const drop = page.hero.drop;
  const opensAt = drop.opensAt;
  const cards = buildCards(drop.pieces || [], commerce, opensAt, now);
  if (!cards.length) return homeFallback;

  const totals = dropTotals(
    cards.map((c) => ({ left: c.edition.left, editionSize: c.edition.size })),
  );
  const anyLeft = totals.left > 0;
  const status = anyLeft ? 'Available now' : ui.stock.soldOut;
  const heroHandle = page.hero.piece?.handle || cards[0]!.handle;
  const heroCard = cards.find((c) => c.handle === heroHandle) || cards[0]!;
  const heroPhoto = page.hero.photo || heroCard.photo;

  const next = page.next?.drop;
  const nextOpen = next?.opensAt ? Date.parse(next.opensAt) : NaN;
  const signal =
    next?.code && next.name && next.opensAt && !Number.isNaN(nextOpen) && nextOpen > now
      ? {
          code: next.code,
          name: next.name,
          slug: next.slug || 'style-002',
          opensAt: next.opensAt,
          opensAtMs: nextOpen,
          summary: next.summary || '',
          homeNote:
            raw.defaults?.notify?.homeNote ||
            'One email when the drop opens. No newsletter unless you ask for it.',
          backgroundSrc:
            page.next?.background?.image?.asset?.url || '/images/ribbon-cut.webp',
          dropId: next._id || `drop.${next.slug || 'style-002'}`,
          teasers: (next.pieces || []).slice(0, 3).map((p, i) => ({
            label: teaserLabel(p.title || ''),
            index: String(i + 1).padStart(2, '0'),
            photo: page.next?.teasers?.[i] || {
              placeholder: ['overshirt', 'cap', 'silk square'][i] || 'piece',
              tone: 'ink' as const,
              image: null,
            },
            editionSize: editionSizeOf(commerce.get(p.handle || '') || { editionSize: 5 }),
          })),
        }
      : null;

  return {
    dropOpensAt: opensAt || homeFallback.dropOpensAt,
    hero: {
      eyebrow: `${drop.code} · ${drop.name} · ${status}`,
      titleLines: page.hero.titleLines?.length
        ? page.hero.titleLines
        : homeFallback.hero.titleLines,
      intro: page.hero.intro || homeFallback.hero.intro,
      leftLabel: totals.label,
      left: totals.left,
      capacity: totals.capacity,
      statSuffix: page.hero.statSuffix || homeFallback.hero.statSuffix,
      primaryHref: `/drops/${drop.slug || 'style-001'}`,
      primaryLabel: page.hero.primaryLabel || ui.home.shopTheDrop,
      secondaryHref: '/story',
      secondaryLabel: page.hero.secondaryLabel || ui.home.theStory,
      piece: {
        title: heroCard.title,
        handle: heroCard.handle,
        href: heroCard.href,
        ariaLabel: heroAria(heroCard.title),
        photo: heroPhoto,
        objectPosition: heroPhoto?.position || heroCard.objectPosition,
        edition: heroCard.edition,
      },
    },
    pieces: {
      eyebrow: `${drop.code} · ${drop.name} · ${formatReleasedShort(opensAt!)}`,
      title: page.pieces?.title || 'The pieces',
      linkLabel: page.pieces?.linkLabel || ui.home.aboutThisDrop,
      linkHref: `/drops/${drop.slug || 'style-001'}`,
      cards,
    },
    signal,
    rules: {
      title: page.rules?.title || homeFallback.rules.title,
      titleMuted: page.rules?.titleMuted || homeFallback.rules.titleMuted,
      items:
        page.rules?.items?.map((it) => ({
          mark: it.mark || '',
          title: it.title || '',
          text: it.text || '',
        })) || homeFallback.rules.items,
    },
    story: {
      eyebrow: page.story?.eyebrow || homeFallback.story.eyebrow,
      title: page.story?.title || homeFallback.story.title,
      text: page.story?.text || homeFallback.story.text,
      linkLabel: page.story?.linkLabel || ui.home.readTheStory,
      photo: page.story?.photo || homeFallback.story.photo,
    },
    world: {
      title: page.world?.title || homeFallback.world.title,
      titleMuted: page.world?.titleMuted || homeFallback.world.titleMuted,
      cards:
        page.world?.cards?.map((c, i) => ({
          label: c.label || 'NEVMA',
          labelMuted: c.labelMuted || '',
          text: c.text || '',
          url: c.url || '#',
          ariaLabel: c.ariaLabel || '',
          photo: c.photo || homeFallback.world.cards[i]?.photo || localPhoto('/images/crowd.jpg', ''),
        })) || homeFallback.world.cards,
    },
    seo: {
      title: page.seo?.title || homeFallback.seo.title,
      description: page.seo?.description,
      noindex: page.seo?.noindex,
      image: page.seo?.image,
    },
  };
}

export async function loadHome(cookieHeader: string | null): Promise<HomePageData> {
  const now = nowMs();
  const provider = createCommerceProvider({
    fixtureFlags: fixtureFlagsFromCookie(cookieHeader),
  });

  if (!sanityConfigured()) {
    // Still attach live fixture commerce onto the fallback structure.
    const handles = homeFallback.pieces.cards.map((c) => c.handle);
    const pieces = await provider.getPieces(handles);
    return mapHome(
      {
        page: {
          hero: {
            titleLines: homeFallback.hero.titleLines,
            intro: homeFallback.hero.intro,
            statSuffix: homeFallback.hero.statSuffix,
            primaryLabel: homeFallback.hero.primaryLabel,
            secondaryLabel: homeFallback.hero.secondaryLabel,
            drop: {
              code: 'STYLE 001',
              name: 'Definition',
              slug: 'style-001',
              opensAt: '2026-10-02T17:00:00Z',
              pieces: homeFallback.pieces.cards.map((c) => ({
                title: c.title,
                handle: c.handle,
                cardPhoto: c.photo,
              })),
            },
            piece: {
              title: homeFallback.hero.piece.title,
              handle: homeFallback.hero.piece.href.replace('/pieces/', ''),
              cardPhoto: homeFallback.hero.piece.photo,
            },
          },
          pieces: {
            title: homeFallback.pieces.title,
            linkLabel: homeFallback.pieces.linkLabel,
          },
          next: homeFallback.signal
            ? {
                drop: {
                  _id: homeFallback.signal.dropId,
                  code: homeFallback.signal.code,
                  name: homeFallback.signal.name,
                  slug: homeFallback.signal.slug,
                  opensAt: homeFallback.signal.opensAt,
                  summary: homeFallback.signal.summary,
                  pieces: homeFallback.signal.teasers.map((t) => ({
                    title: t.label === 'Suede Cap' ? 'Suede Cap · Sand' : t.label,
                    handle: t.label.toLowerCase().replace(/\s+/g, '-'),
                  })),
                },
                teasers: homeFallback.signal.teasers.map((t) => t.photo),
              }
            : undefined,
          rules: homeFallback.rules,
          story: homeFallback.story,
          world: homeFallback.world,
          seo: homeFallback.seo,
        },
        defaults: { notify: { homeNote: homeFallback.signal?.homeNote } },
      },
      commerceMap(pieces),
      now,
    );
  }

  try {
    const raw = await sanityFetch<RawHome>(homeQuery);
    const handles = [
      ...(raw.page?.hero?.drop?.pieces || []).map((p) => p.handle).filter(Boolean),
      ...(raw.page?.next?.drop?.pieces || []).map((p) => p.handle).filter(Boolean),
    ] as string[];
    const pieces = await provider.getPieces([...new Set(handles)]);
    return mapHome(raw, commerceMap(pieces), now);
  } catch {
    return homeFallback;
  }
}

/** Recompute one piece's edition from the provider (server islands). */
export async function loadPieceEdition(
  handle: string,
  opensAt: string | null | undefined,
  cookieHeader: string | null,
) {
  const provider = createCommerceProvider({
    fixtureFlags: fixtureFlagsFromCookie(cookieHeader),
  });
  const piece = await provider.getPiece(handle);
  if (!piece) {
    return describeEdition(
      { handle, published: true, price: null, editionSize: 5, variants: [] },
      opensAt,
      nowMs(),
    );
  }
  return describeEdition(piece, opensAt, nowMs());
}

export async function loadDropLeft(
  handles: string[],
  cookieHeader: string | null,
): Promise<{ label: string; left: number; capacity: number }> {
  const provider = createCommerceProvider({
    fixtureFlags: fixtureFlagsFromCookie(cookieHeader),
  });
  const pieces = await provider.getPieces(handles);
  const rows = pieces.map((p) => ({
    left: leftCount(p.variants),
    editionSize: editionSizeOf(p),
  }));
  // Preserve order/capacity for handles missing from commerce.
  for (const h of handles) {
    if (!pieces.some((p) => p.handle === h)) rows.push({ left: 0, editionSize: 5 });
  }
  return dropTotals(rows);
}
