/**
 * XML Sitemap builder.
 * - Splits sitemaps by content type (pages, categories, tools, articles).
 * - Only canonical 200 pages (from routes.ts), never /en/ aliases or noindex pages.
 * - Includes hreflang alternates (en, ru, x-default) and real content lastmod dates.
 * - Includes <image:image> entries for tools and articles.
 */
import type { PageEntry, PageKind } from '~/lib/routes';
import { absUrl } from '~/lib/seo';
import { langs, defaultLang, type Lang } from '~/i18n';

import { getArticles } from '~/lib/articles';

export const NEWS_WINDOW_MS = 2 * 864e5;

export async function getFreshNewsArticles(now = Date.now()) {
  return (await getArticles()).filter((a) => now - a.published.getTime() <= NEWS_WINDOW_MS);
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const SITEMAP_GROUPS: Record<'pages' | 'categories' | 'tools' | 'articles', Set<PageKind>> = {
  pages: new Set<PageKind>([
    'home', 'about', 'editorial', 'contact', 'submit', 'wall', 'badge', 'for-makers',
    'newsletter', 'pro', 'api', 'tags', 'popular', 'support',
    'privacy', 'cookies', 'disclaimer', 'author',
  ]),
  categories: new Set<PageKind>(['categories', 'category']),
  tools: new Set<PageKind>(['tool', 'alternatives']),
  articles: new Set<PageKind>(['blog', 'article']),
};

function imagesFor(p: PageEntry, lang: Lang): { loc: string; title: string }[] {
  const list: { loc: string; title: string }[] = [
    { loc: absUrl(`/${p.og[lang]}.png`, defaultLang), title: p.title[lang] },
  ];
  if (p.kind === 'article' && p.article) {
    list.unshift({
      loc: absUrl(`/cover/${lang}/${p.article.slug}.png`, defaultLang),
      title: p.article.entry[lang].data.title,
    });
  }
  return list;
}

export function renderUrlSet(pages: PageEntry[], opts: { images?: boolean } = {}): Response {
  const withImages = !!opts.images;
  const urls = pages.flatMap((p) =>
    langs.map((lang) => {
      const alts = [
        ...langs.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${esc(absUrl(p.path, l))}"/>`),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(absUrl(p.path, defaultLang))}"/>`,
      ];
      const imgs = withImages
        ? imagesFor(p, lang).map(
            (img) =>
              `    <image:image><image:loc>${esc(img.loc)}</image:loc><image:title>${esc(img.title)}</image:title></image:image>`,
          )
        : [];
      return `  <url>
    <loc>${esc(absUrl(p.path, lang))}</loc>
    <lastmod>${p.updated.toISOString().slice(0, 10)}</lastmod>
${alts.join('\n')}${imgs.length ? '\n' + imgs.join('\n') : ''}
  </url>`;
    }),
  );
  const nsImage = withImages ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : '';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"${nsImage}>
${urls.join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
