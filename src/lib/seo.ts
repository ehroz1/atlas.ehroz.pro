import { SITE } from '~/site.config';
import { u } from '~/lib/url';
import type { Lang } from '~/i18n';

export const TITLE_MAX = 60;
export const DESC_MIN = 50;
export const DESC_MAX = 160;

/** First candidate that fits in TITLE_MAX characters (the last one is cut by word if none do). */
export function fitTitle(...candidates: string[]) {
  const clean = candidates.map((c) => c.replace(/\s+/g, ' ').replace(/\.\s*$/, '').trim());
  return clean.find((c) => c.length <= TITLE_MAX) ?? cutByWord(clean[clean.length - 1], TITLE_MAX);
}

/** Description between DESC_MIN and DESC_MAX characters, cut at a word boundary. */
export function fitDescription(text: string, filler = '') {
  let s = text.replace(/\s+/g, ' ').trim();
  if (s.length < DESC_MIN && filler) s = `${s} ${filler}`.trim();
  return s.length <= DESC_MAX ? s : cutByWord(s, DESC_MAX);
}

export function cutByWord(s: string, max: number) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const at = cut.lastIndexOf(' ');
  return (at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,.;:—–-]+$/, '') + '…';
}

/** Absolute URL of a page as built (respects SITE_URL/BASE_PATH). */
export function absUrl(path: string, lang?: Lang) {
  return new URL(u(path, lang), import.meta.env.SITE ?? SITE.url).href;
}
