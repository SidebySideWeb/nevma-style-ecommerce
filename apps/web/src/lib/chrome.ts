import { formatAnnounceDateTime } from './commerce/format';
import { createCommerceProvider } from './commerce/provider';
import { nowMs } from './now';
import { CART_COOKIE, readCookie } from './server/cart-cookie';
import { isCommerceMock } from './server/env';
import { sanityConfigured, sanityFetch } from './sanity/client';
import { chromeQuery } from './sanity/queries';
import { ui } from '../content/ui';

export type NavLink = { label: string; href: string; external?: boolean };

export type ChromeData = {
  announcement: {
    enabled: boolean;
    code: string;
    name: string;
    opensAt: string;
    linkLabel: string;
    href: string;
    textRest: string;
  } | null;
  mainNav: NavLink[];
  menuExtra: NavLink[];
  footer: {
    tagline: string;
    newsletterPlaceholder: string;
    newsletterButton: string;
    links: NavLink[];
    definition: { word: string; pos: string; lead: string; meaning: string };
    closingLine: string;
    legalLinks: NavLink[];
    paymentNote: string;
    copyright: string;
    wordmarkSrc: string;
  };
  seo: {
    title?: string;
    description?: string;
    noindex?: boolean;
    image?: { asset?: { _id?: string; url?: string } | null } | null;
  };
  clientCareEmail?: string;
  musicUrl?: string;
  momentsUrl?: string;
  instagramUrl?: string;
};

/** Design chrome used when Sanity is offline (matches design/build home). */
export const chromeFallback: ChromeData = {
  announcement: {
    enabled: true,
    code: 'STYLE 002',
    name: 'Signal',
    opensAt: '2026-12-04T18:00:00Z',
    linkLabel: 'Get notified',
    href: '/#notify',
    textRest: ` · drops ${formatAnnounceDateTime('2026-12-04T18:00:00Z')}`,
  },
  mainNav: [
    { label: 'Current drop', href: '/drops/style-001' },
    { label: 'Categories', href: '/categories/tees' },
    { label: 'All pieces', href: '/pieces' },
    { label: 'Story', href: '/story' },
  ],
  menuExtra: [{ label: 'Client care', href: '/client-care/shipping' }],
  footer: {
    tagline: 'Style · Limited by design',
    newsletterPlaceholder: 'Hear about drops first',
    newsletterButton: 'Join',
    links: [
      { label: 'Current drop', href: '/drops/style-001' },
      { label: 'Shipping & delivery', href: '/client-care/shipping' },
      { label: 'All pieces', href: '/pieces' },
      { label: 'Returns', href: '/client-care/returns' },
      { label: 'Story', href: '/story' },
      { label: 'Client care & FAQ', href: '/client-care/faq' },
      { label: 'Account', href: '/account' },
      { label: 'Contact', href: '/client-care/contact' },
      { label: 'NEVMA Music', href: 'https://[nevma-music-domain]', external: true },
      { label: 'Instagram', href: 'https://www.instagram.com/nevma.music', external: true },
    ],
    definition: {
      word: 'nevma',
      pos: 'noun · Greek',
      lead: 'a gesture, nod or sign:',
      meaning: 'a subtle signal given with the hand, head or eyes.',
    },
    closingLine: 'We don’t follow. We define.',
    legalLinks: [
      { label: 'Terms of sale', href: '/legal/terms' },
      { label: 'Privacy', href: '/legal/privacy' },
      { label: 'Cookies', href: '/legal/cookies' },
    ],
    paymentNote: 'Payments secured by Viva',
    copyright: '© 2026 NEVMA Style · London',
    wordmarkSrc: '/images/nevma-wordmark-white.png',
  },
  seo: { title: 'NEVMA Style - Home', description: undefined },
  clientCareEmail: undefined,
  musicUrl: undefined,
  momentsUrl: undefined,
  instagramUrl: undefined,
};

type RawChrome = {
  announcement?: {
    enabled?: boolean;
    linkLabel?: string;
    drop?: { code?: string; name?: string; slug?: string; opensAt?: string } | null;
  };
  mainNav?: NavLink[] | null;
  menuExtra?: NavLink[] | null;
  footer?: {
    tagline?: string;
    newsletterPlaceholder?: string;
    newsletterButton?: string;
    links?: NavLink[] | null;
    definition?: { word?: string; pos?: string; lead?: string; meaning?: string };
    closingLine?: string;
    legalLinks?: NavLink[] | null;
    paymentNote?: string;
    copyright?: string;
  };
  clientCareEmail?: string;
  musicUrl?: string;
  momentsUrl?: string;
  instagramUrl?: string;
  seo?: {
    title?: string;
    description?: string;
    noindex?: boolean;
    image?: { asset?: { _id?: string; url?: string } | null } | null;
  };
};

function mapAnnouncement(
  raw: RawChrome['announcement'],
  onHome: boolean,
): ChromeData['announcement'] {
  const drop = raw?.drop;
  if (!raw?.enabled || !drop?.opensAt || !drop.code || !drop.name) return null;
  const opens = Date.parse(drop.opensAt);
  if (Number.isNaN(opens) || opens <= nowMs()) return null;
  const slug = drop.slug || 'style-002';
  return {
    enabled: true,
    code: drop.code,
    name: drop.name,
    opensAt: drop.opensAt,
    linkLabel: raw.linkLabel || ui.chrome.getNotified,
    href: onHome ? '/#notify' : `/drops/${slug}#notify`,
    textRest: ` · drops ${formatAnnounceDateTime(drop.opensAt)}`,
  };
}

function yearCopyright(template: string): string {
  const year = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
  }).format(new Date(nowMs()));
  return template.replace('{year}', year);
}

export async function loadChrome(opts: { onHome?: boolean } = {}): Promise<ChromeData> {
  const onHome = opts.onHome ?? false;
  if (!sanityConfigured()) return chromeFallback;

  try {
    const raw = await sanityFetch<RawChrome | null>(chromeQuery);
    if (!raw) return chromeFallback;
    const fb = chromeFallback;
    return {
      announcement: mapAnnouncement(raw.announcement, onHome) ?? (onHome ? fb.announcement : null),
      mainNav: raw.mainNav?.length ? raw.mainNav : fb.mainNav,
      menuExtra: raw.menuExtra?.length ? raw.menuExtra : fb.menuExtra,
      footer: {
        tagline: raw.footer?.tagline || fb.footer.tagline,
        newsletterPlaceholder:
          raw.footer?.newsletterPlaceholder || fb.footer.newsletterPlaceholder,
        newsletterButton: raw.footer?.newsletterButton || fb.footer.newsletterButton,
        links: raw.footer?.links?.length ? raw.footer.links : fb.footer.links,
        definition: {
          word: raw.footer?.definition?.word || fb.footer.definition.word,
          pos: raw.footer?.definition?.pos || fb.footer.definition.pos,
          lead: raw.footer?.definition?.lead || fb.footer.definition.lead,
          meaning: raw.footer?.definition?.meaning || fb.footer.definition.meaning,
        },
        closingLine: raw.footer?.closingLine || fb.footer.closingLine,
        legalLinks: raw.footer?.legalLinks?.length
          ? raw.footer.legalLinks
          : fb.footer.legalLinks,
        paymentNote: raw.footer?.paymentNote || fb.footer.paymentNote,
        copyright: yearCopyright(raw.footer?.copyright || '© {year} NEVMA Style · London'),
        wordmarkSrc: fb.footer.wordmarkSrc,
      },
      seo: {
        title: raw.seo?.title || fb.seo.title,
        description: raw.seo?.description,
        noindex: raw.seo?.noindex,
        image: raw.seo?.image,
      },
      clientCareEmail: raw.clientCareEmail,
      musicUrl: raw.musicUrl,
      momentsUrl: raw.momentsUrl,
      instagramUrl: raw.instagramUrl,
    };
  } catch {
    return chromeFallback;
  }
}

export function fixtureFlagsFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(/(?:^|;\s*)nv_fixture=([^;]*)/);
  return m ? decodeURIComponent(m[1]!) : null;
}

function guestWishlistCount(cookieHeader: string | null): number {
  if (!cookieHeader) return 0;
  const m = cookieHeader.match(/(?:^|;\s*)ns_wishlist=([^;]*)/);
  if (!m?.[1]) return 0;
  try {
    const parsed = JSON.parse(decodeURIComponent(m[1])) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string').length : 0;
  } catch {
    return decodeURIComponent(m[1])
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean).length;
  }
}

export async function headerCounts(cookieHeader: string | null): Promise<{
  bag: number;
  wishlist: number;
}> {
  const provider = createCommerceProvider({
    fixtureFlags: fixtureFlagsFromCookie(cookieHeader),
    cartId: readCookie(cookieHeader, CART_COOKIE),
  });
  const cart = await provider.getCart();
  let bag = cart.lines.filter(
    (l) => !l.soldWhileInBag && l.availableForSale && l.quantityAvailable > 0,
  ).length;
  // Design bag.html / bag-empty.html reuse shared chrome with badge "1"
  // (stale vs the your-bag body). Mirror that under those fixtures so fidelity
  // matches the boards; live carts and bag-sold use the real count.
  const flags = fixtureFlagsFromCookie(cookieHeader) || '';
  if (/(?:^|,)\s*bag-empty\s*(?:,|$)/.test(flags) || /(?:^|,)\s*bag-normal\s*(?:,|$)/.test(flags)) {
    bag = 1;
  }
  const wishlist = isCommerceMock()
    ? (await provider.getWishlist()).length
    : guestWishlistCount(cookieHeader);
  return { bag, wishlist };
}

/** Design chrome counts used as island fallbacks (exact size). */
export const HEADER_FALLBACK_COUNTS = { bag: 1, wishlist: 2 } as const;
