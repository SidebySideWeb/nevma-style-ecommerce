import { formatDayMonth } from './commerce/format';
import { nowMs } from './now';
import { sanityConfigured, sanityFetch } from './sanity/client';
import { storyQuery } from './sanity/queries';
import { lineTextToHtml } from './sanity/prose';
import type { Photo, Prose } from './sanity/types';
import { hasPhotoImage, TONE_BG, resolvePhoto, slots } from './sanity/image';

export type StoryChapter = {
  eyebrow: string;
  title: string;
  html: string;
  photo: Photo | null;
  flip: boolean;
  toneBg: string;
  imgSrc: string | null;
  imgAlt: string;
};

export type StoryStep = { mark: string; title: string; text: string };
export type StoryMaterial = { name: string; source: string };
export type StoryPillar = {
  label: string;
  text: string;
  linkLabel: string;
  href: string;
  external: boolean;
  current: boolean;
};

export type StoryPageData = {
  hero: {
    eyebrow: string;
    title: string;
    text: string;
    imgSrc: string | null;
    imgAlt: string;
  };
  belief: { eyebrow: string; title: string; text: string };
  chapters: StoryChapter[];
  process: { title: string; steps: StoryStep[] };
  materials: {
    title: string;
    text: string;
    items: StoryMaterial[];
    placeholder: string | null;
    imgSrc: string | null;
    imgAlt: string;
  };
  pillars: { title: string; items: StoryPillar[] };
  closing: {
    eyebrow: string | null;
    title: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
  };
  seo: { title?: string; description?: string; noindex?: boolean };
};

type RawStory = {
  page?: {
    hero?: { eyebrow?: string; title?: string; text?: string; photo?: Photo };
    belief?: { eyebrow?: string; title?: string; text?: string };
    chapters?: {
      eyebrow?: string;
      title?: string;
      text?: Prose | string;
      photo?: Photo;
    }[];
    process?: { title?: string; steps?: { mark?: string; title?: string; text?: string }[] };
    materials?: {
      title?: string;
      text?: string;
      items?: { name?: string; source?: string }[];
      photo?: Photo;
    };
    pillars?: {
      title?: string;
      items?: {
        label?: string;
        labelMuted?: string;
        text?: string;
        current?: boolean;
        link?: { label?: string; href?: string; external?: boolean };
      }[];
    };
    closing?: { title?: string; primaryLabel?: string; secondaryLabel?: string };
    seo?: { title?: string; description?: string };
  } | null;
  chrome?: {
    announcement?: { drop?: { code?: string; opensAt?: string; slug?: string } | null };
  };
};

const LOCAL: Record<string, { src: string; alt: string }> = {
  hero: { src: '/images/carved-wall.jpg', alt: 'The NEVMA name carved into a stone wall' },
  ch1: {
    src: '/images/definition-tee-white.jpg',
    alt: 'The first STYLE 001 piece, the white definition t-shirt',
  },
  ch2: { src: '/images/stage.jpg', alt: 'A stage framed by violet light beams' },
};

function chapterHtml(text: Prose | string | undefined): string {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return lineTextToHtml(text);
}

function photoSrc(photo: Photo | null | undefined, fallback: string | null): string | null {
  if (photo && hasPhotoImage(photo)) {
    return resolvePhoto(photo, slots.hero)?.src || fallback;
  }
  return fallback;
}

export async function loadStory(): Promise<StoryPageData | null> {
  if (!sanityConfigured()) return null;
  let raw: RawStory;
  try {
    raw = await sanityFetch<RawStory>(storyQuery);
  } catch {
    return null;
  }
  const p = raw.page;
  if (!p) return null;

  const drop = raw.chrome?.announcement?.drop;
  // Prefer next upcoming drop for closing eyebrow - storyQuery chrome uses announcement drop.
  let nextCode = 'STYLE 002';
  let nextWhen = 'Fri 4 Dec';
  let currentDropHref = '/drops/style-001';
  try {
    const next = await sanityFetch<{
      code?: string;
      opensAt?: string;
      slug?: string;
    } | null>(
      `*[_type == "drop" && opensAt > $now] | order(opensAt asc)[0]{code, opensAt, "slug": slug.current}`,
      { now: new Date(nowMs()).toISOString() },
    );
    if (next?.opensAt) {
      nextCode = next.code || nextCode;
      nextWhen = formatDayMonth(next.opensAt);
    }
    const current = await sanityFetch<{ slug?: string } | null>(
      `*[_type == "drop" && opensAt <= $now] | order(opensAt desc)[0]{"slug": slug.current}`,
      { now: new Date(nowMs()).toISOString() },
    );
    if (current?.slug) currentDropHref = `/drops/${current.slug}`;
  } catch {
    if (drop?.slug) currentDropHref = `/drops/${drop.slug}`;
  }

  const chapters = (p.chapters || []).map((c, i) => {
    const local = i === 0 ? LOCAL.ch1 : LOCAL.ch2;
    const photo = c.photo || null;
    const imgSrc = photoSrc(photo, local?.src || null);
    return {
      eyebrow: c.eyebrow || '',
      title: c.title || '',
      html: chapterHtml(c.text),
      photo,
      flip: i % 2 === 1,
      toneBg: TONE_BG[(photo?.tone as keyof typeof TONE_BG) || 'black'] || '#000000',
      imgSrc,
      imgAlt: photo?.alt || local?.alt || '',
    };
  });

  const matPhoto = p.materials?.photo || null;
  const matSrc = photoSrc(matPhoto, null);
  const hasMat = Boolean(matSrc);
  const matPlaceholder = matPhoto?.placeholder
    ? `[Photo · ${matPhoto.placeholder}]`
    : '[Photo · workshop, hands at work]';

  return {
    hero: {
      eyebrow: p.hero?.eyebrow || 'NEVMA Style · The story',
      title: p.hero?.title || 'Limited by design',
      text:
        p.hero?.text ||
        'Not merchandise. Limited objects of identity, made in deliberate numbers and kept forever.',
      imgSrc: photoSrc(p.hero?.photo, LOCAL.hero.src),
      imgAlt: p.hero?.photo?.alt || LOCAL.hero.alt,
    },
    belief: {
      eyebrow: p.belief?.eyebrow || 'What we believe',
      title: p.belief?.title || 'Recognised without needing to announce itself.',
      text: p.belief?.text || '',
    },
    chapters,
    process: {
      title: p.process?.title || 'How a piece is made',
      steps: (p.process?.steps || []).map((s, i) => ({
        mark: s.mark || String(i + 1).padStart(2, '0'),
        title: s.title || '',
        text: s.text || '',
      })),
    },
    materials: {
      title: p.materials?.title || 'Materials and makers',
      text: p.materials?.text || '',
      items: (p.materials?.items || []).map((m) => ({
        name: m.name || '',
        source: m.source || '',
      })),
      placeholder: hasMat ? null : matPlaceholder,
      imgSrc: matSrc,
      imgAlt: matPhoto?.alt || '',
    },
    pillars: {
      title: p.pillars?.title || 'Three pillars. One identity.',
      items: (() => {
        const DESIGN_PILLARS = [
          {
            label: 'NEVMA The Label',
            text: 'Original music every month, distributed worldwide.',
            linkLabel: 'Listen ↗',
            href: 'https://[nevma-music-domain]',
            external: true,
            current: false,
          },
          {
            label: 'NEVMA Moments',
            text: 'More than events: music, place and light as one experience.',
            linkLabel: 'See Moments ↗',
            href: 'https://[nevma-moments]',
            external: true,
            current: false,
          },
          {
            label: 'NEVMA Style',
            text: 'You are here. Limited objects of identity.',
            linkLabel: 'All pieces',
            href: '/pieces',
            external: false,
            current: true,
          },
        ];
        const rawItems = p.pillars?.items || [];
        // Seed sometimes stores truncated labels ("NEVMA"); prefer design wording when so.
        const truncated = rawItems.length === 3 && rawItems.every((i) => (i.label || '') === 'NEVMA');
        if (!rawItems.length || truncated) return DESIGN_PILLARS;
        return rawItems.map((item, idx) => {
          const fallback = DESIGN_PILLARS[idx];
          const current = Boolean(item.current);
          const external = Boolean(item.link?.external);
          let linkLabel = item.link?.label || fallback?.linkLabel || '';
          if (external && linkLabel && !linkLabel.includes('↗')) linkLabel = `${linkLabel} ↗`;
          let href = item.link?.href || fallback?.href || '#';
          if (href && !href.startsWith('/') && !href.startsWith('http') && !href.startsWith('#')) {
            href = `/${href}`;
          }
          return {
            label: item.label || fallback?.label || '',
            text: item.text || fallback?.text || '',
            linkLabel,
            href,
            external,
            current,
          };
        });
      })(),
    },
    closing: {
      eyebrow: `Next · ${nextCode} · ${nextWhen}`,
      title: p.closing?.title || 'We don’t follow. We define.',
      primaryLabel: p.closing?.primaryLabel || 'Get notified',
      primaryHref: '/#notify',
      secondaryLabel: p.closing?.secondaryLabel || 'Current drop',
      secondaryHref: currentDropHref,
    },
    seo: p.seo || {},
  };
}
