/**
 * Google News sitemap: articles published in the last 2 days (Google only
 * reads those from a news sitemap), in every language. Rebuilt on every
 * deploy; between articles it is a valid, empty <urlset>.
 * https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
 */
import type { APIRoute } from 'astro';
import { getFreshNewsArticles } from '~/lib/sitemap';
import { absUrl } from '~/lib/seo';
import { xml } from '~/lib/feed';
import { SITE } from '~/site.config';
import { langs } from '~/i18n';

export const GET: APIRoute = async () => {
  const fresh = await getFreshNewsArticles();
  const urls = fresh.flatMap((a) =>
    langs.map(
      (lang) => `  <url>
    <loc>${absUrl(`/blog/${a.slug}/`, lang)}</loc>
    <news:news>
      <news:publication><news:name>${xml(SITE.name)}</news:name><news:language>${lang}</news:language></news:publication>
      <news:publication_date>${a.published.toISOString().slice(0, 10)}</news:publication_date>
      <news:title>${xml(a.entry[lang].data.title)}</news:title>
    </news:news>
  </url>`,
    ),
  );
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls.join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
