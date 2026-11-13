/**
 * Site-relative URL that respects Astro's `base` (e.g. "/atlas.ehroz.pro"
 * on github.io, "/" on a custom domain). Always pass a path starting with "/".
 *   u('/about') → "/about" or "/atlas.ehroz.pro/about"
 */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function u(path: string) {
  return BASE + path;
}

/** Current path without the base, for "is this the current page?" checks. */
export function pagePath(pathname: string) {
  const p = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  return p.replace(/\/$/, '') || '/';
}
