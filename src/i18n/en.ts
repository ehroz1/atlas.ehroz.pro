/**
 * Interface strings. Keys are grouped by where they appear.
 * When adding Russian, copy this file to ru.ts and translate the values;
 * TypeScript will flag any missing key.
 */
export const en = {
  'site.name': 'Atlas',
  'site.title': 'Atlas — useful sites and tools, sorted',
  'site.description':
    'A hand-picked index of useful websites and tools for makers, developers and anyone curious. Search it or browse by category.',

  'nav.home': 'Atlas home',
  'nav.sites': 'Sites',
  'nav.categories': 'Categories',
  'nav.sections': 'Sections',
  'nav.about': 'About',
  'nav.submit': 'Submit a site',
  'nav.submitShort': 'Submit',
  'nav.skip': 'Skip to content',

  'hero.statement': 'A hand-picked index of useful websites and tools for makers, developers and the curious.',
  'hero.aside': 'Know a good one?',
  'hero.asideLink': 'Send it over',

  'search.label': 'Search sites and tools',
  'search.placeholder': 'Search & filter',
  'search.clear': 'Clear search',
  'search.panel.categories': 'Categories',
  'search.panel.sites': 'Sites',
  'search.panel.none': 'Nothing matches “{query}”.',
  'search.panel.all': 'All results for “{query}”',

  'filter.all': 'All',
  'filter.label': 'Categories',

  'results.count.one': '{count} site',
  'results.count.other': '{count} sites',
  'results.empty.title': 'Nothing for “{query}”',
  'results.empty.body': 'Try a shorter word, or look through all categories.',
  'results.empty.reset': 'Clear search',

  'pricing.free': 'Free',
  'pricing.freemium': 'Free plan',
  'pricing.paid': 'Paid',
  'pricing.openSource': 'Open source',

  'tool.back': 'All sites',
  'tool.visit': 'Open {domain}',
  'tool.category': 'Category',
  'tool.pricing': 'Pricing',
  'tool.platforms': 'Works on',
  'tool.tags': 'Tags',
  'tool.added': 'Added',
  'tool.more': 'More in {category}',
  'tool.seeAll': 'See all',
  'tool.copy': 'Copy link',
  'tool.copied': 'Copied',

  'category.title': '{category} tools and websites',
  'categories.title': 'Categories',
  'categories.lead': 'Every site in Atlas sits in one of these.',

  'footer.note': 'Curated by hand. No sponsored placements.',
  'footer.updated': 'Updated {date}',

  'notFound.title': 'This page isn’t in the atlas',
  'notFound.body': 'The link may be old, or the site was removed from the list.',
  'notFound.home': 'Back to all sites',
} as const;

export type UIKey = keyof typeof en;
