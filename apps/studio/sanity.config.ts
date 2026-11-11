import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes, SINGLETONS, SYNCED_TYPES, SITE_WRITTEN_TYPES } from './schemaTypes';
import { structure } from './structure';

const singletonIds = new Set(SINGLETONS.map((s) => s.id));
const synced = new Set([...SYNCED_TYPES, ...SITE_WRITTEN_TYPES]);

export default defineConfig({
  name: 'nevma-style',
  title: 'NEVMA Style',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'replace-me',
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [structureTool({ structure }), visionTool({ defaultApiVersion: '2026-10-01' })],
  schema: {
    types: schemaTypes,
    // singletons cannot be created from the "new document" menu
    // singletons, Shopify-synced and site-written types cannot be created by hand
    templates: (prev) => prev.filter((t) => !singletonIds.has(t.schemaType) && !synced.has(t.schemaType)),
  },
  document: {
    actions: (prev, ctx) =>
      singletonIds.has(ctx.schemaType) || SYNCED_TYPES.includes(ctx.schemaType)
        ? prev.filter((a) => !['duplicate', 'delete', 'unpublish'].includes(a.action ?? ''))
        : SITE_WRITTEN_TYPES.includes(ctx.schemaType)
          ? prev.filter((a) => a.action !== 'duplicate') // staff may delete spam or a customer's data on request
          : prev,
  },
});
