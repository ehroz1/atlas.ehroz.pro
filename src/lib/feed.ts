/** Small helpers shared by rss.xml, sitemap.xml and robots.txt. */
import { u } from './url';
import rawTools from '~/data/tools.json';
import type { Tool } from './data';

/** Absolute URL for a site path, respecting `base`. */
export const abs = (site: URL | undefined, path: string) => new URL(u(path), site ?? 'https://atlas.ehroz.pro').href;

export const xml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);

/** Newest first: by `added`, then later place in tools.json. */
const fileOrder = new Map(rawTools.map((x, i) => [x.id, i]));
export const byNewest = (a: Tool, b: Tool) =>
  b.data.added.getTime() - a.data.added.getTime() || (fileOrder.get(b.id) ?? 0) - (fileOrder.get(a.id) ?? 0);
