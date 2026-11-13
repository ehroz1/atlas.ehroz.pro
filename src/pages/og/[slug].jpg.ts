/** /og/<id>.jpg for every site, plus /og/default.jpg for every other page. */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getTools, getCategories, domainOf, type Tool } from '~/lib/data';
import { toolImage, siteImage } from '~/lib/og';
import { shotFor } from '~/lib/shots';
import { useTranslations, loc } from '~/i18n';

export const getStaticPaths = (async () => {
  const tools = await getTools();
  return [{ params: { slug: 'default' }, props: {} }, ...tools.map((tool) => ({ params: { slug: tool.id }, props: { tool } }))];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const t = useTranslations('en');
  const tool = (props as { tool?: Tool }).tool;
  let body: Buffer;
  if (tool) {
    const categories = await getCategories();
    const d = tool.data;
    const cat = categories.find((c) => c.id === d.category);
    const pricing = d.openSource ? t('pricing.openSource') : t(`pricing.${d.pricing}`);
    body = await toolImage({
      id: tool.id,
      name: d.name,
      summary: loc(d.summary),
      domain: domainOf(d.url),
      facts: [cat ? loc(cat.data.name) : '', pricing].filter(Boolean),
    });
  } else {
    const tools = await getTools();
    body = await siteImage({
      title: t('hero.title', { count: tools.length }),
      sub: t('hero.sub'),
      shots: tools.filter((x) => shotFor(x.id) && !x.data.own).map((x) => x.id),
    });
  }
  return new Response(new Uint8Array(body), { headers: { 'Content-Type': 'image/jpeg' } });
};
