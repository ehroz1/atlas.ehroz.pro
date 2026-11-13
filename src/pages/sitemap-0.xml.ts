/**
 * Every canonical page in every language, with hreflang alternates.
 * lastmod is the date the page's text changed (`updated` in the data),
 * not the build date.
 */
import type { APIRoute } from 'astro';
import { getPages } from '~/lib/routes';
import { absUrl } from '~/lib/seo';
import { langs, defaultLang } from '~/i18n';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export const GET: APIRoute = async () => {
  const pages = await getPages();
  const urls = pages.flatMap((p) =>
    langs.map((lang) => {
      const alts = [
        ...langs.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${esc(absUrl(p.path, l))}"/>`),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(absUrl(p.path, defaultLang))}"/>`,
      ];
      return `  <url>
    <loc>${esc(absUrl(p.path, lang))}</loc>
    <lastmod>${p.updated.toISOString().slice(0, 10)}</lastmod>
${alts.join('\n')}
  </url>`;
    }),
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
