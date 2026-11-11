import type { APIRoute } from 'astro';
import { sanityConfigured, sanityFetch } from '../lib/sanity/client';
import { absoluteUrl } from '../lib/seo';

type Row = { path: string; lastmod?: string };

function xmlEscape(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function urlEntry(loc: string, lastmod?: string): string {
  const lm = lastmod ? `\n    <lastmod>${xmlEscape(lastmod.slice(0, 10))}</lastmod>` : '';
  return `  <url>\n    <loc>${xmlEscape(loc)}</loc>${lm}\n  </url>`;
}

const STATIC: Row[] = [
  { path: '/' },
  { path: '/pieces' },
  { path: '/story' },
  { path: '/client-care/shipping' },
  { path: '/client-care/returns' },
  { path: '/client-care/faq' },
  { path: '/client-care/contact' },
  { path: '/legal/terms' },
  { path: '/legal/privacy' },
  { path: '/legal/cookies' },
];

export const GET: APIRoute = async () => {
  const rows: Row[] = [...STATIC];

  if (sanityConfigured()) {
    try {
      type Bundle = {
        drops?: { slug?: string; _updatedAt?: string }[];
        pieces?: { handle?: string; _updatedAt?: string }[];
        categories?: { slug?: string; _updatedAt?: string }[];
        policies?: { slug?: string; section?: string; _updatedAt?: string }[];
      };
      const data = await sanityFetch<Bundle>(`{
        "drops": *[_type == "drop" && defined(slug.current) && !(seo.noindex == true)]{"slug": slug.current, _updatedAt},
        "pieces": *[_type == "piece" && !(seo.noindex == true)]{
          "handle": coalesce(product->store.slug.current, handle.current),
          _updatedAt
        },
        "categories": *[_type == "category" && defined(slug.current) && !(seo.noindex == true)]{"slug": slug.current, _updatedAt},
        "policies": *[_type == "infoPage" && defined(slug.current) && !(seo.noindex == true)]{"slug": slug.current, section, _updatedAt}
      }`);

      for (const d of data.drops || []) {
        if (d.slug) rows.push({ path: `/drops/${d.slug}`, lastmod: d._updatedAt });
      }
      for (const p of data.pieces || []) {
        if (p.handle) rows.push({ path: `/pieces/${p.handle}`, lastmod: p._updatedAt });
      }
      for (const c of data.categories || []) {
        if (c.slug) rows.push({ path: `/categories/${c.slug}`, lastmod: c._updatedAt });
      }
      for (const pol of data.policies || []) {
        if (!pol.slug) continue;
        const base = pol.section === 'legal' ? '/legal' : '/client-care';
        rows.push({ path: `${base}/${pol.slug}`, lastmod: pol._updatedAt });
      }
    } catch {
      /* keep static set */
    }
  }

  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    if (seen.has(r.path)) return false;
    seen.add(r.path);
    return true;
  });

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...unique.map((r) => urlEntry(absoluteUrl(r.path), r.lastmod)),
    '</urlset>',
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=600',
    },
  });
};
