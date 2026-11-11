import { defineArrayMember, defineField, defineType } from 'sanity';

/** A photo slot: either a real image (with alt and crop) or a designed placeholder until the photo exists. */
export const photo = defineType({
  name: 'photo',
  title: 'Photo',
  type: 'object',
  fields: [
    defineField({ name: 'image', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'alt', type: 'string', title: 'Alt text', description: 'Describe the photo for people who cannot see it.',
      validation: (r) => r.custom((alt, ctx) => ((ctx.parent as { image?: unknown })?.image && !alt ? 'Alt text is required when there is an image' : true)) }),
    defineField({ name: 'position', type: 'string', title: 'Object position', description: 'CSS object-position used by the design, e.g. "center 42%". Leave empty to use the hotspot.' }),
    defineField({ name: 'zoom', type: 'number', title: 'Zoom', description: 'Close-up crops in the gallery (design uses 1.9 for the print detail). Default 1.', validation: (r) => r.min(1).max(3) }),
    defineField({ name: 'placeholder', type: 'string', title: 'Placeholder label', description: 'Shown in the designed placeholder slot while there is no photo, e.g. "worn, on model".' }),
    defineField({ name: 'tone', type: 'string', title: 'Slot colour', options: { list: [
      { title: 'Black #000000', value: 'black' }, { title: 'Ink #0B0B0C', value: 'ink' }, { title: 'Ink 2 #141418', value: 'ink2' }, { title: 'Bone #D9D3C8', value: 'bone' } ], layout: 'radio' }, initialValue: 'bone' }),
  ],
  preview: { select: { media: 'image', alt: 'alt', ph: 'placeholder' }, prepare: ({ media, alt, ph }) => ({ title: alt || (ph ? `[Photo · ${ph}]` : 'Photo'), media }) },
});

export const linkItem = defineType({
  name: 'linkItem',
  title: 'Link',
  type: 'object',
  fields: [
    defineField({ name: 'label', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'href', type: 'string', title: 'URL or path', description: 'A path on this site (/story) or a full URL.', validation: (r) => r.required() }),
    defineField({ name: 'external', type: 'boolean', title: 'Opens another site (shows ↗)', initialValue: false }),
  ],
  preview: { select: { title: 'label', subtitle: 'href' } },
});

export const titledText = defineType({
  name: 'titledText',
  title: 'Item',
  type: 'object',
  fields: [
    defineField({ name: 'mark', type: 'string', title: 'Mark / number', description: 'e.g. 05, N°, 00, ∞ or 01' }),
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'text', type: 'text', rows: 3 }),
  ],
  preview: { select: { title: 'title', subtitle: 'mark' } },
});

export const qa = defineType({
  name: 'qa',
  title: 'Question',
  type: 'object',
  fields: [
    defineField({ name: 'q', title: 'Question', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'a', title: 'Answer', type: 'text', rows: 3, validation: (r) => r.required() }),
  ],
  preview: { select: { title: 'q' } },
});

export const sizeGuide = defineType({
  name: 'sizeGuide',
  title: 'Size guide',
  type: 'object',
  fields: [
    defineField({ name: 'unit', type: 'string', initialValue: 'cm' }),
    defineField({ name: 'sizes', type: 'array', of: [defineArrayMember({ type: 'string' })], description: 'Column headings, e.g. S, M, L, XL. Must match the Shopify size option values.' }),
    defineField({ name: 'rows', type: 'array', of: [defineArrayMember({ type: 'object', name: 'sizeRow', fields: [
      defineField({ name: 'label', type: 'string' }), defineField({ name: 'values', type: 'array', of: [defineArrayMember({ type: 'string' })] }) ],
      preview: { select: { title: 'label' } } })] }),
  ],
});

/** Rich text for policy pages. The renderer outputs the exact .s-prose markup of the design. */
export const prose = defineType({
  name: 'prose',
  title: 'Text',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [{ title: 'Paragraph', value: 'normal' }, { title: 'Heading', value: 'h3' }],
      lists: [{ title: 'Bullets', value: 'bullet' }],
      marks: {
        decorators: [{ title: 'Italic', value: 'em' }, { title: 'Bold', value: 'strong' }],
        annotations: [{ name: 'link', type: 'object', title: 'Link', fields: [defineField({ name: 'href', type: 'string', title: 'URL or path' })] }],
      },
    }),
    defineArrayMember({ name: 'notice', title: 'Notice box', type: 'object', fields: [defineField({ name: 'text', type: 'text', rows: 2 })], preview: { select: { title: 'text' }, prepare: ({ title }) => ({ title: `Notice: ${title}` }) } }),
    defineArrayMember({
      name: 'simpleTable', title: 'Table', type: 'object',
      fields: [
        defineField({ name: 'head', type: 'array', of: [defineArrayMember({ type: 'string' })] }),
        defineField({ name: 'rows', type: 'array', of: [defineArrayMember({ type: 'object', name: 'tableRow', fields: [defineField({ name: 'cells', type: 'array', of: [defineArrayMember({ type: 'string' })] })], preview: { select: { c: 'cells' }, prepare: ({ c }) => ({ title: (c || []).join(' · ') }) } })] }),
        defineField({ name: 'cta', type: 'string', title: 'Button under the table', description: 'Used on Cookies: "Cookie settings" opens the consent panel.' }),
      ],
      preview: { select: { h: 'head' }, prepare: ({ h }) => ({ title: `Table: ${(h || []).join(' · ')}` }) },
    }),
  ],
});

/** Short rich line with italic (drop intro). */
export const lineText = defineType({
  name: 'lineText',
  title: 'Text with italic',
  type: 'array',
  of: [defineArrayMember({ type: 'block', styles: [{ title: 'Paragraph', value: 'normal' }], lists: [], marks: { decorators: [{ title: 'Italic', value: 'em' }], annotations: [] } })],
});

export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.max(65) }),
    defineField({ name: 'description', type: 'text', rows: 2, validation: (r) => r.max(160) }),
    defineField({ name: 'image', type: 'image', title: 'Share image (1200×630)' }),
    defineField({ name: 'noindex', type: 'boolean', initialValue: false }),
  ],
});

export const objects = [photo, linkItem, titledText, qa, sizeGuide, prose, lineText, seo];
