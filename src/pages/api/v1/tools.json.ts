import type { APIRoute } from 'astro';
import { getTools } from '~/lib/data';
import { byNewest } from '~/lib/feed';
import { API_VERSION, json, toolJson } from '~/lib/api';

export const GET: APIRoute = async ({ site }) => {
  const tools = [...(await getTools())].sort(byNewest);
  return json({ version: API_VERSION, count: tools.length, tools: tools.map((t) => toolJson(t, site)) });
};
