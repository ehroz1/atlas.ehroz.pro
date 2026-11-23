/**
 * Articles (blog). Each article is a folder src/content/articles/<slug>/
 * with one Markdown file per language. This module groups them by slug,
 * checks the data against the catalog and prepares the HTML:
 *  - links written as "/tool/figma/" get the language prefix and base,
 *  - links to tools / categories that don't exist stop the build,
 *  - outbound links open with rel="noopener",
 *  - ![Caption](shot:<tool-id>) becomes that site's screenshot, linked to its page,
 *  - an image with a title (![alt](./a.jpg "Caption")) gets a caption.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import { getTools, getCategories, type Tool } from '~/lib/data';
import { shotFor } from '~/lib/shots';
import { u } from '~/lib/url';
import { langs, type Lang } from '~/i18n';

export type ArticleEntry = CollectionEntry<'articles'>;

/** Pictures stored next to the articles, for ![](./picture.jpg) in the text. */
const pictures = import.meta.glob<{ default: ImageMetadata }>('../content/articles/*/*.{jpg,jpeg,png,webp,avif,gif}', { eager: true });

export interface Article {
  slug: string;
  /** per-language entry */
  entry: Record<Lang, ArticleEntry>;
  /** per-language HTML body with localized links */
  html: Record<Lang, string>;
  /** per-language plain text, for llms-full.txt */
  text: Record<Lang, string>;
  /** minutes to read, per language */
  minutes: Record<Lang, number>;
  /** H2s for the table of contents, per language */
  toc: Record<Lang, { id: string; text: string }[]>;
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
    // a draft may exist in one language only (e.g. saved from the admin before translating)
    if (missing.length && langs.some((l) => parts[l]?.data.draft)) continue;
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
    const minutes = {} as Record<Lang, number>;
    const toc = {} as Record<Lang, { id: string; text: string }[]>;
    for (const l of langs) {
      const raw = entry[l].rendered?.html ?? '';
      html[l] = figures(await localImages(slug, await screenshots(localizeLinks(raw, l, slug, toolIds, catIds), l, slug, tools)));
      const faqText = entry[l].data.faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n\n');
      text[l] = [plain(entry[l].body ?? ''), faqText].filter(Boolean).join('\n\n');
      // ~200 words a minute in English, a bit slower in Russian (longer words)
      const words = text[l].split(/\s+/).filter(Boolean).length;
      minutes[l] = Math.max(1, Math.round(words / (l === 'ru' ? 170 : 200)));
      toc[l] = [...html[l].matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)].map((m) => ({ id: m[1], text: m[2].replace(/<[^>]+>/g, '') }));
    }

    list.push({
      slug,
      entry,
      html,
      text,
      minutes,
      toc,
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

/** ![Caption](shot:figma) → the site's screenshot in a figure, linked to its catalog page. */
async function screenshots(html: string, lang: Lang, slug: string, tools: Tool[]) {
  const re = /(?:<p>)?<img src="shot:([a-z0-9-]+)" alt="([^"]*)"[^>]*>(?:<\/p>)?/g;
  const found = [...html.matchAll(re)];
  for (const m of found) {
    const [whole, id, alt] = m;
    const tool = tools.find((t) => t.id === id);
    if (!tool) throw new Error(`Article "${slug}" (${lang}): screenshot of unknown tool "${id}"`);
    const shot = shotFor(id);
    const caption = alt || tool.data.name;
    let figure = '';
    if (shot) {
      const img = await getImage({ src: shot, width: 1280, format: 'webp', quality: 80 });
      figure = `<figure class="article-figure article-figure--shot"><a href="${u(`/tool/${id}/`, lang)}"><img src="${img.src}" width="${img.attributes.width ?? 1280}" height="${img.attributes.height ?? 800}" alt="${tool.data.name}" loading="lazy" decoding="async"></a><figcaption>${caption}</figcaption></figure>`;
    }
    html = html.replace(whole, figure);
  }
  return html;
}

/**
 * Astro leaves ![](./a.jpg) in the rendered HTML as a placeholder that only
 * its <Content /> component fills in; this module renders the HTML itself,
 * so it resolves them: optimized WebP, real size, lazy loading.
 */
async function localImages(slug: string, html: string) {
  const re = /<img __ASTRO_IMAGE_="([^"]*)"[^>]*>/g;
  for (const m of [...html.matchAll(re)]) {
    const props = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
    const file = String(props.src).replace(/^\.\//, '');
    const mod = pictures[`../content/articles/${slug}/${file}`];
    if (!mod) throw new Error(`Article "${slug}": picture ${props.src} not found next to the article`);
    const img = await getImage({ src: mod.default, width: Math.min(1600, mod.default.width), format: 'webp', quality: 80 });
    const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const title = props.title ? ` title="${esc(props.title)}"` : '';
    html = html.replace(
      m[0],
      `<img src="${img.src}" width="${img.attributes.width ?? mod.default.width}" height="${img.attributes.height ?? mod.default.height}" alt="${esc(props.alt ?? '')}"${title} loading="lazy" decoding="async">`,
    );
  }
  return html;
}

/** <p><img title="…"></p> → <figure> with a caption; other images get lazy loading. */
function figures(html: string) {
  return html.replace(/<p>(<img [^>]*>)<\/p>/g, (_m, img: string) => {
    const title = img.match(/ title="([^"]*)"/)?.[1];
    const clean = img.replace(/ title="[^"]*"/, '');
    return `<figure class="article-figure">${clean}${title ? `<figcaption>${title}</figcaption>` : ''}</figure>`;
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
