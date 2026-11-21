/**
 * Public read-only API: static JSON files built with the site under
 * /api/v1/. No key, no server; GitHub Pages and Vercel serve them with
 * CORS open. Documented on /api/. Bump API_VERSION only for breaking changes.
 */
import { abs } from './feed';
import { domainOf, toolUpdated, type Tool, type Category } from './data';

export const API_VERSION = 1;

export const day = (d: Date) => d.toISOString().slice(0, 10);

export function toolJson(t: Tool, site: URL | undefined) {
  const d = t.data;
  return {
    id: t.id,
    name: d.name,
    url: d.url,
    domain: domainOf(d.url),
    /** true when the site's "Open" button is a partner (affiliate) link */
    partner: !!d.affiliateUrl,
    category: d.category,
    pricing: d.pricing,
    openSource: d.openSource,
    platforms: d.platforms,
    tags: d.tags,
    added: day(d.added),
    updated: day(toolUpdated(t)),
    summary: d.summary,
    description: d.description,
    note: d.note ?? null,
    page: abs(site, `/tool/${t.id}/`),
    image: abs(site, `/og/en/tool/${t.id}.png`),
  };
}

export function categoryJson(c: Category, tools: Tool[], site: URL | undefined) {
  return {
    id: c.id,
    order: c.data.order,
    name: c.data.name,
    description: c.data.description,
    count: tools.filter((t) => t.data.category === c.id).length,
    page: abs(site, `/category/${c.id}/`),
  };
}

export const json = (data: unknown) =>
  new Response(JSON.stringify(data, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
