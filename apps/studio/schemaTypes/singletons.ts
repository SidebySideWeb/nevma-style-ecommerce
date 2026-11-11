import { defineArrayMember, defineField, defineType } from 'sanity';

const arr = (name: string, type: string, extra: Record<string, unknown> = {}) => defineField({ name, type: 'array', of: [defineArrayMember({ type })], ...extra });

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  groups: [{ name: 'bar', title: 'Announcement', default: true }, { name: 'nav', title: 'Navigation' }, { name: 'footer', title: 'Footer' }, { name: 'shop', title: 'Shop texts' }, { name: 'contact', title: 'Contact and links' }, { name: 'seo', title: 'SEO' }],
  fields: [
    defineField({ name: 'announcement', type: 'object', group: 'bar', fields: [
      defineField({ name: 'enabled', type: 'boolean', initialValue: true }),
      defineField({ name: 'drop', type: 'reference', to: [{ type: 'drop' }], description: 'Usually the next drop. The bar reads "STYLE 002 · Signal · drops Fri 4 Dec, 18:00 GMT" from it.' }),
      defineField({ name: 'linkLabel', type: 'string', initialValue: 'Get notified' }) ] }),
    arr('mainNav', 'linkItem', { group: 'nav', title: 'Main navigation' }),
    arr('menuExtra', 'linkItem', { group: 'nav', title: 'Phone menu, extra links', description: 'Added under the main links in the phone menu (design: Client care).' }),
    defineField({ name: 'footer', type: 'object', group: 'footer', fields: [
      defineField({ name: 'tagline', type: 'string', initialValue: 'Style · Limited by design' }),
      defineField({ name: 'newsletterPlaceholder', type: 'string' }), defineField({ name: 'newsletterButton', type: 'string' }),
      arr('links', 'linkItem', { description: 'Two columns, filled left to right in pairs.' }),
      defineField({ name: 'definition', type: 'object', fields: [defineField({ name: 'word', type: 'string' }), defineField({ name: 'pos', type: 'string' }), defineField({ name: 'lead', type: 'string' }), defineField({ name: 'meaning', type: 'string' })] }),
      defineField({ name: 'closingLine', type: 'string' }),
      arr('legalLinks', 'linkItem'),
      defineField({ name: 'paymentNote', type: 'string' }),
      defineField({ name: 'copyright', type: 'string', description: 'Use {year} for the current year.' }) ] }),
    defineField({ name: 'services', type: 'array', group: 'shop', title: 'Services strip (piece pages)', of: [defineArrayMember({ type: 'object', name: 'service', fields: [
      defineField({ name: 'title', type: 'string' }), defineField({ name: 'text', type: 'string' }), defineField({ name: 'link', type: 'linkItem' })], preview: { select: { title: 'title', subtitle: 'text' } } })], validation: (r) => r.max(4) }),
    defineField({ name: 'pieceDefaults', type: 'object', group: 'shop', title: 'Piece page defaults', fields: [
      defineField({ name: 'editionText', type: 'text', rows: 2 }), defineField({ name: 'deliveryText', type: 'text', rows: 3 }), defineField({ name: 'paymentText', type: 'text', rows: 3 }),
      defineField({ name: 'buyNote', type: 'string', title: 'Under the buy button' }), defineField({ name: 'deliveryLine', type: 'string' }),
      defineField({ name: 'keepExploring', type: 'array', of: [defineArrayMember({ type: 'object', name: 'exploreCard', fields: [defineField({ name: 'label', type: 'string' }), defineField({ name: 'href', type: 'string' }), defineField({ name: 'photo', type: 'photo' })], preview: { select: { title: 'label', media: 'photo.image' } } })], validation: (r) => r.max(3) }),
      defineField({ name: 'filmDefault', type: 'object', fields: [defineField({ name: 'eyebrow', type: 'string' }), defineField({ name: 'title', type: 'string' }), defineField({ name: 'text', type: 'text', rows: 2 }), defineField({ name: 'caption', type: 'string' }), defineField({ name: 'poster', type: 'photo' })] }) ] }),
    defineField({ name: 'notify', type: 'object', group: 'shop', title: 'Notify-me texts', fields: [
      defineField({ name: 'homeNote', type: 'string' }), defineField({ name: 'letterOptIn', type: 'string' }), defineField({ name: 'privacyNote', type: 'string' }), defineField({ name: 'pieceDone', type: 'string' }) ] }),
    defineField({ name: 'clientCareEmail', type: 'string', group: 'contact' }),
    defineField({ name: 'studioLine', type: 'string', group: 'contact' }),
    defineField({ name: 'musicUrl', type: 'url', group: 'contact', title: 'NEVMA Music site' }),
    defineField({ name: 'momentsUrl', type: 'url', group: 'contact', title: 'NEVMA Moments page' }),
    defineField({ name: 'instagramUrl', type: 'url', group: 'contact' }),
    defineField({ name: 'seo', type: 'seo', group: 'seo' }),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
});

export const homePage = defineType({
  name: 'homePage',
  title: 'Home',
  type: 'document',
  groups: [{ name: 'hero', title: 'Hero', default: true }, { name: 'pieces', title: 'The pieces' }, { name: 'next', title: 'Next drop' }, { name: 'rules', title: 'Five. Then never again.' }, { name: 'story', title: 'Story teaser' }, { name: 'world', title: 'World of NEVMA' }, { name: 'seo', title: 'SEO' }],
  fields: [
    defineField({ name: 'hero', type: 'object', group: 'hero', fields: [
      defineField({ name: 'drop', type: 'reference', to: [{ type: 'drop' }], description: 'The current drop. The eyebrow and "x of 15 left" are worked out from it and Shopify.' }),
      defineField({ name: 'titleLines', type: 'array', of: [defineArrayMember({ type: 'string' })], description: 'One line each: "The word," / "worn."' }),
      defineField({ name: 'intro', type: 'text', rows: 3 }),
      defineField({ name: 'statSuffix', type: 'string', initialValue: 'numbered pieces left in this drop' }),
      defineField({ name: 'primaryLabel', type: 'string' }), defineField({ name: 'secondaryLabel', type: 'string' }),
      defineField({ name: 'piece', type: 'reference', to: [{ type: 'piece' }], title: 'Hero piece' }), defineField({ name: 'photo', type: 'photo', title: 'Hero photo (optional, else the piece photo)' }) ] }),
    defineField({ name: 'pieces', type: 'object', group: 'pieces', fields: [defineField({ name: 'title', type: 'string' }), defineField({ name: 'linkLabel', type: 'string' })] }),
    defineField({ name: 'next', type: 'object', group: 'next', fields: [
      defineField({ name: 'drop', type: 'reference', to: [{ type: 'drop' }] }), defineField({ name: 'background', type: 'photo' }),
      arr('teasers', 'photo', { description: 'Three veiled slots for the coming pieces (placeholder label used until photos are released).' }) ] }),
    defineField({ name: 'rules', type: 'object', group: 'rules', fields: [defineField({ name: 'title', type: 'string' }), defineField({ name: 'titleMuted', type: 'string' }), arr('items', 'titledText', { validation: (r: { max: (n: number) => unknown }) => r.max(4) })] }),
    defineField({ name: 'story', type: 'object', group: 'story', fields: [defineField({ name: 'photo', type: 'photo' }), defineField({ name: 'eyebrow', type: 'string' }), defineField({ name: 'title', type: 'string' }), defineField({ name: 'text', type: 'text', rows: 3 }), defineField({ name: 'linkLabel', type: 'string' })] }),
    defineField({ name: 'world', type: 'object', group: 'world', fields: [
      defineField({ name: 'title', type: 'string' }), defineField({ name: 'titleMuted', type: 'string' }),
      defineField({ name: 'cards', type: 'array', validation: (r) => r.max(2), of: [defineArrayMember({ type: 'object', name: 'worldCard', fields: [
        defineField({ name: 'photo', type: 'photo' }), defineField({ name: 'label', type: 'string' }), defineField({ name: 'labelMuted', type: 'string' }),
        defineField({ name: 'text', type: 'text', rows: 2 }), defineField({ name: 'url', type: 'url' }), defineField({ name: 'ariaLabel', type: 'string' })], preview: { select: { title: 'labelMuted', media: 'photo.image' } } })] }) ] }),
    defineField({ name: 'seo', type: 'seo', group: 'seo' }),
  ],
  preview: { prepare: () => ({ title: 'Home' }) },
});

export const storyPage = defineType({
  name: 'storyPage',
  title: 'Story',
  type: 'document',
  fields: [
    defineField({ name: 'hero', type: 'object', fields: [defineField({ name: 'eyebrow', type: 'string' }), defineField({ name: 'title', type: 'string' }), defineField({ name: 'text', type: 'text', rows: 2 }), defineField({ name: 'photo', type: 'photo' })] }),
    defineField({ name: 'belief', type: 'object', fields: [defineField({ name: 'eyebrow', type: 'string' }), defineField({ name: 'title', type: 'string' }), defineField({ name: 'text', type: 'text', rows: 4 }), defineField({ name: 'photo', type: 'photo' })] }),
    defineField({ name: 'chapters', type: 'array', validation: (r) => r.max(2), of: [defineArrayMember({ type: 'object', name: 'chapter', fields: [
      defineField({ name: 'eyebrow', type: 'string' }), defineField({ name: 'title', type: 'string' }), defineField({ name: 'text', type: 'lineText' }), defineField({ name: 'photo', type: 'photo' })], preview: { select: { title: 'title', subtitle: 'eyebrow' } } })] }),
    defineField({ name: 'process', type: 'object', fields: [defineField({ name: 'title', type: 'string' }), arr('steps', 'titledText')] }),
    defineField({ name: 'materials', type: 'object', fields: [defineField({ name: 'title', type: 'string' }), defineField({ name: 'text', type: 'text', rows: 3 }),
      defineField({ name: 'items', type: 'array', of: [defineArrayMember({ type: 'object', name: 'material', fields: [defineField({ name: 'name', type: 'string' }), defineField({ name: 'source', type: 'string' })], preview: { select: { title: 'name', subtitle: 'source' } } })] }), defineField({ name: 'photo', type: 'photo' })] }),
    defineField({ name: 'pillars', type: 'object', fields: [defineField({ name: 'title', type: 'string' }),
      defineField({ name: 'items', type: 'array', validation: (r) => r.max(3), of: [defineArrayMember({ type: 'object', name: 'pillar', fields: [defineField({ name: 'label', type: 'string' }), defineField({ name: 'labelMuted', type: 'string' }), defineField({ name: 'text', type: 'string' }), defineField({ name: 'link', type: 'linkItem' }), defineField({ name: 'current', type: 'boolean', title: 'This site' })], preview: { select: { title: 'labelMuted' } } })] })] }),
    defineField({ name: 'closing', type: 'object', fields: [defineField({ name: 'title', type: 'string' }), defineField({ name: 'primaryLabel', type: 'string' }), defineField({ name: 'secondaryLabel', type: 'string' })] }),
    defineField({ name: 'seo', type: 'seo' }),
  ],
  preview: { prepare: () => ({ title: 'Story' }) },
});

export const clientCarePage = defineType({
  name: 'clientCarePage',
  title: 'Client care page',
  type: 'document',
  fields: [
    defineField({ name: 'eyebrow', type: 'string' }), defineField({ name: 'title', type: 'string' }),
    defineField({ name: 'faqTitle', type: 'string' }), defineField({ name: 'faqMeta', type: 'string' }), arr('faq', 'qa'),
    defineField({ name: 'contact', type: 'object', fields: [
      defineField({ name: 'title', type: 'string' }), defineField({ name: 'meta', type: 'string' }), defineField({ name: 'intro', type: 'text', rows: 2 }),
      defineField({ name: 'topics', type: 'array', of: [defineArrayMember({ type: 'string' })] }),
      defineField({ name: 'privacyNote', type: 'string' }), defineField({ name: 'sentMessage', type: 'string' }), defineField({ name: 'notifyEmail', type: 'string', title: 'Messages go to', description: 'Not shown on the site.' }) ] }),
    defineField({ name: 'seo', type: 'seo' }),
  ],
  preview: { prepare: () => ({ title: 'Client care page' }) },
});

export const shopPages = defineType({
  name: 'shopPages',
  title: 'Shop pages (bag, account, wishlist, all pieces)',
  type: 'document',
  groups: [{ name: 'pieces', title: 'All pieces', default: true }, { name: 'bag', title: 'Bag' }, { name: 'account', title: 'Sign in and account' }, { name: 'wishlist', title: 'Wishlist' }, { name: 'notFound', title: '404' }],
  fields: [
    defineField({ name: 'allPieces', type: 'object', group: 'pieces', fields: [defineField({ name: 'title', type: 'string' }), defineField({ name: 'intro', type: 'text', rows: 2 })] }),
    defineField({ name: 'bag', type: 'object', group: 'bag', fields: [
      defineField({ name: 'notHeldNote', type: 'string' }), defineField({ name: 'dutiesNote', type: 'string' }), defineField({ name: 'checkoutNote', type: 'string' }),
      defineField({ name: 'soldTitle', type: 'string', description: 'Use {piece}' }), defineField({ name: 'soldText', type: 'string' }),
      defineField({ name: 'emptyEyebrow', type: 'string' }), defineField({ name: 'emptyTitle', type: 'string' }), defineField({ name: 'emptyText', type: 'string', description: 'Use {drop}, {left}, {nextDrop}, {nextDate}' }),
      defineField({ name: 'drawerNote', type: 'string', description: 'Bag drawer after add. Use {leftWords}.' }) ] }),
    defineField({ name: 'account', type: 'object', group: 'account', fields: [
      defineField({ name: 'signInNote', type: 'string' }), defineField({ name: 'createNote', type: 'string' }),
      defineField({ name: 'benefitsTitle', type: 'string' }), arr('benefits', 'titledText'), defineField({ name: 'benefitsPhoto', type: 'photo' }),
      defineField({ name: 'deleteNote', type: 'string' }) ] }),
    defineField({ name: 'wishlist', type: 'object', group: 'wishlist', fields: [
      defineField({ name: 'title', type: 'string' }), defineField({ name: 'note', type: 'string' }),
      defineField({ name: 'guestTitle', type: 'string' }), defineField({ name: 'guestText', type: 'string' }), defineField({ name: 'guestCta', type: 'string' }) ] }),
    defineField({ name: 'notFound', type: 'object', group: 'notFound', fields: [defineField({ name: 'title', type: 'string' }), defineField({ name: 'text', type: 'string' })] }),
  ],
  preview: { prepare: () => ({ title: 'Shop pages' }) },
});

export const singletons = [siteSettings, homePage, storyPage, clientCarePage, shopPages];
