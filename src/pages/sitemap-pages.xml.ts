import type { APIRoute } from 'astro';
import { getPages } from '~/lib/routes';
import { renderUrlSet, SITEMAP_GROUPS } from '~/lib/sitemap';

export const GET: APIRoute = async () => {
  const pages = (await getPages()).filter((p) => SITEMAP_GROUPS.pages.has(p.kind));
  return renderUrlSet(pages, { images: true });
};
