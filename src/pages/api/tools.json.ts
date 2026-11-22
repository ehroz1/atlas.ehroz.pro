/**
 * Open catalog data at /api/tools.json, built with the site.
 * License: CC BY 4.0, credit "Atlas (atlas.ehroz.pro)" with a link.
 */
import type { APIRoute } from 'astro';
import { getTools, getCategories } from '~/lib/data';
import { absUrl } from '~/lib/seo';
import { alternativesOf } from '~/lib/related';
import { SITE } from '~/site.config';

export const GET: APIRoute = async () => {
  const [tools, categories] = await Promise.all([getTools(), getCategories()]);
  const body = {
    name: SITE.name,
    source: SITE.url,
    license: 'CC BY 4.0',
    attribution: `${SITE.name} (${SITE.host}), ${SITE.url}`,
    categories: categories.map((c) => ({ id: c.id, name: c.data.name, description: c.data.description })),
    tools: tools.map((x) => ({
      id: x.id,
      name: x.data.name,
      url: x.data.url,
      category: x.data.category,
      pricing: x.data.pricing,
      openSource: x.data.openSource,
      platforms: x.data.platforms,
      tags: x.data.tags,
      added: x.data.added.toISOString().slice(0, 10),
      updated: x.data.updated.toISOString().slice(0, 10),
      summary: x.data.summary,
      description: x.data.description,
      atlasPage: { en: absUrl(`/tool/${x.id}/`, 'en'), ru: absUrl(`/tool/${x.id}/`, 'ru') },
      alternatives: alternativesOf(x, tools).map((a) => a.id),
    })),
  };
  return new Response(JSON.stringify(body, null, 1), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
