import type { APIRoute } from 'astro';
import { getTools, getCategories } from '~/lib/data';
import { API_VERSION, json, categoryJson } from '~/lib/api';

export const GET: APIRoute = async ({ site }) => {
  const [tools, categories] = await Promise.all([getTools(), getCategories()]);
  return json({ version: API_VERSION, count: categories.length, categories: categories.map((c) => categoryJson(c, tools, site)) });
};
