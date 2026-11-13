import { en, type UIKey } from './en';
import { ru } from './ru';
import { SITE } from '~/site.config';

/**
 * Languages. The default one lives at the site root, the others under
 * /<lang>/. To make English the root language, swap `defaultLang` — every
 * route, hreflang, sitemap entry and link follows from it.
 */
export const languages = { ru: 'Русский', en: 'English' } as const;
export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'ru';
export const langs = Object.keys(languages) as Lang[];
/** BCP 47 tags for schema.org inLanguage */
export const langTag: Record<Lang, string> = { ru: 'ru-RU', en: 'en-US' };

const dictionaries: Record<Lang, Record<UIKey, string>> = { ru, en };

/** Returns a translator bound to a language. `t('key', { count: 3 })`; {brand} is always filled. */
export function useTranslations(lang: Lang = defaultLang) {
  const dict = dictionaries[lang] ?? dictionaries[defaultLang];
  return function t(key: UIKey, vars?: Record<string, string | number>) {
    let str: string = dict[key] ?? dictionaries.en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) str = str.replaceAll(`{${k}}`, String(v));
    return str.replaceAll('{brand}', SITE.name);
  };
}

/** Picks a value from a `{ en, ru? }` object, falling back to English. */
export function loc(value: { en: string } & Partial<Record<Lang, string>>, lang: Lang = defaultLang) {
  return value[lang] ?? value.en;
}

/** CLDR plural category, narrowed to the keys the dictionaries have. */
export function plural(lang: Lang, n: number): 'one' | 'few' | 'many' | 'other' {
  const c = new Intl.PluralRules(lang).select(n);
  return c === 'one' || c === 'few' || c === 'many' ? c : 'other';
}

export function formatDate(date: Date, lang: Lang = defaultLang) {
  return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}

/** getStaticPaths helper: `lang` param is undefined for the default language. */
export function langParams() {
  return langs.map((lang) => ({ params: { lang: lang === defaultLang ? undefined : lang }, props: { lang } }));
}

export function langFromParam(param: string | undefined): Lang {
  return (param && param in languages ? param : defaultLang) as Lang;
}
