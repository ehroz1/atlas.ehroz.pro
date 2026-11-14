/**
 * schema.org JSON-LD. Each page gets one @graph; entities point at each
 * other by @id. Only facts that are on the page or in the data: no
 * ratings, reviews or prices.
 */
import { SITE, AUTHOR } from '~/site.config';
import { absUrl } from '~/lib/seo';
import { defaultLang, langs, langTag, loc, type Lang } from '~/i18n';
import { domainOf, type Tool } from '~/lib/data';
import type { PageEntry } from '~/lib/routes';

type Node = Record<string, unknown>;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export const ids = {
  website: () => absUrl('/', defaultLang) + '#website',
  person: () => AUTHOR.id,
  page: (url: string) => url + '#webpage',
  breadcrumb: (url: string) => url + '#breadcrumb',
  image: (url: string) => url + '#primaryimage',
  list: (url: string) => url + '#itemlist',
  tool: (url: string) => url + '#software',
};

export function website(): Node {
  return {
    '@type': 'WebSite',
    '@id': ids.website(),
    name: SITE.name,
    alternateName: SITE.host,
    url: absUrl('/', defaultLang),
    inLanguage: langs.map((l) => langTag[l]),
    publisher: { '@id': ids.person() },
    author: { '@id': ids.person() },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: absUrl('/', defaultLang) + '?q={search_term_string}' },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function person(lang: Lang): Node {
  return {
    '@type': 'Person',
    '@id': ids.person(),
    name: AUTHOR.name,
    alternateName: [...AUTHOR.alternateName],
    jobTitle: AUTHOR.jobTitle[lang],
    url: AUTHOR.url,
    address: { '@type': 'PostalAddress', addressLocality: AUTHOR.city.en, addressCountry: AUTHOR.country },
    sameAs: [...AUTHOR.sameAs],
  };
}

/** name, absolute url (schema) and site-relative href (visible link) */
export type Crumb = { name: string; url: string; href: string };

export function breadcrumbs(url: string, items: Crumb[]): Node {
  return {
    '@type': 'BreadcrumbList',
    '@id': ids.breadcrumb(url),
    itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
  };
}

const PAGE_TYPE: Record<PageEntry['kind'], string> = {
  home: 'CollectionPage',
  categories: 'CollectionPage',
  category: 'CollectionPage',
  tool: 'ItemPage',
  about: 'AboutPage',
  contact: 'ContactPage',
  submit: 'WebPage',
  wall: 'CollectionPage',
};

export function webPage(entry: PageEntry, lang: Lang, url: string, image: string, hasCrumbs: boolean, extra: Node = {}): Node {
  return {
    '@type': PAGE_TYPE[entry.kind],
    '@id': ids.page(url),
    url,
    name: entry.title[lang],
    description: entry.description[lang],
    inLanguage: langTag[lang],
    isPartOf: { '@id': ids.website() },
    author: { '@id': ids.person() },
    dateModified: iso(entry.updated),
    primaryImageOfPage: { '@id': ids.image(url) },
    image: { '@id': ids.image(url) },
    ...(hasCrumbs ? { breadcrumb: { '@id': ids.breadcrumb(url) } } : {}),
    ...extra,
  };
}

export function imageObject(url: string, src: string, caption: string): Node {
  return { '@type': 'ImageObject', '@id': ids.image(url), url: src, contentUrl: src, width: 1200, height: 630, caption };
}

export function itemList(url: string, name: string, tools: Tool[], lang: Lang): Node {
  return {
    '@type': 'ItemList',
    '@id': ids.list(url),
    name,
    numberOfItems: tools.length,
    itemListElement: tools.map((x, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: x.data.name,
      url: absUrl(`/tool/${x.id}/`, lang),
    })),
  };
}

const APP_CATEGORY: Record<string, string> = {
  ai: 'BusinessApplication',
  design: 'DesignApplication',
  development: 'DeveloperApplication',
  productivity: 'BusinessApplication',
  'video-audio': 'MultimediaApplication',
  '3d-motion': 'DesignApplication',
  typography: 'DesignApplication',
  inspiration: 'DesignApplication',
  assets: 'MultimediaApplication',
  utilities: 'UtilitiesApplication',
  learning: 'EducationalApplication',
  'web-galleries': 'DesignApplication',
  branding: 'DesignApplication',
  museums: 'MultimediaApplication',
  mockups: 'DesignApplication',
  'icons-illustrations': 'DesignApplication',
  'file-converters': 'UtilitiesApplication',
  'design-generators': 'DesignApplication',
};

/** The site a tool page is about. WebApplication when it only runs in the browser. */
export function software(url: string, tool: Tool, lang: Lang, categoryName: string): Node {
  const d = tool.data;
  const webOnly = d.platforms.length === 0 || d.platforms.every((p) => p === 'Web');
  return {
    '@type': webOnly ? 'WebApplication' : 'SoftwareApplication',
    '@id': ids.tool(url),
    name: d.name,
    url: d.url,
    sameAs: d.url,
    description: loc(d.description, lang),
    applicationCategory: APP_CATEGORY[d.category] ?? 'WebApplication',
    applicationSubCategory: categoryName,
    ...(d.platforms.length ? { operatingSystem: d.platforms.join(', ') } : {}),
    ...(d.pricing === 'free' ? { isAccessibleForFree: true } : {}),
    keywords: d.tags.join(', '),
    alternateName: domainOf(d.url),
  };
}

export function graph(nodes: Node[]) {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003c');
}
