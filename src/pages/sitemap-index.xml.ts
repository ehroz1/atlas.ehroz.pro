import type { APIRoute } from 'astro';
import { getPages } from '~/lib/routes';
import { absUrl } from '~/lib/seo';
import { latest } from '~/lib/data';

export const GET: APIRoute = async () => {
  const pages = await getPages();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${absUrl('/sitemap-0.xml')}</loc><lastmod>${latest(pages.map((p) => p.updated)).toISOString().slice(0, 10)}</lastmod></sitemap>
</sitemapindex>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
