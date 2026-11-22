/** Tags across the index, with how many sites use each. Build time only. */
import type { Tool } from './data';

export interface TagCount { tag: string; count: number }

/** Most used first, then A to Z. */
export function tagCounts(tools: Tool[]): TagCount[] {
  const n = new Map<string, number>();
  for (const t of tools) for (const tag of new Set(t.data.tags)) n.set(tag, (n.get(tag) ?? 0) + 1);
  return [...n].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
