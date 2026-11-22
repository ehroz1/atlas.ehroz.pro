import type { APIRoute } from 'astro';
import { getTools, type Tool } from '~/lib/data';
import { API_VERSION, json, toolJson } from '~/lib/api';

export async function getStaticPaths() {
  return (await getTools()).map((tool) => ({ params: { id: tool.id }, props: { tool } }));
}

export const GET: APIRoute = ({ props, site }) => json({ version: API_VERSION, tool: toolJson((props as { tool: Tool }).tool, site) });
