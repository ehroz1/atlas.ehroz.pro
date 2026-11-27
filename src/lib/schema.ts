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
  organization: () => absUrl('/', defaultLang) + '#organization',
  person: () => AUTHOR.id,
  page: (url: string) => url + '#webpage',
  breadcrumb: (url: string) => url + '#breadcrumb',
  image: (url: string) => url + '#primaryimage',
  list: (url: string) => url + '#itemlist',
  tool: (url: string) => url + '#software',
};

export function organization(lang: Lang): Node {
  const logoUrl = absUrl('/apple-touch-icon.png', defaultLang);
  return {
    '@type': 'Organization',
    '@id': ids.organization(),
    name: SITE.name,
    alternateName: SITE.host,
    url: absUrl('/', defaultLang),
    logo: {
      '@type': 'ImageObject',
      '@id': absUrl('/', defaultLang) + '#logo',
      url: logoUrl,
      contentUrl: logoUrl,
      width: 180,
      height: 180,
      caption: SITE.name,
    },
    founder: { '@id': ids.person() },
    contactPoint: {
      '@type': 'ContactPoint',
      email: AUTHOR.email,
      url: absUrl('/contact/', lang),
      availableLanguage: [...langs],
    },
    sameAs: [...AUTHOR.sameAs],
  };
}

export function website(): Node {
  return {
    '@type': 'WebSite',
    '@id': ids.website(),
    name: SITE.name,
    alternateName: SITE.host,
    url: absUrl('/', defaultLang),
    inLanguage: langs.map((l) => langTag[l]),
    publisher: { '@id': ids.organization() },
    author: { '@id': ids.person() },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: absUrl('/search/', defaultLang) + '?q={search_term_string}' },
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
    worksFor: { '@id': ids.organization() },
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
  alternatives: 'CollectionPage',
  badge: 'WebPage',
  'for-makers': 'WebPage',
  about: 'AboutPage',
  editorial: 'WebPage',
  contact: 'ContactPage',
  submit: 'WebPage',
  wall: 'CollectionPage',
  newsletter: 'WebPage',
  pro: 'WebPage',
  api: 'WebPage',
  search: 'SearchResultsPage',
  tags: 'CollectionPage',
  popular: 'CollectionPage',
  support: 'FAQPage',
  privacy: 'WebPage',
  cookies: 'WebPage',
  disclaimer: 'WebPage',
  blog: 'CollectionPage',
  article: 'WebPage',
  author: 'ProfilePage',
};

export function webPage(entry: PageEntry, lang: Lang, url: string, _image: string, hasCrumbs: boolean, extra: Node = {}): Node {
  const published = entry.article ? entry.article.published : entry.tool ? entry.tool.data.added : undefined;
  return {
    '@type': PAGE_TYPE[entry.kind],
    '@id': ids.page(url),
    url,
    name: entry.title[lang],
    description: entry.description[lang],
    inLanguage: langTag[lang],
    isPartOf: { '@id': ids.website() },
    publisher: { '@id': ids.organization() },
    author: { '@id': ids.person() },
    ...(published ? { datePublished: iso(published) } : {}),
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
  'video-audio': 'MultimediaApplication',
  typography: 'DesignApplication',
  inspiration: 'DesignApplication',
  assets: 'MultimediaApplication',
  utilities: 'UtilitiesApplication',
  'web-galleries': 'DesignApplication',
  branding: 'DesignApplication',
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

/** FAQPage node. Answers must be built from real catalog or article data, never invented. */
export function faqPage(url: string, qa: { q: string; a: string }[]): Node {
  return {
    '@type': 'FAQPage',
    '@id': url + '#faq',
    url,
    mainEntity: qa.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

/** HowTo node for instructional articles with ordered steps visible on the page. */
export function howTo(url: string, name: string, description: string, steps: { name: string; text: string }[]): Node {
  return {
    '@type': 'HowTo',
    '@id': url + '#howto',
    name,
    description,
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

/** BlogPosting / Article / NewsArticle for an article page. Dates and names come from the article's frontmatter. */
export function blogPosting(url: string, entry: PageEntry, lang: Lang): Node {
  const a = entry.article!;
  const d = a.entry[lang].data;
  const words = a.text[lang].split(/\s+/).filter(Boolean).length;
  return {
    '@type': d.type === 'news' ? ['NewsArticle', 'BlogPosting'] : ['BlogPosting', 'Article'],
    '@id': url + '#article',
    headline: d.title,
    description: d.description,
    url,
    mainEntityOfPage: { '@id': ids.page(url) },
    inLanguage: langTag[lang],
    datePublished: iso(a.published),
    dateModified: iso(a.updated),
    author: { '@id': ids.person() },
    publisher: { '@id': ids.organization() },
    image: { '@id': ids.image(url) },
    wordCount: words,
    timeRequired: `PT${a.minutes[lang]}M`,
    keywords: [d.primaryKeyword, ...d.secondaryKeywords].join(', '),
    isPartOf: { '@id': ids.website() },
  };
}
