import type { APIRoute } from 'astro';
import { getImage } from 'astro:assets';
import { getTools, getCategories, searchText, domainOf } from '~/lib/data';
import { getArticles } from '~/lib/articles';
import { shotFor } from '~/lib/shots';
import { useTranslations, loc, langs, type Lang } from '~/i18n';

export const getStaticPaths = () => langs.map((lang) => ({ params: { lang }, props: { lang } }));

export const GET: APIRoute = async ({ props }) => {
  const { lang } = props as { lang: Lang };
  const t = useTranslations(lang);
  const [tools, categories, articles] = await Promise.all([getTools(), getCategories(), getArticles()]);
  const names = new Map(categories.map((c) => [c.id, loc(c.data.name, lang)]));
  const count = <T,>(list: T[], fn: (x: T) => boolean) => list.filter(fn).length;

  const platforms = [...new Set(tools.flatMap((x) => x.data.platforms))].sort(
    (a, b) => count(tools, (x) => x.data.platforms.includes(b)) - count(tools, (x) => x.data.platforms.includes(a)),
  );

  const thumbs = new Map<string, string>();
  for (const tool of tools) {
    const shot = shotFor(tool.id);
    if (shot) thumbs.set(tool.id, (await getImage({ src: shot, width: 240, format: 'webp', quality: 70 })).src);
  }

  const index = {
    tools: tools.map((tool) => ({
      id: tool.id,
      name: tool.data.name,
      category: tool.data.category,
      categoryName: names.get(tool.data.category),
      pricing: tool.data.pricing,
      open: tool.data.openSource,
      platforms: tool.data.platforms,
      summary: loc(tool.data.summary, lang),
      text: searchText(tool, names.get(tool.data.category)!, lang),
      thumb: thumbs.get(tool.id) ?? '',
      domain: domainOf(tool.data.url),
    })),
    articles: articles.map((a) => ({
      slug: a.slug,
      title: a.entry[lang].data.title,
      meta: a.categories.map((c) => names.get(c)).join(' · '),
      text: [a.entry[lang].data.title, a.entry[lang].data.description, ...a.categories.map((c) => names.get(c) ?? '')].join(' '),
    })),
    facets: {
      category: categories.map((c) => ({ id: c.id, label: loc(c.data.name, lang), count: count(tools, (x) => x.data.category === c.id) })),
      pricing: [
        ...(['free', 'freemium', 'paid'] as const).map((p) => ({ id: p, label: t(`pricing.${p}`), count: count(tools, (x) => x.data.pricing === p) })),
        { id: 'open', label: t('pricing.openSource'), count: count(tools, (x) => x.data.openSource) },
      ],
      platform: platforms.map((p) => ({ id: p, label: p, count: count(tools, (x) => x.data.platforms.includes(p)) })),
    },
    strings: {
      category: t('search.facet.category'),
      pricing: t('search.facet.pricing'),
      platform: t('search.facet.platform'),
      sites: t('search.sites'),
      none: t('search.none'),
      placeholder: t('search.placeholder'),
      tabSites: t('search.sites'),
      tabCategories: t('nav.categories'),
      tabArticles: t('nav.blog'),
      noArticles: t('search.noArticles'),
      noCategories: t('search.noCategories'),
      filtersOne: t('search.filters.one'),
      filtersFew: t('search.filters.few'),
      filtersMany: t('search.filters.many'),
      filtersOther: t('search.filters.other'),
      lang,
    },
  };

  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
