/** llms.txt / llms-full.txt, built from the same entries as the pages. */
import { getPages, type PageEntry } from '~/lib/routes';
import { getCategories } from '~/lib/data';
import { absUrl } from '~/lib/seo';
import { useTranslations, loc, langs, defaultLang, languages, type Lang } from '~/i18n';
import { SITE, AUTHOR } from '~/site.config';

const intro = (lang: Lang) => {
  const t = useTranslations(lang);
  const other = langs.filter((l) => l !== lang);
  return [
    `# ${SITE.name} (${SITE.host})`,
    '',
    `> ${t('site.description')}`,
    '',
    lang === 'ru'
      ? `Автор: ${AUTHOR.name} (${AUTHOR.url}), Telegram ${AUTHOR.telegram.handle}. Основной язык — ${languages[defaultLang]} (${absUrl('/', defaultLang)}).`
      : `Author: ${AUTHOR.name} (${AUTHOR.url}), Telegram ${AUTHOR.telegram.handle}. Main language: ${languages[defaultLang]} (${absUrl('/', defaultLang)}).`,
    ...other.map((l) => `${languages[l]}: ${absUrl('/', l)}`),
  ];
};

export async function llmsTxt() {
  const [pages, categories] = await Promise.all([getPages(), getCategories()]);
  const lines: string[] = [];
  for (const lang of langs) {
    const t = useTranslations(lang);
    if (lines.length) lines.push('', '---', '');
    lines.push(...intro(lang), '');
    lines.push(lang === 'ru' ? `Полный текст всех страниц: ${absUrl('/llms-full.txt')}` : `Full text of every page: ${absUrl('/llms-full.txt')}`, '');
    const link = (p: PageEntry) => `- [${p.heading[lang]}](${absUrl(p.path, lang)}): ${p.description[lang]}`;
    lines.push(`## ${lang === 'ru' ? 'Страницы' : 'Pages'}`, '');
    for (const p of pages.filter((x) => x.kind !== 'tool' && x.kind !== 'category')) lines.push(link(p));
    lines.push('', `## ${t('nav.categories')}`, '');
    for (const p of pages.filter((x) => x.kind === 'category')) lines.push(link(p));
    for (const c of categories) {
      const inCat = pages.filter((p) => p.tool?.data.category === c.id);
      lines.push('', `## ${loc(c.data.name, lang)}`, '');
      for (const p of inCat) lines.push(`- [${p.tool!.data.name}](${absUrl(p.path, lang)}): ${loc(p.tool!.data.summary, lang)} ${p.tool!.data.url}`);
    }
  }
  return lines.join('\n') + '\n';
}

export async function llmsFullTxt() {
  const pages = await getPages();
  const lines: string[] = [];
  for (const lang of langs) {
    if (lines.length) lines.push('', '---', '');
    lines.push(...intro(lang), '');
    for (const p of pages) {
      lines.push(`## ${p.heading[lang]}`, '', `URL: ${absUrl(p.path, lang)}`, `${lang === 'ru' ? 'Обновлено' : 'Updated'}: ${p.updated.toISOString().slice(0, 10)}`, '', p.text[lang], '');
    }
  }
  return lines.join('\n');
}
