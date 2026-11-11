import type { APIRoute } from 'astro';
import { siteOrigin } from '../lib/seo';

export const GET: APIRoute = () => {
  const origin = siteOrigin();
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /bag',
    'Disallow: /account',
    'Disallow: /wishlist',
    'Disallow: /api/',
    '',
    'User-agent: GPTBot',
    'Allow: /',
    '',
    'User-agent: Google-Extended',
    'Allow: /',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};
