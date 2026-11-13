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
  'nav.wall': 'Wall',
  'nav.categories': 'Categories',
  'nav.menu': 'Menu',
  'nav.sections': 'Sections',
  'nav.about': 'About',
  'nav.submit': 'Submit a site',
  'nav.submitShort': 'Submit',
  'nav.skip': 'Skip to content',

  'hero.statement': 'A hand-picked index of useful websites and tools for makers, developers and the curious.',
  'hero.title': 'Browse {count} hand-picked sites',
  'hero.sub': 'For makers, developers and the curious',
  'hero.cta': 'Submit a site',
  'hero.aside': 'Know a good one?',
  'hero.asideLink': 'Send it over',

  'search.label': 'Search sites and tools',
  'search.placeholder': 'Search & filter',
  'search.clear': 'Clear search',
  'search.input': 'Search',
  'search.facet.category': 'Category',
  'search.facet.pricing': 'Pricing',
  'search.facet.platform': 'Platform',
  'search.sites': 'Sites',
  'search.none': 'Nothing matches. Try fewer words or clear the filters.',
  'search.noCategories': 'No category with that name.',
  'search.clearAll': 'Clear all',
  'search.done': 'Done',
  'search.filters.one': '{count} filter',
  'search.filters.other': '{count} filters',
  'menu.shortcut': 'opens search',

  'filter.all': 'All',
  'filter.label': 'Categories',

  'results.count.one': '{count} site',
  'results.count.other': '{count} sites',
  'results.empty.title': 'Nothing matches',
  'results.empty.body': 'Try a shorter word or fewer filters.',
  'results.empty.reset': 'Clear search and filters',

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
