/** robots.txt with the sitemap's full address (it depends on the deploy URL). */
import type { APIRoute } from 'astro';
import { abs } from '~/lib/feed';

export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${abs(site, '/sitemap.xml')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
