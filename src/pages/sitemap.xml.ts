/** sitemap.xml: every page except 404. URLs end in "/" like the canonical links. */
import type { APIRoute } from 'astro';
import { getTools, getCategories } from '~/lib/data';
import { abs } from '~/lib/feed';

export const GET: APIRoute = async ({ site }) => {
  const [tools, categories] = await Promise.all([getTools(), getCategories()]);
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const latest = new Date(Math.max(...tools.map((x) => x.data.added.getTime())));

  const pages: { path: string; lastmod?: Date }[] = [
    { path: '/', lastmod: latest },
    { path: '/wall/', lastmod: latest },
    { path: '/categories/', lastmod: latest },
    { path: '/about/' },
    { path: '/submit/' },
    ...categories.map((c) => {
      const inCat = tools.filter((x) => x.data.category === c.id);
      return { path: `/category/${c.id}/`, lastmod: new Date(Math.max(...inCat.map((x) => x.data.added.getTime()))) };
    }),
    ...tools.map((x) => ({ path: `/tool/${x.id}/`, lastmod: x.data.added })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map((p) => `<url><loc>${abs(site, p.path)}</loc>${p.lastmod && !isNaN(+p.lastmod) ? `<lastmod>${day(p.lastmod)}</lastmod>` : ''}</url>`)
  .join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
