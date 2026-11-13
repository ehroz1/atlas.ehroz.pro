import { defaultLang, langs, type Lang } from '~/i18n';

/**
 * Site-relative URL that respects Astro's `base` ("/" on the domain,
 * "/atlas.ehroz.pro" on github.io), the language prefix and the
 * trailing-slash rule (every page ends with "/").
 *   u('/about')          → "/about/"
 *   u('/about', 'en')    → "/en/about/"
 *   u('/?q=x#sites')     → "/?q=x#sites"
 */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function withSlash(path: string) {
  const m = path.match(/^([^?#]*)(.*)$/)!;
  let p = m[1] || '/';
  if (!p.endsWith('/') && !/\.[a-z0-9]+$/i.test(p)) p += '/';
  return p + m[2];
}

/** Path with language prefix but without base: "/en/about/" */
export function localePath(path: string, lang: Lang = defaultLang) {
  const prefix = lang === defaultLang ? '' : '/' + lang;
  return withSlash(prefix + (path === '/' && prefix ? '/' : path)).replace(/\/\/+/g, '/');
}

export function u(path: string, lang: Lang = defaultLang) {
  return BASE + localePath(path, lang);
}

/** Splits a request pathname into language and the language-free path ("/tool/x/"). */
export function splitPath(pathname: string): { lang: Lang; path: string } {
  let p = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  p = withSlash(p || '/');
  for (const l of langs) {
    // the default language also answers at /<defaultLang>/… (alias)
    if (p === `/${l}/` || p.startsWith(`/${l}/`)) return { lang: l, path: p.slice(l.length + 1) || '/' };
  }
  return { lang: defaultLang, path: p };
}

/** True for the /<defaultLang>/… alias of a root page. */
export function isAliasPath(pathname: string) {
  const p = withSlash(pathname.startsWith(BASE) ? pathname.slice(BASE.length) || '/' : pathname);
  return p === `/${defaultLang}/` || p.startsWith(`/${defaultLang}/`);
}

/** Language-free path without trailing slash, for "is this the current page?" checks. */
export function pagePath(pathname: string) {
  return splitPath(pathname).path.replace(/\/$/, '') || '/';
}
