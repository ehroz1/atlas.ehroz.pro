import type { APIRoute } from 'astro';
import { blogRss } from '~/lib/blogFeed';
export const GET: APIRoute = async ({ site }) =>
  new Response(await blogRss('ru', site), { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
