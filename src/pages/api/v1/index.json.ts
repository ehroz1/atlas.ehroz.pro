import type { APIRoute } from 'astro';
import { getTools, getCategories, toolUpdated, latest } from '~/lib/data';
import { abs } from '~/lib/feed';
import { API_VERSION, day, json } from '~/lib/api';

export const GET: APIRoute = async ({ site }) => {
  const [tools, categories] = await Promise.all([getTools(), getCategories()]);
  return json({
    name: 'Atlas API',
    version: API_VERSION,
    docs: abs(site, '/api/'),
    updated: day(latest(tools.map(toolUpdated))),
    counts: { tools: tools.length, categories: categories.length },
    endpoints: {
      tools: abs(site, '/api/v1/tools.json'),
      tool: abs(site, '/api/v1/tools/') + '{id}.json',
      categories: abs(site, '/api/v1/categories.json'),
    },
  });
};
