/**
 * The Popular page's data: page views per site from src/data/popular.json,
 * which scripts/popular.mjs fills from GoatCounter before each deploy
 * (see DEPLOY.md). Without data the page says so and shows featured sites.
 */
import data from '~/data/popular.json';
import type { Tool } from './data';

/** How many sites the page lists. */
export const POPULAR_MAX = 24;

export interface Popular {
  ranked: { tool: Tool; views: number }[];
  updated: Date | null;
  days: number;
}

export function getPopular(tools: Tool[]): Popular {
  const views = (data.views ?? {}) as Record<string, number>;
  const ranked = tools
    .map((tool) => ({ tool, views: views[tool.id] ?? 0 }))
    .filter((x) => x.views > 0)
    .sort((a, b) => b.views - a.views || a.tool.data.name.localeCompare(b.tool.data.name))
    .slice(0, POPULAR_MAX);
  return { ranked, updated: data.updated ? new Date(data.updated) : null, days: data.days ?? 30 };
}
