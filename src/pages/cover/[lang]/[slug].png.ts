/** Drawn article covers, 1600×900: /cover/<lang>/<slug>.png (src/lib/cover.ts). */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getArticles, type Article } from '~/lib/articles';
import { getCategories } from '~/lib/data';
import { renderCover } from '~/lib/cover';
import { langs, loc, useTranslations, type Lang } from '~/i18n';

export const getStaticPaths: GetStaticPaths = async () => {
  const articles = await getArticles();
  return articles.flatMap((article) => langs.map((lang) => ({ params: { lang, slug: article.slug }, props: { article, lang } })));
};

export const GET: APIRoute = async ({ props }) => {
  const { article, lang } = props as { article: Article; lang: Lang };
  const t = useTranslations(lang);
  const cat = (await getCategories()).find((c) => c.id === article.categories[0]);
  const png = await renderCover({
    title: article.entry[lang].data.title,
    category: article.categories[0],
    categoryName: cat ? loc(cat.data.name, lang) : '',
    section: t('nav.blog'),
    minutes: t('article.minutes', { n: article.minutes[lang] }),
  });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
