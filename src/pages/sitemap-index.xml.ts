import type { APIRoute } from 'astro';
import { getPages, type PageEntry } from '~/lib/routes';
import { SITEMAP_GROUPS } from '~/lib/sitemap';
import { absUrl } from '~/lib/seo';
import { latest } from '~/lib/data';

const mod = (list: PageEntry[]) =>
  list.length ? `<lastmod>${latest(list.map((p) => p.updated)).toISOString().slice(0, 10)}</lastmod>` : '';

export const GET: APIRoute = async () => {
  const pages = await getPages();
  const byGroup = (g: keyof typeof SITEMAP_GROUPS) => pages.filter((p) => SITEMAP_GROUPS[g].has(p.kind));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${absUrl('/sitemap-pages.xml')}</loc>${mod(byGroup('pages'))}</sitemap>
  <sitemap><loc>${absUrl('/sitemap-categories.xml')}</loc>${mod(byGroup('categories'))}</sitemap>
  <sitemap><loc>${absUrl('/sitemap-tools.xml')}</loc>${mod(byGroup('tools'))}</sitemap>
  <sitemap><loc>${absUrl('/sitemap-articles.xml')}</loc>${mod(byGroup('articles'))}</sitemap>
  <sitemap><loc>${absUrl('/sitemap-news.xml')}</loc></sitemap>
</sitemapindex>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
