/**
 * Every canonical page of the site, with its title, description and the
 * date its text last changed. One list feeds the pages' <head>, the
 * sitemap, llms.txt / llms-full.txt and the OG images, so they can't drift.
 */
import { getTools, getCategories, toolUpdated, latest, domainOf, type Tool, type Category } from '~/lib/data';
import { fitTitle, fitDescription } from '~/lib/seo';
import { useTranslations, loc, langs, plural, type Lang } from '~/i18n';
import { SITE, AUTHOR } from '~/site.config';

/** /author/<slug>/: the author's page */
export const AUTHOR_SLUG = 'ehroz';
import { alternativesOf } from '~/lib/related';
import { tagCounts } from '~/lib/tags';
import { getArticles, type Article } from '~/lib/articles';
import { getPopular } from '~/lib/popular';
import { privacy, cookies, disclaimer, editorial, supportFaq, type Section } from '~/lib/texts';

export type PageKind =
  | 'home' | 'categories' | 'category' | 'tool' | 'alternatives' | 'badge' | 'for-makers' | 'about' | 'editorial' | 'contact' | 'submit' | 'wall' | 'newsletter' | 'pro' | 'api'
  | 'tags' | 'popular' | 'support' | 'privacy' | 'cookies' | 'disclaimer'
  | 'blog' | 'article' | 'author';

export interface PageEntry {
  key: string;
  kind: PageKind;
  /** language-free path, with trailing slash */
  path: string;
  updated: Date;
  title: Record<Lang, string>;
  description: Record<Lang, string>;
  /** H1 text, for llms-full.txt */
  heading: Record<Lang, string>;
  /** plain text body, for llms-full.txt */
  text: Record<Lang, string>;
  /** OG image path without extension, per language */
  og: Record<Lang, string>;
  tool?: Tool;
  category?: Category;
  article?: Article;
}

/** Dates the hand-written pages last changed. Update when you edit their text. */
export const PAGE_UPDATED = {
  about: '2026-11-13',
  editorial: '2026-11-23',
  contact: '2026-11-13',
  submit: '2026-11-13',
  wall: '2026-11-13',
  badge: '2026-11-22',
  'for-makers': '2026-11-22',
  newsletter: '2026-11-21',
  pro: '2026-11-21',
  api: '2026-11-21',
  support: '2026-11-22',
  privacy: '2026-11-23',
  cookies: '2026-11-23',
  disclaimer: '2026-11-22',
};

const per = <T,>(fn: (lang: Lang) => T) => Object.fromEntries(langs.map((l) => [l, fn(l)])) as Record<Lang, T>;
const brand = (s: string) => `${s} · ${SITE.name}`;

let cache: Promise<PageEntry[]> | undefined;
export function getPages() {
  return (cache ??= build());
}

export async function getPage(key: string) {
  const page = (await getPages()).find((p) => p.key === key);
  if (!page) throw new Error(`No page "${key}" in routes.ts`);
  return page;
}

const CONTENT_UPDATED = new Date('2026-11-27');

async function build(): Promise<PageEntry[]> {
  const [tools, categories, articles] = await Promise.all([getTools(), getCategories(), getArticles()]);
  const allUpdated = latest([CONTENT_UPDATED, ...tools.map(toolUpdated), ...categories.map((c) => c.data.updated)]);
  const pages: PageEntry[] = [];
  const T = per((l) => useTranslations(l));
  const catName = (id: string, l: Lang) => loc(categories.find((c) => c.id === id)!.data.name, l);

  pages.push({
    key: 'home',
    kind: 'home',
    path: '/',
    updated: allUpdated,
    title: per((l) => fitTitle(T[l]('site.title'))),
    description: per((l) => fitDescription(T[l]('site.description'))),
    heading: per((l) => T[l](`hero.title.${plural(l, tools.length)}`, { count: tools.length })),
    text: per((l) => T[l]('hero.sub', { categories: categories.length })),
    og: per((l) => `og/${l}/home`),
  });

  pages.push({
    key: 'categories',
    kind: 'categories',
    path: '/categories/',
    updated: latest(categories.map((c) => c.data.updated)),
    title: per((l) => fitTitle(brand(T[l]('categories.metaTitle')), T[l]('categories.metaTitle'))),
    description: per((l) => fitDescription(T[l]('categories.lead', { count: categories.length }))),
    heading: per((l) => T[l]('categories.title')),
    text: per((l) =>
      categories.map((c) => `${loc(c.data.name, l)}: ${loc(c.data.description, l)}`).join('\n'),
    ),
    og: per((l) => `og/${l}/categories`),
  });

  for (const c of categories) {
    const inCat = tools.filter((x) => x.data.category === c.id);
    pages.push({
      key: `category/${c.id}`,
      kind: 'category',
      path: `/category/${c.id}/`,
      updated: latest([c.data.updated, ...inCat.map(toolUpdated)]),
      title: per((l) => {
        const t = T[l]('category.title', { category: loc(c.data.name, l) });
        return fitTitle(brand(t), t);
      }),
      description: per((l) =>
        fitDescription(`${loc(c.data.description, l)} ${inCat.slice(0, 4).map((x) => x.data.name).join(', ')}.`),
      ),
      heading: per((l) => loc(c.data.name, l)),
      text: per((l) => `${loc(c.data.description, l)}\n` + inCat.map((x) => `- ${x.data.name}: ${loc(x.data.summary, l)}`).join('\n')),
      og: per((l) => `og/${l}/category/${c.id}`),
      category: c,
    });
  }

  for (const tool of tools) {
    const d = tool.data;
    pages.push({
      key: `tool/${tool.id}`,
      kind: 'tool',
      path: `/tool/${tool.id}/`,
      updated: latest([CONTENT_UPDATED, toolUpdated(tool)]),
      title: per((l) => {
        const t = T[l]('tool.title', { name: d.name, summary: loc(d.summary, l).replace(/\.$/, '') });
        return fitTitle(brand(t), t);
      }),
      description: per((l) => fitDescription(loc(d.description, l), loc(d.summary, l))),
      heading: per(() => d.name),
      text: per((l) =>
        [
          loc(d.description, l),
          `${T[l]('tool.category')}: ${catName(d.category, l)}`,
          `${T[l]('tool.pricing')}: ${T[l](`pricing.${d.pricing}`)}${d.openSource ? ', ' + T[l]('pricing.openSource') : ''}`,
          d.platforms.length ? `${T[l]('tool.platforms')}: ${d.platforms.join(', ')}` : '',
          `URL: ${d.url} (${domainOf(d.url)})`,
        ]
          .filter(Boolean)
          .join('\n'),
      ),
      og: per((l) => `og/${l}/tool/${tool.id}`),
      tool,
    });
  }

  // "Alternatives to X": only for sites with at least 2 alternatives, so no page is thin
  for (const tool of tools) {
    const alts = alternativesOf(tool, tools);
    if (alts.length < 2) continue;
    const d = tool.data;
    const lastmod = latest([CONTENT_UPDATED, toolUpdated(tool), ...alts.map(toolUpdated)]);
    pages.push({
      key: `alternatives/${tool.id}`,
      kind: 'alternatives',
      path: `/alternatives/${tool.id}/`,
      updated: lastmod,
      title: per((l) => {
        const t = T[l]('alt.title', { name: d.name, count: alts.length });
        return fitTitle(brand(t), t);
      }),
      description: per((l) =>
        fitDescription(T[l]('alt.description', { name: d.name, count: alts.length, names: alts.slice(0, 5).map((x) => x.data.name).join(', ') })),
      ),
      heading: per((l) => T[l]('alt.h1', { name: d.name })),
      text: per((l) => alts.map((x) => `- ${x.data.name}: ${loc(x.data.summary, l)}`).join('\n')),
      og: per((l) => `og/${l}/alternatives/${tool.id}`),
      tool,
    });
  }

  const simple = (key: keyof typeof PAGE_UPDATED, h1: string, body: (l: Lang) => string) =>
    pages.push({
      key,
      kind: key,
      path: `/${key}/`,
      updated: new Date(PAGE_UPDATED[key]),
      title: per((l) => fitTitle(T[l](`${key}.title` as any))),
      description: per((l) => fitDescription(T[l](`${key}.description` as any))),
      heading: per((l) => T[l](h1 as any).replace(/<br\s*\/?>/g, ' ')),
      text: per(body),
      og: per((l) => `og/${l}/${key}`),
    });
  const sectionsText = (list: Section[]) =>
    list.map((x) => [x.h, ...(x.p ?? []), ...(x.list ?? []).map((i) => `- ${i}`), ...(x.rows ?? []).map((r) => `- ${r.k}: ${r.v}`)].join('\n')).join('\n\n');

  simple('about', 'about.h1', (l) => T[l]('about.lead'));
  simple('contact', 'contact.h1', (l) => T[l]('contact.description'));
  simple('submit', 'submit.h1', (l) => T[l]('submit.description'));
  simple('wall', 'wall.h1', (l) => T[l]('wall.description'));
  simple('badge', 'badge.h1', (l) => T[l]('badge.lead'));
  simple('for-makers', 'for-makers.h1', (l) => T[l]('for-makers.lead'));
  simple('newsletter', 'newsletter.h1', (l) => T[l]('newsletter.lead'));
  simple('pro', 'pro.h1', (l) => T[l]('pro.lead'));
  simple('api', 'api.h1', (l) => T[l]('api.lead'));

  const tags = tagCounts(tools);
  pages.push({
    key: 'tags',
    kind: 'tags',
    path: '/tags/',
    updated: allUpdated,
    title: per((l) => fitTitle(T[l]('tags.title'))),
    description: per((l) => fitDescription(T[l]('tags.description'))),
    heading: per((l) => T[l]('tags.h1')),
    text: per(() => tags.map((x) => `${x.tag} (${x.count})`).join(', ')),
    og: per((l) => `og/${l}/tags`),
  });

  const popular = getPopular(tools);
  pages.push({
    key: 'popular',
    kind: 'popular',
    path: '/popular/',
    updated: popular.updated ?? new Date('2026-11-22'),
    title: per((l) => fitTitle(T[l]('popular.title'))),
    description: per((l) => fitDescription(T[l]('popular.description'))),
    heading: per((l) => T[l]('popular.h1')),
    text: per((l) =>
      popular.ranked.length
        ? popular.ranked.map((x, i) => `${i + 1}. ${x.tool.data.name}: ${loc(x.tool.data.summary, l)}`).join('\n')
        : T[l]('popular.leadEmpty'),
    ),
    og: per((l) => `og/${l}/popular`),
  });

  simple('support', 'support.h1', (l) => supportFaq(l).map((f) => `${f.q}\n${f.a}`).join('\n\n'));
  simple('editorial', 'editorial.h1', (l) => `${T[l]('editorial.lead')}\n\n${sectionsText(editorial(l))}`);
  simple('privacy', 'privacy.h1', (l) => `${T[l]('privacy.lead')}\n\n${sectionsText(privacy(l))}`);
  simple('cookies', 'cookies.h1', (l) => `${T[l]('cookies.lead')}\n\n${sectionsText(cookies(l))}`);
  simple('disclaimer', 'disclaimer.h1', (l) => `${T[l]('disclaimer.lead')}\n\n${sectionsText(disclaimer(l))}`);

  // Blog: the list and one page per article (src/content/articles/)
  if (articles.length) {
    pages.push({
      key: 'blog',
      kind: 'blog',
      path: '/blog/',
      updated: latest(articles.map((a) => a.updated)),
      title: per((l) => fitTitle(T[l]('blog.title'))),
      description: per((l) => fitDescription(T[l]('blog.description'))),
      heading: per((l) => T[l]('blog.h1')),
      text: per((l) => articles.map((a) => `- ${a.entry[l].data.title}: ${a.entry[l].data.description}`).join('\n')),
      og: per((l) => `og/${l}/blog`),
    });
    pages.push({
      key: 'author',
      kind: 'author',
      path: `/author/${AUTHOR_SLUG}/`,
      updated: latest(articles.map((a) => a.updated)),
      title: per((l) => fitTitle(T[l]('author.title'))),
      description: per((l) => fitDescription(T[l]('author.description'))),
      heading: per((l) => (l === 'ru' ? AUTHOR.alternateName[0] : AUTHOR.name)),
      text: per((l) => `${T[l]('article.authorBio')}\n` + articles.map((a) => `- ${a.entry[l].data.title}`).join('\n')),
      og: per((l) => `og/${l}/author`),
    });
    for (const a of articles) {
      pages.push({
        key: `blog/${a.slug}`,
        kind: 'article',
        path: `/blog/${a.slug}/`,
        updated: a.updated,
        title: per((l) => fitTitle(brand(a.entry[l].data.title), a.entry[l].data.title)),
        description: per((l) => fitDescription(a.entry[l].data.description)),
        heading: per((l) => a.entry[l].data.title),
        text: per((l) => a.text[l]),
        og: per((l) => `og/${l}/blog/${a.slug}`),
        article: a,
      });
    }
  }

  return pages;
}
