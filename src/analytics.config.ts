/**
 * All analytics IDs and search-engine verification codes live here.
 * Leave a value empty and that counter / tag simply isn't rendered:
 * with every ID empty there is no counter, no cookie and no consent banner.
 */
export const analytics = {
  /**
   * GoatCounter site code: "atlas-ehroz" for https://atlas-ehroz.goatcounter.com.
   * Cookieless page-view counter, no consent banner needed. Its numbers feed
   * the Popular page (scripts/popular.mjs at build time). See DEPLOY.md.
   */
  goatcounter: '',
  /** Google Analytics 4 measurement ID, "G-XXXXXXXXXX" */
  ga4: 'G-VMHW04TWE8',
  /** Yandex Metrika counter number, e.g. "98765432" */
  metrika: '114501614',
  /** Metrika Webvisor (session recording) */
  webvisor: false,
};

/** <meta> verification codes. Rendered only on the production domain. */
export const SEARCH_VERIFICATION = {
  /** Google Search Console, HTML tag "content" value (not needed for a DNS-verified domain property) */
  google: '',
  /** Yandex Webmaster, "Метатег" tab, the content value */
  yandex: '6a8b554db1ca875b',
  /** Bing Webmaster, msvalidate.01 content value */
  bing: '9D1F8EDD4BBDBC71259A119F269010ED',
};

/** IndexNow key; the matching file is public/<key>.txt */
export const INDEXNOW_KEY = '3131d3161e6c162efaf7ae2e845b59ce';
