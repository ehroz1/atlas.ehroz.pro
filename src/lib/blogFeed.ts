/**
 * RSS 2.0 feed of the articles, one per language: /blog/rss.xml (English)
 * and /ru/blog/rss.xml. Full text in content:encoded with absolute links,
 * the cover as media:content, so readers, aggregators and Google's
 * "Follow" can use it as is.
 */
import { getArticles } from '~/lib/articles';
import { getCategories } from '~/lib/data';
import { xml } from '~/lib/feed';
import { absUrl } from '~/lib/seo';
import { AUTHOR, SITE } from '~/site.config';
import { useTranslations, loc, langTag, type Lang } from '~/i18n';

const cdata = (s: string) => `<![CDATA[${s.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;

export async function blogRss(lang: Lang, site: URL | undefined) {
  const t = useTranslations(lang);
  const origin = new URL(absUrl('/', lang)).origin;
  const [articles, categories] = await Promise.all([getArticles(), getCategories()]);
  const names = new Map(categories.map((c) => [c.id, loc(c.data.name, lang)]));
  const self = absUrl('/blog/rss.xml', lang).replace(/\/$/, '');
  const items = articles.map((a) => {
    const d = a.entry[lang].data;
    const link = absUrl(`/blog/${a.slug}/`, lang);
    const image = absUrl(`/og/${lang}/blog/${a.slug}.png`).replace(/\/$/, '');
    // root-relative links and images → absolute, feed readers have no base URL
    const html = a.html[lang].replace(/(href|src)="\//g, `$1="${origin}/`);
    return `<item>
<title>${xml(d.title)}</title>
<link>${link}</link>
<guid isPermaLink="true">${link}</guid>
<pubDate>${a.published.toUTCString()}</pubDate>
<dc:creator>${xml(AUTHOR.name)}</dc:creator>
${a.categories.map((c) => `<category>${xml(names.get(c) ?? c)}</category>`).join('\n')}
<description>${xml(d.description)}</description>
<content:encoded>${cdata(`<p><img src="${image}" alt="${xml(d.coverAlt ?? '')}" width="1200" height="630"></p>${html}`)}</content:encoded>
<media:content url="${image}" medium="image" type="image/png" width="1200" height="630"/>
</item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
<title>${xml(`${t('nav.blog')} · ${SITE.name}`)}</title>
<link>${absUrl('/blog/', lang)}</link>
<description>${xml(t('blog.description'))}</description>
<language>${langTag[lang]}</language>
<lastBuildDate>${new Date(Math.max(0, ...articles.map((a) => a.updated.getTime()))).toUTCString()}</lastBuildDate>
<atom:link href="${self}" rel="self" type="application/rss+xml"/>
<image><url>${absUrl('/apple-touch-icon.png').replace(/\/$/, '')}</url><title>${xml(SITE.name)}</title><link>${absUrl('/blog/', lang)}</link></image>
${items.join('\n')}
</channel>
</rss>
`;
}
