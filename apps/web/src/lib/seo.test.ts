import { describe, expect, it, afterEach } from 'vitest';
import {
  absoluteUrl,
  availabilityUrl,
  organizationJsonLd,
  productJsonLd,
  shouldNoindex,
  websiteJsonLd,
} from './seo';

describe('seo helpers', () => {
  afterEach(() => {
    delete process.env.VERCEL_ENV;
    delete process.env.PUBLIC_SITE_URL;
  });

  it('builds absolute URLs from PUBLIC_SITE_URL', () => {
    process.env.PUBLIC_SITE_URL = 'https://style.nevma.test/';
    expect(absoluteUrl('/pieces/cap')).toBe('https://style.nevma.test/pieces/cap');
    expect(absoluteUrl('https://cdn.example/x.jpg')).toBe('https://cdn.example/x.jpg');
  });

  it('noindexes preview deploys and private routes', () => {
    expect(shouldNoindex({ routeNoindex: true })).toBe(true);
    expect(shouldNoindex({ seoNoindex: true })).toBe(true);
    process.env.VERCEL_ENV = 'preview';
    expect(shouldNoindex({})).toBe(true);
    process.env.VERCEL_ENV = 'production';
    expect(shouldNoindex({})).toBe(false);
  });

  it('maps edition state to schema.org availability', () => {
    expect(availabilityUrl('upcoming')).toContain('PreOrder');
    expect(availabilityUrl('sold-out')).toContain('SoldOut');
    expect(availabilityUrl('available')).toContain('InStock');
    expect(availabilityUrl('last-piece')).toContain('InStock');
  });

  it('builds Organization, WebSite and Product JSON-LD', () => {
    expect(organizationJsonLd({ email: 'care@test' })['@type']).toBe('Organization');
    expect(websiteJsonLd({})['@type']).toBe('WebSite');
    const product = productJsonLd({
      name: 'Suede Cap',
      url: 'https://style.nevma.test/pieces/cap',
      priceAmount: '120.00',
      priceCurrency: 'EUR',
      state: 'available',
      sku: 'NS-CAP',
    });
    expect(product['@type']).toBe('Product');
    expect((product.offers as { availability: string }).availability).toContain('InStock');
    expect((product.offers as { price: string }).price).toBe('120.00');
  });
});
