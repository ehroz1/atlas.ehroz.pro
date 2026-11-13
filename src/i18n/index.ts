import { en, type UIKey } from './en';

export const languages = { en: 'English' } as const;
export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'en';

const dictionaries: Record<Lang, Record<UIKey, string>> = { en };

/** Returns a translator bound to a language. `t('key', { count: 3 })` */
export function useTranslations(lang: Lang = defaultLang) {
  const dict = dictionaries[lang] ?? dictionaries[defaultLang];
  return function t(key: UIKey, vars?: Record<string, string | number>) {
    let str: string = dict[key] ?? dictionaries[defaultLang][key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) str = str.replaceAll(`{${k}}`, String(v));
    return str;
  };
}

/** Picks a value from a `{ en, ru? }` object, falling back to English. */
export function loc(value: { en: string } & Partial<Record<Lang, string>>, lang: Lang = defaultLang) {
  return value[lang] ?? value.en;
}

/** English-style plural keys: `.one` / `.other`. Russian will need few/many later. */
export function plural(lang: Lang, n: number): 'one' | 'other' {
  return new Intl.PluralRules(lang).select(n) === 'one' ? 'one' : 'other';
}

export function formatDate(date: Date, lang: Lang = defaultLang) {
  return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}
