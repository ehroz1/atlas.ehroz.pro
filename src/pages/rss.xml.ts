/** RSS 2.0 feed of the newest sites, at /rss.xml. */
import type { APIRoute } from 'astro';
import { getTools, getCategories, domainOf } from '~/lib/data';
import { abs, xml, byNewest } from '~/lib/feed';
import { useTranslations, loc } from '~/i18n';

const LIMIT = 50;

export const GET: APIRoute = async ({ site }) => {
  const t = useTranslations('en');
  const [tools, categories] = await Promise.all([getTools(), getCategories()]);
  const names = new Map(categories.map((c) => [c.id, loc(c.data.name)]));
  const items = [...tools].sort(byNewest).slice(0, LIMIT);
  const home = abs(site, '/');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${xml(t('rss.title'))}</title>
<link>${home}</link>
<description>${xml(t('site.description'))}</description>
<language>en</language>
<lastBuildDate>${(items[0]?.data.added ?? new Date()).toUTCString()}</lastBuildDate>
<atom:link href="${abs(site, '/rss.xml')}" rel="self" type="application/rss+xml"/>
${items
  .map((x) => {
    const link = abs(site, `/tool/${x.id}/`);
    const desc = `${loc(x.data.description)} (${domainOf(x.data.url)})`;
    return `<item>
<title>${xml(x.data.name)} — ${xml(loc(x.data.summary))}</title>
<link>${link}</link>
<guid isPermaLink="true">${link}</guid>
<pubDate>${x.data.added.toUTCString()}</pubDate>
<category>${xml(names.get(x.data.category) ?? x.data.category)}</category>
<description>${xml(desc)}</description>
</item>`;
  })
  .join('\n')}
</channel>
</rss>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
