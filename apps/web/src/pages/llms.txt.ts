import type { APIRoute } from 'astro';
import { siteOrigin } from '../lib/seo';

export const GET: APIRoute = () => {
  const origin = siteOrigin();
  const body = [
    '# NEVMA Style',
    '',
    '> Limited-edition shop for NEVMA, a London music company. Up to five pieces of each colourway; never restocked.',
    '',
    `Site: ${origin}`,
    `Sitemap: ${origin}/sitemap.xml`,
    '',
    '## Primary pages',
    `- Home: ${origin}/`,
    `- All pieces: ${origin}/pieces`,
    `- Story: ${origin}/story`,
    `- Client care: ${origin}/client-care/shipping`,
    '',
    '## Notes for agents',
    '- Prices and stock come from Shopify at request time; editorial copy from Sanity.',
    '- Do not index /bag, /account*, or /wishlist.',
    '- English (UK) only. Times in Europe/London.',
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};
