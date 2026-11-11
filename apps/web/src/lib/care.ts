import { sanityConfigured, sanityFetch } from './sanity/client';
import { careQuery } from './sanity/queries';
import { proseToHtml } from './sanity/prose';
import type { Prose } from './sanity/types';
import { ui } from '../content/ui';

export type CareKind = 'prose' | 'faq' | 'contact';

export type CareNavItem = {
  label: string;
  href: string;
  current: boolean;
  group: 'care' | 'legal';
};

export type CareFaqItem = { q: string; a: string };

export type CarePageData = {
  kind: CareKind;
  eyebrow: string;
  title: string;
  docTitle: string;
  meta: string;
  nav: CareNavItem[];
  bodyHtml: string;
  faq: CareFaqItem[];
  contact: {
    intro: string;
    topics: string[];
    selectedTopic: string;
    privacyNote: string;
    sentMessage: string;
    sent: boolean;
    studioLine: string;
    nameDefault?: string;
    emailDefault?: string;
    orderDefault?: string;
    messageDefault?: string;
    reference?: string;
  } | null;
  seo: { title?: string; description?: string; noindex?: boolean };
};

const CARE_ROUTES: { slug: string; label: string; href: string; kind: CareKind }[] = [
  { slug: 'shipping', label: ui.care.shipping, href: '/client-care/shipping', kind: 'prose' },
  { slug: 'returns', label: ui.care.returns, href: '/client-care/returns', kind: 'prose' },
  { slug: 'faq', label: ui.care.questions, href: '/client-care/faq', kind: 'faq' },
  { slug: 'contact', label: ui.care.contact, href: '/client-care/contact', kind: 'contact' },
];

const LEGAL_ROUTES: { slug: string; label: string; href: string }[] = [
  { slug: 'terms', label: ui.care.terms, href: '/legal/terms' },
  { slug: 'privacy', label: ui.care.privacy, href: '/legal/privacy' },
  { slug: 'cookies', label: ui.care.cookies, href: '/legal/cookies' },
];

export function parseCareSlug(
  section: 'care' | 'legal',
  slug: string,
): { slug: string; kind: CareKind; href: string } | null {
  if (section === 'care') {
    const row = CARE_ROUTES.find((r) => r.slug === slug);
    return row ? { slug: row.slug, kind: row.kind, href: row.href } : null;
  }
  const row = LEGAL_ROUTES.find((r) => r.slug === slug);
  return row ? { slug: row.slug, kind: 'prose', href: row.href } : null;
}

type RawCare = {
  care?: {
    eyebrow?: string;
    title?: string;
    faqTitle?: string;
    faqMeta?: string;
    faq?: { q?: string; a?: string }[];
    contact?: {
      title?: string;
      meta?: string;
      intro?: string;
      topics?: string[];
      privacyNote?: string;
      sentMessage?: string;
    };
    seo?: { title?: string; description?: string };
  } | null;
  page?: {
    title?: string;
    meta?: string;
    body?: Prose;
    seo?: { title?: string; description?: string };
  } | null;
};

export async function loadCare(opts: {
  section: 'care' | 'legal';
  slug: string;
  sent?: boolean;
  topic?: string | null;
  reference?: string | null;
}): Promise<CarePageData | null> {
  const parsed = parseCareSlug(opts.section, opts.slug);
  if (!parsed) return null;
  if (!sanityConfigured()) return null;

  let raw: RawCare;
  try {
    raw = await sanityFetch<RawCare>(careQuery, { slug: opts.slug });
  } catch {
    return null;
  }

  const care = raw.care;
  const page = raw.page;

  const nav: CareNavItem[] = [
    ...CARE_ROUTES.map((r) => ({
      label: r.label,
      href: r.href,
      current: opts.section === 'care' && r.slug === opts.slug,
      group: 'care' as const,
    })),
    ...LEGAL_ROUTES.map((r) => ({
      label: r.label,
      href: r.href,
      current: opts.section === 'legal' && r.slug === opts.slug,
      group: 'legal' as const,
    })),
  ];

  let studioLine =
    '[NEVMA Style studio address, London] · collections by appointment only';
  try {
    const settings = await sanityFetch<{ studioLine?: string } | null>(
      `*[_id == "siteSettings"][0]{studioLine}`,
    );
    if (settings?.studioLine) studioLine = settings.studioLine;
  } catch {
    /* keep fallback */
  }

  const topics =
    care?.contact?.topics?.filter(Boolean) ||
    ['Order', 'Return', 'A piece', 'Press', 'Other'];
  const topicParam = (opts.topic || '').trim();
  const selectedTopic =
    topics.find((t) => t.toLowerCase() === topicParam.toLowerCase()) ||
    topics.find((t) => topicParam && t.toLowerCase().includes(topicParam.toLowerCase())) ||
    topics[0] ||
    'Order';

  if (parsed.kind === 'faq') {
    return {
      kind: 'faq',
      eyebrow: care?.eyebrow || ui.care.clientCare,
      title: care?.title || 'How can we help?',
      docTitle: care?.faqTitle || ui.care.questions,
      meta: care?.faqMeta || 'The ones we hear most',
      nav,
      bodyHtml: '',
      faq: (care?.faq || [])
        .filter((f) => f.q && f.a)
        .map((f) => ({ q: f.q!, a: f.a! })),
      contact: null,
      seo: care?.seo || {},
    };
  }

  if (parsed.kind === 'contact') {
    return {
      kind: 'contact',
      eyebrow: care?.eyebrow || ui.care.clientCare,
      title: care?.title || 'How can we help?',
      docTitle: care?.contact?.title || ui.care.contact,
      meta: care?.contact?.meta || 'Client care · London',
      nav,
      bodyHtml: '',
      faq: [],
      contact: {
        intro:
          care?.contact?.intro ||
          'We reply within one working day, Monday to Friday, London time. Email [style@nevma…] or use the form.',
        topics,
        selectedTopic,
        privacyNote:
          care?.contact?.privacyNote ||
          'Protected by Cloudflare Turnstile. We use your details only to reply.',
        sentMessage:
          care?.contact?.sentMessage ||
          'Thank you. Your message reached client care; we’ll reply by tomorrow evening.',
        sent: Boolean(opts.sent),
        studioLine,
        reference: opts.reference || undefined,
      },
      seo: care?.seo || {},
    };
  }

  if (!page?.title) return null;

  return {
    kind: 'prose',
    eyebrow: care?.eyebrow || ui.care.clientCare,
    title: care?.title || 'How can we help?',
    docTitle: page.title,
    meta: page.meta || '',
    nav,
    bodyHtml: proseToHtml(page.body || []),
    faq: [],
    contact: null,
    seo: page.seo || care?.seo || {},
  };
}
