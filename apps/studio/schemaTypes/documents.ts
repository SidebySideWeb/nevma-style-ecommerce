import { defineArrayMember, defineField, defineType } from 'sanity';

const groups = [
  { name: 'main', title: 'Main', default: true },
  { name: 'details', title: 'Details' },
  { name: 'media', title: 'Photos and film' },
  { name: 'links', title: 'Related' },
  { name: 'phase1', title: 'If the shop is switched off' },
  { name: 'seo', title: 'SEO' },
];

export const drop = defineType({
  name: 'drop',
  title: 'Drop',
  type: 'document',
  groups: [{ name: 'main', title: 'Main', default: true }, { name: 'band', title: 'Definition band' }, { name: 'notes', title: 'Drop notes' }, { name: 'seo', title: 'SEO' }],
  fields: [
    defineField({ name: 'code', type: 'string', title: 'Code', description: 'e.g. STYLE 001', group: 'main', validation: (r) => r.required() }),
    defineField({ name: 'name', type: 'string', description: 'e.g. Definition', group: 'main', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'code' }, group: 'main', validation: (r) => r.required() }),
    defineField({ name: 'opensAt', type: 'datetime', title: 'Opens / released at', description: 'Drives "coming" vs "released", the countdown and the announcement bar. London time is shown on the site.', group: 'main', validation: (r) => r.required() }),
    defineField({ name: 'collection', type: 'reference', to: [{ type: 'collection' }], weak: true, title: 'Shopify collection', description: 'Synced by Sanity Connect. The collection that holds this drop\'s products.', group: 'main' }),
    defineField({ name: 'shopifyCollectionHandle', type: 'string', title: 'Shopify collection handle', description: 'Used until the collection is synced and picked above.', group: 'main' }),
    defineField({ name: 'summary', type: 'text', rows: 3, title: 'Teaser text', description: 'Used on Home for the next drop, e.g. "An overshirt, a suede cap and a silk square, five of each. …"', group: 'main' }),
    defineField({ name: 'intro', type: 'lineText', title: 'Intro (drop page)', group: 'main' }),
    defineField({ name: 'pieces', type: 'array', of: [defineArrayMember({ type: 'reference', to: [{ type: 'piece' }] })], description: 'In display order (N° 01, 02, 03).', group: 'main' }),
    defineField({ name: 'definition', type: 'object', group: 'band', fields: [
      defineField({ name: 'word', type: 'string', initialValue: 'nevma' }), defineField({ name: 'pos', type: 'string', title: 'Part of speech', initialValue: 'noun' }),
      defineField({ name: 'meaning', type: 'text', rows: 2 }), defineField({ name: 'image', type: 'photo', title: 'Background' }) ] }),
    defineField({ name: 'notesIntro', type: 'text', rows: 2, group: 'notes' }),
    defineField({ name: 'notes', type: 'array', of: [defineArrayMember({ type: 'titledText' })], group: 'notes' }),
    defineField({ name: 'seo', type: 'seo', group: 'seo' }),
  ],
  orderings: [{ title: 'Newest first', name: 'opensDesc', by: [{ field: 'opensAt', direction: 'desc' }] }],
  preview: { select: { code: 'code', name: 'name', at: 'opensAt' }, prepare: ({ code, name, at }) => ({ title: `${code} · ${name}`, subtitle: at ? new Date(at).toUTCString() : '' }) },
});

export const piece = defineType({
  name: 'piece',
  title: 'Piece',
  type: 'document',
  groups,
  fields: [
    defineField({ name: 'title', type: 'string', description: 'Name · colour, e.g. "Definition Tee · White". Must match the Shopify product title.', group: 'main', validation: (r) => r.required() }),
    defineField({ name: 'product', type: 'reference', to: [{ type: 'product' }], weak: true, title: 'Shopify product', description: 'Pick the product synced by Sanity Connect. Price, sizes and stock always come from Shopify; nothing commercial is typed here.', group: 'main',
      validation: (r) => r.custom(async (ref, ctx) => {
        if (!ref?._ref) return 'Link the Shopify product once it exists (pieces of a coming drop may wait).';
        const handle = (ctx.document as { handle?: { current?: string } })?.handle?.current;
        const slug = await ctx.getClient({ apiVersion: '2026-10-01' }).fetch('*[_id == $id][0].store.slug.current', { id: ref._ref });
        return slug && handle && slug !== handle ? `Handle "${handle}" differs from the Shopify handle "${slug}". Copy the Shopify handle into the field below.` : true;
      }).warning() }),
    defineField({ name: 'handle', type: 'slug', title: 'Handle (URL)', description: 'Must equal the Shopify product handle. The URL is /pieces/<handle>. Filled before the product exists so the page can be built; the warning above flags any mismatch.', options: { source: 'title' }, group: 'main', validation: (r) => r.required() }),
    defineField({ name: 'number', type: 'number', title: 'N°', description: 'Archive number across all drops (01, 02, …).', group: 'main', validation: (r) => r.required().integer().min(1) }),
    defineField({ name: 'drop', type: 'reference', to: [{ type: 'drop' }], group: 'main', validation: (r) => r.required() }),
    defineField({ name: 'category', type: 'reference', to: [{ type: 'category' }], group: 'main', validation: (r) => r.required() }),
    defineField({ name: 'colour', type: 'string', description: 'Shown as "Colour · WHITE".', group: 'main' }),
    defineField({ name: 'swatch', type: 'string', description: 'Hex for the colour swatch, e.g. #F7F6F2.', group: 'main' }),
    defineField({ name: 'otherColours', type: 'array', title: 'Other colourways', of: [defineArrayMember({ type: 'reference', to: [{ type: 'piece' }] })], description: 'Shown as extra swatches (each colourway is its own piece and Shopify product).', group: 'main' }),
    defineField({ name: 'reference', type: 'string', description: 'e.g. NS-001-TEE-WHT', group: 'main' }),
    defineField({ name: 'cardStory', type: 'text', rows: 2, title: 'Short story (cards)', description: 'One or two lines used on the drop and category pages.', group: 'main' }),
    defineField({ name: 'lead', type: 'text', rows: 3, title: 'About · first paragraph', group: 'details' }),
    defineField({ name: 'body', type: 'text', rows: 4, title: 'About · second paragraph', group: 'details' }),
    defineField({ name: 'facts', type: 'array', of: [defineArrayMember({ type: 'string' })], title: 'Facts list', group: 'details' }),
    defineField({ name: 'sizeGuide', type: 'sizeGuide', group: 'details' }),
    defineField({ name: 'care', type: 'text', rows: 2, group: 'details' }),
    defineField({ name: 'editionText', type: 'text', rows: 2, title: '"The edition" text', description: 'Leave empty to use the default from Site settings.', group: 'details' }),
    defineField({ name: 'gallery', type: 'array', of: [defineArrayMember({ type: 'photo' })], description: 'Three slots in the design. The first photo is also the card image.', group: 'media', validation: (r) => r.min(1) }),
    defineField({ name: 'cardPhoto', type: 'photo', title: 'Card photo (optional)', description: 'Overrides the first gallery photo on cards.', group: 'media' }),
    defineField({ name: 'film', type: 'object', group: 'media', fields: [
      defineField({ name: 'eyebrow', type: 'string', initialValue: 'The art of the edition' }), defineField({ name: 'title', type: 'string' }), defineField({ name: 'text', type: 'text', rows: 2 }),
      defineField({ name: 'video', type: 'file', options: { accept: 'video/mp4,video/webm' } }), defineField({ name: 'poster', type: 'photo' }),
      defineField({ name: 'caption', type: 'string', description: 'e.g. "[Film · 0:24, muted, captions on]" until the film exists.' }),
      defineField({ name: 'captionsVtt', type: 'file', title: 'Captions (.vtt)', options: { accept: 'text/vtt' } }) ] }),
    defineField({ name: 'wearWith', type: 'object', group: 'links', fields: [
      defineField({ name: 'photo', type: 'photo', title: 'Styled photo' }),
      defineField({ name: 'pieces', type: 'array', of: [defineArrayMember({ type: 'reference', to: [{ type: 'piece' }] })], validation: (r) => r.max(2) }) ] }),
    defineField({ name: 'phase1State', type: 'string', title: 'State if the shop is switched off', description: 'Only used when COMMERCE_ENABLED is false (emergency switch). Normally the state comes from Shopify stock and the drop date.', group: 'phase1',
      options: { list: ['available', 'last-piece', 'sold-out', 'upcoming'], layout: 'radio' }, initialValue: 'upcoming' }),
    defineField({ name: 'seo', type: 'seo', group: 'seo' }),
  ],
  orderings: [{ title: 'N°, newest first', name: 'numDesc', by: [{ field: 'number', direction: 'desc' }] }],
  preview: { select: { title: 'title', n: 'number', drop: 'drop.code', media: 'gallery.0.image', status: 'product.store.status' }, prepare: ({ title, n, drop, media, status }) => ({ title, subtitle: `N° ${String(n ?? '').padStart(2, '0')} · ${drop ?? ''}${status ? ' · Shopify ' + String(status).toLowerCase() : ' · not linked to Shopify'}`, media }) },
});

export const category = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'name' }, validation: (r) => r.required() }),
    defineField({ name: 'order', type: 'number', validation: (r) => r.required().integer() }),
    defineField({ name: 'intro', type: 'text', rows: 2 }),
    defineField({ name: 'comingText', type: 'text', rows: 2, title: 'Text for the coming piece', description: 'Shown when the category has no live piece yet, e.g. "A heavy cotton overshirt with … Five pieces."' }),
    defineField({ name: 'seo', type: 'seo' }),
  ],
  orderings: [{ title: 'Order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'name', subtitle: 'slug.current' } },
});

export const infoPage = defineType({
  name: 'infoPage',
  title: 'Policy or legal page',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title' }, description: 'shipping, returns (client care) · terms, privacy, cookies (legal)', validation: (r) => r.required() }),
    defineField({ name: 'section', type: 'string', options: { list: [{ title: 'Client care', value: 'care' }, { title: 'Legal', value: 'legal' }], layout: 'radio' }, validation: (r) => r.required() }),
    defineField({ name: 'order', type: 'number', validation: (r) => r.required() }),
    defineField({ name: 'meta', type: 'string', description: 'Line under the title, e.g. "Updated 1 December 2026".' }),
    defineField({ name: 'body', type: 'prose' }),
    defineField({ name: 'seo', type: 'seo' }),
  ],
  orderings: [{ title: 'Section, order', name: 'sec', by: [{ field: 'section', direction: 'asc' }, { field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'title', subtitle: 'section' } },
});

export const documents = [drop, piece, category, infoPage];
