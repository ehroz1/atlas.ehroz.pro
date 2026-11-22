/**
 * Articles (blog). Each article is a folder src/content/articles/<slug>/
 * with one Markdown file per language. This module groups them by slug,
 * checks the data against the catalog and prepares the HTML:
 *  - links written as "/tool/figma/" get the language prefix and base,
 *  - links to tools / categories that don't exist stop the build,
 *  - outbound links open with rel="noopener".
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { getTools, getCategories } from '~/lib/data';
import { u } from '~/lib/url';
import { langs, type Lang } from '~/i18n';

export type ArticleEntry = CollectionEntry<'articles'>;

export interface Article {
  slug: string;
  /** per-language entry */
  entry: Record<Lang, ArticleEntry>;
  /** per-language HTML body with localized links */
  html: Record<Lang, string>;
  /** per-language plain text, for llms-full.txt */
  text: Record<Lang, string>;
  published: Date;
  updated: Date;
  tools: string[];
  categories: string[];
}

let cache: Promise<Article[]> | undefined;
export function getArticles() {
  return (cache ??= load());
}

async function load(): Promise<Article[]> {
  const [entries, tools, categories] = await Promise.all([getCollection('articles'), getTools(), getCategories()]);
  const toolIds = new Set(tools.map((t) => t.id));
  const catIds = new Set(categories.map((c) => c.id));

  const bySlug = new Map<string, Partial<Record<Lang, ArticleEntry>>>();
  for (const e of entries) {
    const [slug, lang] = e.id.split('/');
    if (!slug || !lang || !(langs as string[]).includes(lang)) {
      throw new Error(`Article file "${e.id}" must be src/content/articles/<slug>/<${langs.join('|')}>.md`);
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new Error(`Article slug "${slug}": use lowercase latin letters, digits and dashes`);
    bySlug.set(slug, { ...bySlug.get(slug), [lang]: e });
  }

  const list: Article[] = [];
  for (const [slug, parts] of bySlug) {
    const missing = langs.filter((l) => !parts[l]);
    if (missing.length) throw new Error(`Article "${slug}" has no ${missing.join(', ')} version (every article needs all languages)`);
    const entry = parts as Record<Lang, ArticleEntry>;
    // a draft in any language keeps the whole article out of the build
    if (langs.some((l) => entry[l].data.draft)) continue;

    const base = entry[langs[0]].data;
    for (const l of langs) {
      const d = entry[l].data;
      if (d.tools.join() !== base.tools.join()) throw new Error(`Article "${slug}": "tools" differ between languages`);
      for (const id of d.tools) if (!toolIds.has(id)) throw new Error(`Article "${slug}" (${l}): unknown tool "${id}" in tools`);
      for (const id of d.categories) if (!catIds.has(id)) throw new Error(`Article "${slug}" (${l}): unknown category "${id}"`);
    }

    const html = {} as Record<Lang, string>;
    const text = {} as Record<Lang, string>;
    for (const l of langs) {
      const raw = entry[l].rendered?.html ?? '';
      html[l] = localizeLinks(raw, l, slug, toolIds, catIds);
      text[l] = plain(entry[l].body ?? '');
    }

    list.push({
      slug,
      entry,
      html,
      text,
      published: base.published,
      updated: new Date(Math.max(...langs.map((l) => entry[l].data.updated.getTime()))),
      tools: base.tools,
      categories: base.categories,
    });
  }
  return list.sort((a, b) => b.published.getTime() - a.published.getTime() || a.slug.localeCompare(b.slug));
}

/** Rewrites site-relative links for the language and checks catalog links. */
function localizeLinks(html: string, lang: Lang, slug: string, toolIds: Set<string>, catIds: Set<string>) {
  return html.replace(/<a href="([^"]*)"/g, (_m, href: string) => {
    if (/^https?:\/\//.test(href)) return `<a href="${href}" rel="noopener"`;
    if (!href.startsWith('/')) return `<a href="${href}"`;
    const path = href.replace(/[?#].*$/, '');
    const m = path.match(/^\/(tool|alternatives|category)\/([^/]+)\/?$/);
    if (m) {
      const known = m[1] === 'category' ? catIds : toolIds;
      if (!known.has(m[2])) throw new Error(`Article "${slug}" (${lang}): link to unknown ${m[1]} "${m[2]}" (${href})`);
    }
    return `<a href="${u(href, lang)}"`;
  });
}

/** Markdown → plain text, good enough for llms-full.txt. */
function plain(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/[*_`>#|]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Articles that mention a tool (by the `tools` list), newest first. */
export async function articlesWithTool(toolId: string) {
  return (await getArticles()).filter((a) => a.tools.includes(toolId));
}
