import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '~/i18n';

export type Tool = CollectionEntry<'tools'>;
export type Category = CollectionEntry<'categories'>;

export async function getCategories(): Promise<Category[]> {
  const list = await getCollection('categories');
  return list.sort((a, b) => a.data.order - b.data.order);
}

/** Newest first, featured items lifted to the top. */
export async function getTools(): Promise<Tool[]> {
  const [tools, categories] = await Promise.all([getCollection('tools'), getCollection('categories')]);
  const known = new Set(categories.map((c) => c.id));
  for (const t of tools) {
    if (!known.has(t.data.category)) {
      throw new Error(`Tool "${t.id}" uses unknown category "${t.data.category}". Add it to src/data/categories.json.`);
    }
  }
  return tools.sort(
    (a, b) =>
      Number(b.data.featured) - Number(a.data.featured) ||
      b.data.added.getTime() - a.data.added.getTime() ||
      a.data.name.localeCompare(b.data.name),
  );
}

export function domainOf(url: string) {
  return new URL(url).hostname.replace(/^www\./, '');
}

/**
 * What the client-side search looks through, split by weight so a match in
 * the name ranks above one in the description. Both languages are always
 * included: a Russian word finds a site on the English page and the other
 * way round.
 */
export function searchFields(tool: Tool, categoryNames: Partial<Record<Lang, string>> | string) {
  const d = tool.data;
  const cat = typeof categoryNames === 'string' ? categoryNames : Object.values(categoryNames).join(' ');
  return {
    name: [d.name, domainOf(d.url)].join(' '),
    tags: [...d.tags, ...d.platforms, d.pricing, d.openSource ? 'open source' : ''].join(' '),
    cat,
    summary: [d.summary.en, d.summary.ru ?? ''].join(' '),
    description: [d.description.en, d.description.ru ?? ''].join(' '),
  };
}

/** Date the tool's page text last changed. */
export function toolUpdated(tool: Tool): Date {
  return tool.data.updated ?? tool.data.added;
}

export function latest(dates: Date[]): Date {
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}
