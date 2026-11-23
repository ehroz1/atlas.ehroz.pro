/**
 * Combined sitemap kept for backward compatibility (/sitemap-0.xml).
 * sitemap-index.xml lists the split sitemaps by content type.
 */
import type { APIRoute } from 'astro';
import { getPages } from '~/lib/routes';
import { renderUrlSet } from '~/lib/sitemap';

export const GET: APIRoute = async () => renderUrlSet(await getPages(), { images: true });
