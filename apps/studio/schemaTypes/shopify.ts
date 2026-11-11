/**
 * Documents written by Sanity Connect for Shopify (direct sync). Shopify is the source of truth:
 * everything under `store` is read-only and overwritten on every sync. Field names follow the
 * Sanity Connect reference (product = shopifyProduct-<id>, productVariant = shopifyProductVariant-<id>,
 * collection = shopifyCollection-<id>). Stock quantities are NOT synced: the site reads them live
 * from the Storefront API (docs/COMMERCE.md). Editorial content lives in `piece`, which references `product`.
 */
import { defineArrayMember, defineField, defineType } from 'sanity';

const ro = { readOnly: true } as const;
const shop = defineField({ name: 'shop', type: 'object', ...ro, fields: [defineField({ name: 'domain', type: 'string' })] });
const metafields = defineField({ name: 'metafields', type: 'array', ...ro, of: [defineArrayMember({ type: 'object', name: 'metafield', fields: [
  defineField({ name: 'namespace', type: 'string' }), defineField({ name: 'key', type: 'string' }), defineField({ name: 'type', type: 'string' }),
  defineField({ name: 'value', type: 'text', description: 'Number, string, array or object as synced (shown as text here).' })] })] });
const times = [defineField({ name: 'createdAt', type: 'string', ...ro }), defineField({ name: 'updatedAt', type: 'string', ...ro }), defineField({ name: 'shopifyTriggeredAt', type: 'string', ...ro })];

export const shopifyProductStore = defineType({
  name: 'shopifyProduct', title: 'Shopify', type: 'object', ...ro,
  fields: [
    ...times,
    defineField({ name: 'status', type: 'string' }), defineField({ name: 'isDeleted', type: 'boolean' }),
    defineField({ name: 'title', type: 'string' }), defineField({ name: 'id', type: 'number' }), defineField({ name: 'gid', type: 'string' }),
    defineField({ name: 'slug', type: 'slug', description: 'Shopify handle' }),
    defineField({ name: 'descriptionHtml', type: 'text' }), defineField({ name: 'productType', type: 'string' }), defineField({ name: 'vendor', type: 'string' }),
    defineField({ name: 'tags', type: 'string' }),
    defineField({ name: 'priceRange', type: 'object', fields: [defineField({ name: 'minVariantPrice', type: 'number' }), defineField({ name: 'maxVariantPrice', type: 'number' })] }),
    defineField({ name: 'previewImageUrl', type: 'string' }),
    defineField({ name: 'options', type: 'array', of: [defineArrayMember({ type: 'object', name: 'option', fields: [defineField({ name: 'name', type: 'string' }), defineField({ name: 'values', type: 'array', of: [defineArrayMember({ type: 'string' })] })] })] }),
    defineField({ name: 'variants', type: 'array', of: [defineArrayMember({ type: 'reference', to: [{ type: 'productVariant' }], weak: true })] }),
    metafields, shop,
  ],
});

export const shopifyProductVariantStore = defineType({
  name: 'shopifyProductVariant', title: 'Shopify', type: 'object', ...ro,
  fields: [
    ...times,
    defineField({ name: 'status', type: 'string' }), defineField({ name: 'isDeleted', type: 'boolean' }),
    defineField({ name: 'title', type: 'string' }), defineField({ name: 'sku', type: 'string' }), defineField({ name: 'barcode', type: 'string' }),
    defineField({ name: 'id', type: 'number' }), defineField({ name: 'gid', type: 'string' }),
    defineField({ name: 'productId', type: 'number' }), defineField({ name: 'productGid', type: 'string' }),
    defineField({ name: 'price', type: 'number' }), defineField({ name: 'compareAtPrice', type: 'number' }),
    defineField({ name: 'inventory', type: 'object', description: 'Availability flag only; quantities come live from the Storefront API.', fields: [defineField({ name: 'isAvailable', type: 'boolean' }), defineField({ name: 'policy', type: 'string' })] }),
    defineField({ name: 'option1', type: 'string' }), defineField({ name: 'option2', type: 'string' }), defineField({ name: 'option3', type: 'string' }),
    defineField({ name: 'previewImageUrl', type: 'string' }), shop,
  ],
});

export const shopifyCollectionStore = defineType({
  name: 'shopifyCollection', title: 'Shopify', type: 'object', ...ro,
  fields: [
    ...times,
    defineField({ name: 'isDeleted', type: 'boolean' }), defineField({ name: 'title', type: 'string' }), defineField({ name: 'id', type: 'number' }), defineField({ name: 'gid', type: 'string' }),
    defineField({ name: 'slug', type: 'slug', description: 'Shopify handle' }), defineField({ name: 'descriptionHtml', type: 'text' }),
    defineField({ name: 'imageUrl', type: 'string' }), defineField({ name: 'sortOrder', type: 'string' }), defineField({ name: 'disjunctive', type: 'boolean' }),
    defineField({ name: 'rules', type: 'array', of: [defineArrayMember({ type: 'object', name: 'rule', fields: [defineField({ name: 'column', type: 'string' }), defineField({ name: 'condition', type: 'string' }), defineField({ name: 'relation', type: 'string' })] })] }),
    metafields, shop,
  ],
});

const statusLabel = (s?: { status?: string; isDeleted?: boolean }) => (s?.isDeleted ? 'Deleted in Shopify' : s?.status ? s.status.toLowerCase() : '');

export const product = defineType({
  name: 'product', title: 'Shopify product', type: 'document',
  fields: [defineField({ name: 'store', type: 'shopifyProduct', title: 'Shopify (synced, read-only)' })],
  preview: { select: { title: 'store.title', handle: 'store.slug.current', status: 'store.status', del: 'store.isDeleted', min: 'store.priceRange.minVariantPrice' },
    prepare: ({ title, handle, status, del, min }) => ({ title: title || handle, subtitle: [handle, statusLabel({ status, isDeleted: del }), min != null ? `£${min}` : ''].filter(Boolean).join(' · ') }) },
});

export const productVariant = defineType({
  name: 'productVariant', title: 'Shopify variant', type: 'document',
  fields: [defineField({ name: 'store', type: 'shopifyProductVariant', title: 'Shopify (synced, read-only)' })],
  preview: { select: { title: 'store.title', sku: 'store.sku', ok: 'store.inventory.isAvailable' }, prepare: ({ title, sku, ok }) => ({ title, subtitle: [sku, ok === false ? 'unavailable' : ''].filter(Boolean).join(' · ') }) },
});

export const collection = defineType({
  name: 'collection', title: 'Shopify collection', type: 'document',
  fields: [defineField({ name: 'store', type: 'shopifyCollection', title: 'Shopify (synced, read-only)' })],
  preview: { select: { title: 'store.title', handle: 'store.slug.current' }, prepare: ({ title, handle }) => ({ title, subtitle: handle }) },
});

export const SYNCED_TYPES = ['product', 'productVariant', 'collection'];
export const shopifyTypes = [shopifyProductStore, shopifyProductVariantStore, shopifyCollectionStore, product, productVariant, collection];
