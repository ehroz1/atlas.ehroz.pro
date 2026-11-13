import { getCollection, type CollectionEntry } from 'astro:content';

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

/** Lower-cased text the client-side search looks through. */
export function searchText(tool: Tool, categoryName: string) {
  const d = tool.data;
  return [d.name, domainOf(d.url), categoryName, d.summary.en, d.description.en, ...d.tags, ...d.platforms, d.pricing]
    .join(' ')
    .toLowerCase();
}
