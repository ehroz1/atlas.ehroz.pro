#!/usr/bin/env node
/**
 * Weekly check of the live site (GitHub Actions: seo-monitor.yml).
 *   SITE=https://atlas.ehroz.pro node scripts/monitor-seo.mjs
 * Errors fail the run (GitHub then emails the owner); warnings are printed.
 */
import fs from 'node:fs';

const SITE = (process.env.SITE ?? 'https://atlas.ehroz.pro').replace(/\/$/, '');
const MIN_PAGES = Number(process.env.MIN_PAGES ?? 100);
const UA = 'Mozilla/5.0 (compatible; atlas-seo-monitor/1.0; +' + SITE + '/)';
const errors = [];
const warnings = [];
const err = (m) => (errors.push(m), console.log('  ✗ ' + m));
const warn = (m) => (warnings.push(m), console.log('  ⚠ ' + m));
const ok = (m) => console.log('  ✓ ' + m);

async function get(url, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeout ?? 20000);
  try {
    return await fetch(url, { redirect: opts.redirect ?? 'follow', signal: ctrl.signal, headers: { 'user-agent': UA }, method: opts.method ?? 'GET' });
  } finally {
    clearTimeout(timer);
  }
}

async function pool(items, n, fn) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

console.log(`SEO monitor for ${SITE}\n`);

// robots.txt
console.log('robots.txt');
const robots = await get(SITE + '/robots.txt');
const robotsTxt = robots.ok ? await robots.text() : '';
if (!robots.ok) err(`robots.txt → ${robots.status}`);
else {
  ok('robots.txt 200');
  if (!/^Sitemap: /m.test(robotsTxt)) err('robots.txt has no Sitemap line');
  const firstGroup = robotsTxt.split(/\n\s*\n/).find((g) => /User-agent: Googlebot/i.test(g)) ?? '';
  if (/Disallow: \/\s*$/m.test(firstGroup)) err('robots.txt blocks Googlebot');
}

// sitemap
console.log('\nsitemap');
const idx = await get(SITE + '/sitemap-index.xml');
let urls = [];
if (!idx.ok) err(`sitemap-index.xml → ${idx.status}`);
else {
  const maps = [...(await idx.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  for (const m of maps) {
    const r = await get(m);
    if (!r.ok) err(`${m} → ${r.status}`);
    else urls.push(...[...(await r.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map((x) => x[1]));
  }
  ok(`${urls.length} URLs in sitemap`);
  if (urls.length < MIN_PAGES) err(`only ${urls.length} URLs in sitemap (expected ≥ ${MIN_PAGES})`);
}

// every page: 200, indexable, canonical = itself
console.log('\npages');
const pageResults = await pool(urls, 8, async (url) => {
  try {
    const r = await get(url);
    if (r.status !== 200) return err(`${url} → ${r.status}`);
    if (r.url !== url) return err(`${url} redirects to ${r.url}`);
    if (/noindex/i.test(r.headers.get('x-robots-tag') ?? '')) return err(`${url} has X-Robots-Tag noindex`);
    const html = await r.text();
    if (/<meta name="robots" content="[^"]*noindex/i.test(html)) return err(`${url} has meta noindex`);
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    if (canonical !== url) return err(`${url} canonical is ${canonical ?? 'missing'}`);
    return [...html.matchAll(/<a [^>]*href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  } catch (e) {
    return err(`${url} → ${e.message}`);
  }
});
ok(`${urls.length} pages fetched`);

// redirects
console.log('\nredirects');
const home = await get(SITE + '/');
const onVercel = /vercel/i.test(home.headers.get('server') ?? '');
const expectRedirect = async (from, to) => {
  try {
    const r = await get(from, { redirect: 'manual' });
    const loc = r.headers.get('location') ? new URL(r.headers.get('location'), from).href : '';
    if ([301, 308].includes(r.status) && loc === to) ok(`${from} → ${r.status} ${to}`);
    else (onVercel ? err : warn)(`${from} → ${r.status} ${loc || ''} (expected 301 → ${to})`);
  } catch (e) {
    warn(`${from}: ${e.message}`);
  }
};
const host = new URL(SITE).host;
await expectRedirect(`http://${host}/`, `${SITE}/`);
await expectRedirect(`https://www.${host}/`, `${SITE}/`);
await expectRedirect(`${SITE}/about`, `${SITE}/about/`);
await expectRedirect(`${SITE}/index.html`, `${SITE}/`);

// outbound links
console.log('\noutbound links');
const outbound = [...new Set(pageResults.flat().filter((x) => typeof x === 'string'))]
  .map((u) => { try { const x = new URL(u); x.searchParams.delete('ref'); return x.href; } catch { return null; } })
  .filter((u) => u && !u.startsWith(SITE));
const unique = [...new Set(outbound)];
await pool(unique, 6, async (url) => {
  try {
    let r = await get(url, { method: 'HEAD', timeout: 15000 });
    if (r.status === 405 || r.status === 403 || r.status === 400) r = await get(url, { timeout: 15000 });
    if (r.status === 404 || r.status === 410) err(`broken outbound link ${url} → ${r.status}`);
    else if (r.status >= 500) warn(`outbound ${url} → ${r.status}`);
  } catch (e) {
    warn(`outbound ${url} → ${e.cause?.code ?? e.message}`);
  }
});
ok(`${unique.length} outbound links checked`);

console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## SEO monitor\n\n${urls.length} URLs, ${errors.length} errors, ${warnings.length} warnings\n\n${[...errors.map((e) => '- ❌ ' + e), ...warnings.map((w) => '- ⚠️ ' + w)].join('\n')}\n`);
}
process.exit(errors.length ? 1 : 0);
