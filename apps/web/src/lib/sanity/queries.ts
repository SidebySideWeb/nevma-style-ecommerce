import { sanityFetch } from './client';

/** Expanded photo object used by Photo.astro / image.ts. */
export const photoProjection = `{
  alt, position, zoom, placeholder, tone,
  image{
    asset->{_id, url, metadata{dimensions, lqip}},
    hotspot,
    crop
  }
}`;

const seoProjection = `seo{title, description, noindex, image{asset->{_id, url}}}`;

const linkProjection = `{label, href, external}`;

const pieceCardProjection = `{
  title,
  "handle": coalesce(product->store.slug.current, handle.current),
  number, colour, swatch, cardStory, phase1State,
  "cardPhoto": cardPhoto${photoProjection},
  "gallery0": gallery[0]${photoProjection},
  drop->{code, name, "slug": slug.current, opensAt},
  category->{name, "slug": slug.current},
  "shopify": product->store{status, isDeleted, gid, "handle": slug.current}
}`;

const chromeProjection = `{
  "announcement": announcement{
    enabled, linkLabel,
    drop->{code, name, "slug": slug.current, opensAt}
  },
  mainNav[]${linkProjection},
  menuExtra[]${linkProjection},
  footer{
    tagline, newsletterPlaceholder, newsletterButton,
    links[]${linkProjection},
    definition{word, pos, lead, meaning},
    closingLine,
    legalLinks[]${linkProjection},
    paymentNote, copyright
  },
  clientCareEmail, studioLine, musicUrl, momentsUrl, instagramUrl,
  ${seoProjection}
}`;

const siteSettingsDefaults = `*[_id == "siteSettings"][0]{
  pieceDefaults{
    editionText, deliveryText, paymentText, buyNote, deliveryLine,
    keepExploring[]{label, href, photo${photoProjection}},
    filmDefault{eyebrow, title, text, caption, poster${photoProjection}}
  },
  notify{homeNote, letterOptIn, privacyNote, pieceDone},
  services[]{title, text, link${linkProjection}}
}`;

/** Shared chrome for every page (announcement, nav, footer). */
export const chromeQuery = `*[_id == "siteSettings"][0]${chromeProjection}`;

/** `/` */
export const homeQuery = `{
  "chrome": ${chromeQuery},
  "page": *[_id == "homePage"][0]{
    hero{
      titleLines, intro, statSuffix, primaryLabel, secondaryLabel,
      drop->{code, name, "slug": slug.current, opensAt,
        pieces[]->${pieceCardProjection}
      },
      piece->${pieceCardProjection},
      photo${photoProjection}
    },
    pieces{title, linkLabel},
    next{
      drop->{_id, code, name, "slug": slug.current, opensAt, summary,
        pieces[]->${pieceCardProjection}
      },
      background${photoProjection},
      teasers[]${photoProjection}
    },
    rules{title, titleMuted, items[]{mark, title, text}},
    story{photo${photoProjection}, eyebrow, title, text, linkLabel},
    world{
      title, titleMuted,
      cards[]{photo${photoProjection}, label, labelMuted, text, url, ariaLabel}
    },
    ${seoProjection}
  },
  "defaults": ${siteSettingsDefaults}
}`;

/** `/drops/<slug>` */
export const dropQuery = `{
  "chrome": ${chromeQuery},
  "drop": *[_type == "drop" && slug.current == $slug][0]{
    code, name, "slug": slug.current, opensAt, summary, intro,
    shopifyCollectionHandle,
    pieces[]->${pieceCardProjection},
    definition{word, pos, meaning, image${photoProjection}},
    notesIntro, notes[]{mark, title, text},
    ${seoProjection}
  },
  "siblings": {
    "prev": *[_type == "drop" && opensAt < *[_type == "drop" && slug.current == $slug][0].opensAt] | order(opensAt desc)[0]{code, name, "slug": slug.current, opensAt},
    "next": *[_type == "drop" && opensAt > *[_type == "drop" && slug.current == $slug][0].opensAt] | order(opensAt asc)[0]{code, name, "slug": slug.current, opensAt}
  },
  "defaults": ${siteSettingsDefaults}
}`;

/** `/pieces/<handle>` — defaults coalesced from siteSettings. */
export const pieceQuery = `{
  "chrome": ${chromeQuery},
  "piece": *[_type == "piece" && handle.current == $handle][0]{
    title,
    "handle": coalesce(product->store.slug.current, handle.current),
    "shopify": product->store{status, isDeleted, gid, "handle": slug.current},
    number, colour, swatch, reference, cardStory, lead, body, facts, sizeGuide, care,
    "editionText": coalesce(editionText, *[_id == "siteSettings"][0].pieceDefaults.editionText),
    gallery[]${photoProjection},
    cardPhoto${photoProjection},
    drop->{_id, code, name, "slug": slug.current, opensAt},
    category->{name, "slug": slug.current},
    otherColours[]->{title, "handle": coalesce(product->store.slug.current, handle.current), swatch, colour, phase1State},
    film{eyebrow, title, text, caption, poster${photoProjection}, "videoUrl": video.asset->url, "captionsUrl": captionsVtt.asset->url},
    wearWith{
      photo${photoProjection},
      pieces[]->{title, "handle": coalesce(product->store.slug.current, handle.current), drop->{code, opensAt}, "gallery0": gallery[0]${photoProjection}, cardPhoto${photoProjection}, phase1State, "shopify": product->store{status, isDeleted, gid}}
    },
    phase1State,
    ${seoProjection}
  },
  "defaults": ${siteSettingsDefaults},
  "shop": *[_id == "shopPages"][0]{bag{drawerNote}},
  "nextDrop": *[_type == "drop" && opensAt > $now] | order(opensAt asc)[0]{_id, code, name, "slug": slug.current, opensAt}
}`;

/** `/pieces` */
export const piecesQuery = `{
  "chrome": ${chromeQuery},
  "shop": *[_id == "shopPages"][0]{allPieces{title, intro}, ${seoProjection}},
  "pieces": *[_type == "piece"] | order(number desc)${pieceCardProjection},
  "drops": *[_type == "drop"] | order(opensAt desc){code, name, "slug": slug.current, opensAt},
  "categories": *[_type == "category"] | order(order asc){name, "slug": slug.current, order}
}`;

/** `/categories/<slug>` */
export const categoryQuery = `{
  "chrome": ${chromeQuery},
  "category": *[_type == "category" && slug.current == $slug][0]{
    name, "slug": slug.current, order, intro, comingText, ${seoProjection}
  },
  "categories": *[_type == "category"] | order(order asc){name, "slug": slug.current, order},
  "pieces": *[_type == "piece" && category->slug.current == $slug] | order(number asc)${pieceCardProjection},
  "coming": *[_type == "piece" && category->slug.current == $slug && (!defined(product) || product->store.status != "active")] | order(number asc)[0]${pieceCardProjection}
}`;

/** `/bag` */
export const bagQuery = `{
  "chrome": ${chromeQuery},
  "shop": *[_id == "shopPages"][0]{
    bag{notHeldNote, dutiesNote, checkoutNote, soldTitle, soldText, emptyEyebrow, emptyTitle, emptyText, drawerNote}
  },
  "currentDrop": *[_type == "drop" && opensAt <= $now] | order(opensAt desc)[0]{
    code, name, "slug": slug.current, opensAt,
    "pieces": pieces[]->{
      "handle": coalesce(product->store.slug.current, handle.current)
    }
  },
  "nextDrop": *[_type == "drop" && opensAt > $now] | order(opensAt asc)[0]{code, name, "slug": slug.current, opensAt}
}`;

/** `/account/sign-in` */
export const signInQuery = `{
  "chrome": ${chromeQuery},
  "shop": *[_id == "shopPages"][0]{
    account{signInNote, createNote, benefitsTitle, benefits[]{mark, title, text}, benefitsPhoto${photoProjection}}
  }
}`;

/** `/account*` */
export const accountQuery = `{
  "chrome": ${chromeQuery},
  "shop": *[_id == "shopPages"][0]{
    account{deleteNote, benefitsTitle, benefits[]{mark, title, text}, benefitsPhoto${photoProjection}}
  },
  "nextDrop": *[_type == "drop" && opensAt > now()] | order(opensAt asc)[0]{code, name, "slug": slug.current, opensAt}
}`;

/** `/wishlist` */
export const wishlistQuery = `{
  "chrome": ${chromeQuery},
  "shop": *[_id == "shopPages"][0]{
    wishlist{title, note, guestTitle, guestText, guestCta}
  }
}`;

/** `/story` */
export const storyQuery = `{
  "chrome": ${chromeQuery},
  "page": *[_id == "storyPage"][0]{
    hero{eyebrow, title, text, photo${photoProjection}},
    belief{eyebrow, title, text, photo${photoProjection}},
    chapters[]{eyebrow, title, text, photo${photoProjection}},
    process{title, steps[]{mark, title, text}},
    materials{title, text, items[]{name, source}, photo${photoProjection}},
    pillars{title, items[]{label, labelMuted, text, link${linkProjection}, current}},
    closing{title, primaryLabel, secondaryLabel},
    ${seoProjection}
  }
}`;

/** `/client-care/*` and `/legal/*` — nav + optional info body. */
export const careQuery = `{
  "chrome": ${chromeQuery},
  "care": *[_id == "clientCarePage"][0]{
    eyebrow, title,
    faqTitle, faqMeta, faq[]{q, a},
    contact{title, meta, intro, topics, privacyNote, sentMessage},
    ${seoProjection}
  },
  "nav": {
    "care": *[_type == "infoPage" && section == "care"] | order(order asc){title, "slug": slug.current, order, section},
    "legal": *[_type == "infoPage" && section == "legal"] | order(order asc){title, "slug": slug.current, order, section}
  },
  "page": *[_type == "infoPage" && slug.current == $slug][0]{
    title, "slug": slug.current, section, order, meta, body, ${seoProjection}
  }
}`;

/** 404 copy. */
export const notFoundQuery = `{
  "chrome": ${chromeQuery},
  "shop": *[_id == "shopPages"][0]{notFound{title, text}}
}`;

export function fetchHome() {
  return sanityFetch<unknown>(homeQuery);
}

export function fetchDrop(slug: string) {
  return sanityFetch<unknown>(dropQuery, { slug });
}

export function fetchPiece(handle: string, now = new Date().toISOString()) {
  return sanityFetch<unknown>(pieceQuery, { handle, now });
}

export function fetchPieces() {
  return sanityFetch<unknown>(piecesQuery);
}

export function fetchCategory(slug: string) {
  return sanityFetch<unknown>(categoryQuery, { slug });
}

export function fetchBag(now = new Date().toISOString()) {
  return sanityFetch<unknown>(bagQuery, { now });
}

export function fetchSignIn() {
  return sanityFetch<unknown>(signInQuery);
}

export function fetchAccount() {
  return sanityFetch<unknown>(accountQuery);
}

export function fetchWishlist() {
  return sanityFetch<unknown>(wishlistQuery);
}

export function fetchStory() {
  return sanityFetch<unknown>(storyQuery);
}

export function fetchCare(slug: string) {
  return sanityFetch<unknown>(careQuery, { slug });
}

export function fetchNotFound() {
  return sanityFetch<unknown>(notFoundQuery);
}

export function fetchChrome() {
  return sanityFetch<unknown>(chromeQuery);
}
