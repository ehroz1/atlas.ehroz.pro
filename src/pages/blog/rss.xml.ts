import type { APIRoute } from 'astro';
import { blogRss } from '~/lib/blogFeed';
import { defaultLang } from '~/i18n';
export const GET: APIRoute = async ({ site }) =>
  new Response(await blogRss(defaultLang, site), { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
