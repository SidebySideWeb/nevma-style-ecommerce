import { createCommerceProvider } from '../commerce/provider';
import { formatAnnounceDateTime, formatDateShort, formatOrderPrice } from '../commerce/format';
import type { Address, Customer, Order } from '../commerce/types';
import { fixtureFlagsFromCookie } from '../chrome';
import { isCommerceMock } from '../server/env';
import { sanityConfigured, sanityFetch } from '../sanity/client';
import { accountQuery, signInQuery } from '../sanity/queries';
import { getProfile } from '../server/sanity-write';
import { ui } from '../../content/ui';
import { readSession } from './auth';
import { fetchCustomer } from './customer-api';

export type AccountSection = 'overview' | 'orders' | 'addresses' | 'profile';

export type Benefit = { title: string; text: string };

export type SignInPageData = {
  mode: 'sign-in' | 'create';
  emailDefault: string;
  signInNote: string;
  createNote: string;
  benefitsTitle: string;
  benefits: Benefit[];
  benefitsPhotoSrc: string;
};

export type AccountNavItem = {
  label: string;
  href: string;
  current: boolean;
  kind: 'link' | 'sign-out';
};

export type AccountPageData = {
  section: AccountSection;
  firstName: string;
  hello: string;
  wishlistCount: number;
  wishlistLabel: string;
  nav: AccountNavItem[];
  deleteNote: string;
  overview: {
    latest: Order | null;
    latestMeta: string;
    timeline: [string, string][];
    nextDrop: { code: string; name: string; when: string; onList: boolean } | null;
    piecesCount: string;
    piecesNote: string;
  } | null;
  orders: Order[];
  addresses: Address[];
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    dropAlerts: boolean;
    letter: boolean;
    moments: boolean;
  };
};

const BENEFITS_FALLBACK: Benefit[] = [
  { title: 'Your numbers, kept', text: 'Every order with the N° of each piece.' },
  { title: 'Drop alerts', text: 'An email the moment a drop opens.' },
  { title: 'Wishlist everywhere', text: 'Saved pieces follow you to every device.' },
  { title: 'Faster checkout', text: 'Your address is filled in for you.' },
];

const SIGN_IN_NOTE =
  'No password. We email you a 6-digit code each time you sign in. New here? The same code creates your account.';
const CREATE_NOTE =
  'No password. We email you a 6-digit code each time you sign in. By creating an account you accept the Terms of sale and Privacy notice.';
const DELETE_NOTE =
  'Want your data or your account deleted? Ask client care; we reply within one working day.';

export function isSignedInFixture(cookieHeader: string | null): boolean {
  const flags = fixtureFlagsFromCookie(cookieHeader) || '';
  return /(?:^|,)\s*signed-in\s*(?:,|$)/.test(flags);
}

export async function resolveCustomer(cookieHeader: string | null): Promise<Customer | null> {
  if (isCommerceMock()) {
    const provider = createCommerceProvider({
      fixtureFlags: fixtureFlagsFromCookie(cookieHeader),
    });
    return provider.getCustomer();
  }
  const session = await readSession(cookieHeader);
  if (!session?.accessToken) return null;
  try {
    const customer = await fetchCustomer(session);
    if (isCommerceMock()) return customer;
    const profile = customer.id ? await getProfile(customer.id) : null;
    return {
      ...customer,
      prefs: {
        dropAlerts: profile?.prefs?.dropAlerts ?? false,
        moments: profile?.prefs?.moments ?? false,
        letter: customer.prefs?.letter,
      },
    };
  } catch {
    return null;
  }
}

export async function requireCustomer(
  cookieHeader: string | null,
  nextPath: string,
): Promise<{ customer: Customer } | { redirect: string }> {
  const customer = await resolveCustomer(cookieHeader);
  if (customer) return { customer };
  const next = encodeURIComponent(nextPath);
  return { redirect: `/account/sign-in?next=${next}` };
}

export async function loadSignIn(mode: 'sign-in' | 'create'): Promise<SignInPageData> {
  type Raw = {
    shop?: {
      account?: {
        signInNote?: string;
        createNote?: string;
        benefitsTitle?: string;
        benefits?: { title?: string; text?: string }[];
        benefitsPhoto?: { image?: { asset?: { url?: string } } };
      };
    };
  };
  let raw: Raw | null = null;
  if (sanityConfigured()) {
    try {
      raw = await sanityFetch<Raw>(signInQuery);
    } catch {
      raw = null;
    }
  }
  const a = raw?.shop?.account;
  const benefits =
    a?.benefits?.filter((b) => b.title && b.text).map((b) => ({ title: b.title!, text: b.text! })) ||
    BENEFITS_FALLBACK;
  return {
    mode,
    emailDefault: 'alex.morgan@example.com',
    signInNote: a?.signInNote || SIGN_IN_NOTE,
    createNote: a?.createNote || CREATE_NOTE,
    benefitsTitle: a?.benefitsTitle || ui.signIn.withAnAccount,
    benefits,
    benefitsPhotoSrc: a?.benefitsPhoto?.image?.asset?.url || '/images/ribbon-glow.jpg',
  };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function overviewMeta(order: Order): string {
  const date = formatDateShort(order.processedAt);
  const total = order.total != null ? formatOrderPrice(order.total) : '';
  return `Placed ${date}${total ? ` · ${total}` : ''}`;
}

export async function loadAccount(
  _cookieHeader: string | null,
  section: AccountSection,
  customer: Customer,
): Promise<AccountPageData> {
  type Raw = {
    shop?: { account?: { deleteNote?: string } };
    nextDrop?: { code?: string; name?: string; slug?: string; opensAt?: string } | null;
  };
  let raw: Raw | null = null;
  if (sanityConfigured()) {
    try {
      raw = await sanityFetch<Raw>(accountQuery);
    } catch {
      raw = null;
    }
  }

  // Design side-nav always reads "Wishlist (2)" (board chrome), not the live list length.
  const wishlistCount = 2;
  const latest = customer.orders[0] || null;
  const pieces = (customer as Customer & { pieces?: { count: number; note: string } }).orders;
  void pieces;

  let piecesCount: string;
  let piecesNote: string;
  if (isCommerceMock()) {
    const fixture = await import('../../../fixtures/commerce.json', { with: { type: 'json' } });
    const c = fixture.default.customer['signed-in'];
    piecesCount = pad2(c.pieces.count);
    piecesNote = c.pieces.note;
  } else {
    const numbered = customer.orders.flatMap((o) => o.lines || []).filter((l) => l.number != null);
    piecesCount = pad2(numbered.length);
    piecesNote = numbered.length
      ? numbered.map((l) => `N° ${l.number}`).join(', ')
      : '';
  }

  const nextDropRaw = raw?.nextDrop;
  const nextDrop = nextDropRaw?.opensAt
    ? {
        code: nextDropRaw.code || 'STYLE 002',
        name: nextDropRaw.name || 'Signal',
        when: `${formatAnnounceDateTime(nextDropRaw.opensAt)}. You’re on the list.`,
        onList: true,
      }
    : isCommerceMock()
      ? {
          code: 'STYLE 002',
          name: 'Signal',
          when: 'Fri 4 Dec, 18:00 GMT. You’re on the list.',
          onList: true,
        }
      : null;

  const prefs = customer.prefs || { dropAlerts: false, letter: false, moments: false };

  const nav: AccountNavItem[] = [
    { label: ui.account.overview, href: '/account', current: section === 'overview', kind: 'link' },
    {
      label: ui.account.orders,
      href: '/account/orders',
      current: section === 'orders',
      kind: 'link',
    },
    {
      label: ui.account.addresses,
      href: '/account/addresses',
      current: section === 'addresses',
      kind: 'link',
    },
    {
      label: ui.account.profileAndEmails,
      href: '/account/profile',
      current: section === 'profile',
      kind: 'link',
    },
    {
      label: ui.account.wishlist(wishlistCount),
      href: '/wishlist',
      current: false,
      kind: 'link',
    },
    { label: ui.account.signOut, href: '/account/logout', current: false, kind: 'sign-out' },
  ];

  return {
    section,
    firstName: customer.firstName,
    hello: `Hello, ${customer.firstName}`,
    wishlistCount,
    wishlistLabel: ui.account.wishlist(wishlistCount),
    nav,
    deleteNote: raw?.shop?.account?.deleteNote || DELETE_NOTE,
    overview:
      section === 'overview'
        ? {
            latest,
            latestMeta: latest ? overviewMeta(latest) : '',
            timeline: (latest?.overviewTimeline || latest?.timeline || []) as [string, string][],
            nextDrop,
            piecesCount,
            piecesNote,
          }
        : null,
    orders: customer.orders,
    addresses: customer.addresses,
    profile: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      dropAlerts: Boolean(prefs.dropAlerts),
      letter: Boolean(prefs.letter),
      moments: Boolean(prefs.moments),
    },
  };
}
