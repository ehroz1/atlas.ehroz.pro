/**
 * The one place for the brand, the domain and the author.
 * Pages, schema.org, llms.txt, robots.txt and OG images all read from here,
 * so names stay identical everywhere.
 */
export const SITE = {
  /** brand name, never translated */
  name: 'Atlas',
  /** production host; only this host is indexed */
  host: 'atlas.ehroz.pro',
  /** canonical origin: https, no www, trailing slash */
  url: 'https://atlas.ehroz.pro/',
  /** used for the outbound ?ref= tag */
  ref: 'atlas.ehroz.pro',
  /** address the Submit form writes to */
  submitEmail: 'admin@picta.cc',
} as const;

/** Author. Same facts and the same @id as on ehroz.pro, so search engines join them. */
export const AUTHOR = {
  id: 'https://ehroz.pro/#person',
  name: 'Ehroz',
  alternateName: ['Эхроз', 'EHROZ'],
  url: 'https://ehroz.pro/',
  city: { ru: 'Астана', en: 'Astana' },
  country: 'KZ',
  jobTitle: { ru: 'Дизайнер и разработчик', en: 'Designer & Developer' },
  email: 'ehrozbekisharifzoda@gmail.com',
  telegram: { handle: '@hhrrzz1', url: 'https://t.me/hhrrzz1' },
  sameAs: [
    'https://t.me/hhrrzz1',
    'https://github.com/ehroz1',
    'https://instagram.com/ehroz1',
    'https://www.behance.net/ehroz',
  ],
} as const;

/**
 * robots.txt: AI *search* bots are always allowed. Bots that collect data
 * for model *training* are a separate group controlled by this flag.
 */
export const ALLOW_AI_TRAINING = true;
