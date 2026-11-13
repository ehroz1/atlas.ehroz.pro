/**
 * All analytics IDs and search-engine verification codes live here.
 * Leave a value empty and that counter / tag simply isn't rendered:
 * with every ID empty there is no counter, no cookie and no consent banner.
 */
export const analytics = {
  /** Google Analytics 4 measurement ID, "G-XXXXXXXXXX" */
  ga4: '',
  /** Yandex Metrika counter number, e.g. "98765432" */
  metrika: '',
  /** Metrika Webvisor (session recording) */
  webvisor: false,
};

/** <meta> verification codes. Rendered only on the production domain. */
export const SEARCH_VERIFICATION = {
  /** Google Search Console, HTML tag "content" value (not needed for a DNS-verified domain property) */
  google: '',
  /** Yandex Webmaster, "Метатег" tab, the content value */
  yandex: '',
  /** Bing Webmaster, msvalidate.01 content value */
  bing: '',
};

/** IndexNow key; the matching file is public/<key>.txt */
export const INDEXNOW_KEY = '3131d3161e6c162efaf7ae2e845b59ce';
