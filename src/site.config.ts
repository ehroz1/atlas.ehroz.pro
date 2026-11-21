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
  submitEmail: 'ehrozkitay@gmail.com',
  /** phone for Telegram and WhatsApp, digits only, with country code */
  submitPhone: '77775971798',
} as const;

/**
 * Atlas Pro. Prices are only shown on /pro/; what is actually charged is set
 * in Gumroad (membership "Atlas Pro"). After a payment Gumroad pings
 * supabase/functions/gumroad-ping, which switches the account to Pro.
 */
export const PRO = {
  monthly: '$3',
  yearly: '$24',
  /** Gumroad membership checkout; PUBLIC_CHECKOUT_MONTHLY / _YEARLY override */
  checkoutMonthly: 'https://ehroz.gumroad.com/l/atlas-pro',
  checkoutYearly: '',
  /** where buyers manage or cancel their membership */
  billingPortal: 'https://app.gumroad.com/library',
  /** free accounts keep this many collections in the cloud (also in supabase/schema.sql) */
  freeCollections: 3,
} as const;

/**
 * Supabase project (accounts, collections, newsletter, member counter).
 * Both values are public by design (access is limited by RLS in
 * supabase/schema.sql); PUBLIC_SUPABASE_URL / _ANON_KEY override them.
 * Set both to '' to switch the backend off.
 */
export const SUPABASE = {
  url: 'https://uqfsxipvbccporjtsfoi.supabase.co',
  anonKey: 'sb_publishable_RWIWeSUBKWz4dGs35_b96w_pAT-HjV9',
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
