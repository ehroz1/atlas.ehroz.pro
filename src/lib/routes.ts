/**
 * Every canonical page of the site, with its title, description and the
 * date its text last changed. One list feeds the pages' <head>, the
 * sitemap, llms.txt / llms-full.txt and the OG images, so they can't drift.
 */
import { getTools, getCategories, toolUpdated, latest, domainOf, type Tool, type Category } from '~/lib/data';
import { fitTitle, fitDescription } from '~/lib/seo';
import { useTranslations, loc, langs, type Lang } from '~/i18n';
import { SITE } from '~/site.config';

export type PageKind = 'home' | 'categories' | 'category' | 'tool' | 'about' | 'contact' | 'submit' | 'wall';

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
}

/** Dates the hand-written pages last changed. Update when you edit their text. */
export const PAGE_UPDATED = {
  about: '2026-11-13',
  contact: '2026-11-13',
  submit: '2026-11-13',
  wall: '2026-11-13',
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

async function build(): Promise<PageEntry[]> {
  const [tools, categories] = await Promise.all([getTools(), getCategories()]);
  const allUpdated = latest([...tools.map(toolUpdated), ...categories.map((c) => c.data.updated)]);
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
    heading: per((l) => T[l]('hero.title', { count: tools.length })),
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
      updated: toolUpdated(tool),
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

  const simple = (key: 'about' | 'contact' | 'submit' | 'wall', h1: string, body: (l: Lang) => string) =>
    pages.push({
      key,
      kind: key,
      path: `/${key}/`,
      updated: new Date(PAGE_UPDATED[key]),
      title: per((l) => fitTitle(T[l](`${key}.title`))),
      description: per((l) => fitDescription(T[l](`${key}.description`))),
      heading: per((l) => T[l](h1 as any).replace(/<br\s*\/?>/g, ' ')),
      text: per(body),
      og: per((l) => `og/${l}/${key}`),
    });

  simple('about', 'about.h1', (l) => T[l]('about.lead'));
  simple('contact', 'contact.h1', (l) => T[l]('contact.description'));
  simple('submit', 'submit.h1', (l) => T[l]('submit.description'));
  simple('wall', 'wall.h1', (l) => T[l]('wall.description'));

  return pages;
}
