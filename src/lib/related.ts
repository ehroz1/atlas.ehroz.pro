/**
 * How sites relate to each other: "New", alternatives, similar sites.
 * Everything here runs at build time.
 */
import groups from '~/data/alternatives.json';
import { byNewest } from './feed';
import type { Tool } from './data';

// ---- New -----------------------------------------------------------------

/** A site counts as new for this many days after its `added` date… */
export const NEW_DAYS = 14;
/** …and only the most recent few get the badge, so it never covers the grid. */
export const NEW_MAX = 6;

/**
 * Ids of the newest sites, newest first. Sorted by `added`, then by place
 * in tools.json (the later entry wins a same-day tie).
 */
export function newIds(tools: Tool[], now = new Date()): Set<string> {
  const cutoff = now.getTime() - NEW_DAYS * 86_400_000;
  const fresh = tools
    .filter((x) => x.data.added.getTime() >= cutoff)
    .sort(byNewest);
  return new Set(fresh.slice(0, NEW_MAX).map((x) => x.id));
}

/** The date after which the badge should disappear, for the client-side check. */
export function newUntil(tool: Tool) {
  return new Date(tool.data.added.getTime() + NEW_DAYS * 86_400_000).toISOString().slice(0, 10);
}

// ---- Alternatives --------------------------------------------------------

/**
 * src/data/alternatives.json holds groups of sites that do the same job.
 * Every site in a group is an alternative to every other one.
 */
export function alternativesOf(tool: Tool, all: Tool[]): Tool[] {
  const byId = new Map(all.map((x) => [x.id, x]));
  for (const g of groups) {
    for (const id of g.ids) {
      if (!byId.has(id)) throw new Error(`alternatives.json ("${g.about}") lists unknown site "${id}".`);
    }
  }
  const ids = new Set<string>();
  for (const g of groups) if (g.ids.includes(tool.id)) g.ids.forEach((id) => ids.add(id));
  ids.delete(tool.id);
  // Keep the order of `all` (featured, then newest) so the list is stable.
  return all.filter((x) => ids.has(x.id));
}

// ---- Similar -------------------------------------------------------------

/**
 * Sites that look related: shared tags weigh most, then the same category,
 * then matching pricing. Alternatives are left out (they have their own
 * section), and so are sites with nothing in common.
 */
export function similarTo(tool: Tool, all: Tool[], exclude: Set<string>, limit = 6): Tool[] {
  const tags = new Set(tool.data.tags.map((x) => x.toLowerCase()));
  const words = new Set([...tags].flatMap((x) => x.split(/\s+/)).filter((w) => w.length > 2));
  const scored = all
    .filter((x) => x.id !== tool.id && !exclude.has(x.id))
    .map((x) => {
      const theirs = x.data.tags.map((t) => t.toLowerCase());
      const sharedTags = theirs.filter((t) => tags.has(t)).length;
      // "image generation" and "video generation" share a word, not a tag
      const sharedWords = new Set(theirs.flatMap((t) => t.split(/\s+/)).filter((w) => words.has(w))).size;
      const sameCategory = x.data.category === tool.data.category;
      const score =
        sharedTags * 4 + sharedWords + (sameCategory ? 3 : 0) + (x.data.pricing === tool.data.pricing ? 0.5 : 0);
      return { x, score, related: sharedTags + sharedWords > 0 || sameCategory };
    })
    .filter((s) => s.related)
    .sort((a, b) => b.score - a.score || a.x.data.name.localeCompare(b.x.data.name));
  return scored.slice(0, limit).map((s) => s.x);
}
