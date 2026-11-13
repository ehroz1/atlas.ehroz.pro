#!/usr/bin/env node
/**
 * npm run check:seo — checks the built site in dist/ (run after `npm run build`).
 *
 * Errors (exit 1):
 *  - broken internal links, images and hreflang targets
 *  - title missing, longer than 60 or duplicated; description outside 50–160 or duplicated
 *  - not exactly one h1; heading levels that skip (h2 → h4)
 *  - missing Open Graph / Twitter Card tags, canonical, hreflang
 *  - sitemap ↔ pages mismatch, missing lastmod
 *  - JSON-LD: invalid JSON, not exactly one @graph, duplicate @id, @id references that don't resolve
 *  - orphan pages and pages deeper than 3 clicks from the home page
 *  - 404 without noindex or with a canonical
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';

const DIST = path.resolve(process.argv[2] ?? 'dist');
const errors = [];
const warnings = [];
const err = (page, msg) => errors.push(`${page}: ${msg}`);
const warn = (page, msg) => warnings.push(`${page}: ${msg}`);

if (!fs.existsSync(DIST)) {
  console.error(`No ${DIST}. Run npm run build first.`);
  process.exit(1);
}

// ---- sitemap: tells us the origin + base the site was built for ----------
const read = (p) => fs.readFileSync(path.join(DIST, p), 'utf8');
const sitemapXml = read('sitemap-0.xml');
const sitemapIndex = read('sitemap-index.xml');
const sitemap = [...sitemapXml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
  loc: m[1].match(/<loc>(.*?)<\/loc>/)?.[1],
  lastmod: m[1].match(/<lastmod>(.*?)<\/lastmod>/)?.[1],
}));
if (!sitemap.length) err('sitemap-0.xml', 'no <url> entries');
if (!/<loc>.*sitemap-0\.xml<\/loc>/.test(sitemapIndex)) err('sitemap-index.xml', 'does not list sitemap-0.xml');
const first = new URL(sitemap[0].loc);
const ORIGIN = first.origin;
// base = path of the default-language home page (the first entry)
const BASE = first.pathname.replace(/\/$/, '');

/** site URL → file in dist (or null) */
function fileFor(urlPath) {
  let p = decodeURIComponent(urlPath);
  if (BASE && p.startsWith(BASE)) p = p.slice(BASE.length) || '/';
  const candidates = p.endsWith('/') ? [p + 'index.html'] : [p, p + '/index.html', p + '.html'];
  for (const c of candidates) {
    const f = path.join(DIST, c);
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  return null;
}
const pageUrlOf = (file) => {
  const rel = '/' + path.relative(DIST, file).split(path.sep).join('/');
  return BASE + rel.replace(/index\.html$/, '').replace(/\.html$/, '');
};

// ---- collect pages ------------------------------------------------------
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) files.push(p);
  }
})(DIST);

const pages = new Map(); // urlPath → info
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const doc = parse(html, { comment: false });
  const url = pageUrlOf(file);
  const meta = (sel) => doc.querySelector(sel)?.getAttribute('content') ?? null;
  const robots = meta('meta[name="robots"]') ?? '';
  pages.set(url, {
    file,
    url,
    doc,
    html,
    is404: /\/404(\.html)?$/.test(url),
    noindex: /noindex/.test(robots),
    title: doc.querySelector('title')?.text.trim() ?? '',
    description: meta('meta[name="description"]'),
    canonical: doc.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
    links: doc.querySelectorAll('a[href]').map((a) => a.getAttribute('href')),
  });
}

// ---- per-page checks ---------------------------------------------------
const titles = new Map();
const descs = new Map();
for (const p of pages.values()) {
  const { doc, url } = p;

  if (p.is404) {
    if (!p.noindex) err(url, '404 page must be noindex');
    if (p.canonical) err(url, '404 page must not have a canonical');
  }

  // title / description
  if (!p.title) err(url, 'no <title>');
  else if (p.title.length > 60) err(url, `title is ${p.title.length} chars (max 60): "${p.title}"`);
  if (!p.description) err(url, 'no meta description');
  else if (p.description.length < 50 || p.description.length > 160)
    err(url, `description is ${p.description.length} chars (50–160): "${p.description}"`);
  if (!p.noindex) {
    titles.set(p.title, [...(titles.get(p.title) ?? []), url]);
    descs.set(p.description, [...(descs.get(p.description) ?? []), url]);
  }

  // headings
  const hs = doc.querySelectorAll('h1, h2, h3, h4, h5, h6').map((h) => Number(h.tagName[1]));
  const h1s = hs.filter((n) => n === 1).length;
  if (h1s !== 1) err(url, `${h1s} <h1> elements (need exactly 1)`);
  for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) err(url, `heading jumps from h${hs[i - 1]} to h${hs[i]}`);
  if (hs[0] && hs[0] !== 1) err(url, `first heading is h${hs[0]}, not h1`);

  // social
  for (const prop of ['og:title', 'og:description', 'og:image', 'og:type', 'og:locale'])
    if (!doc.querySelector(`meta[property="${prop}"]`)) err(url, `missing ${prop}`);
  for (const name of ['twitter:card', 'twitter:title', 'twitter:image'])
    if (!doc.querySelector(`meta[name="${name}"]`)) err(url, `missing ${name}`);
  const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
  if (ogImage && ogImage.startsWith(ORIGIN) && !fileFor(new URL(ogImage).pathname)) err(url, `og:image not built: ${ogImage}`);

  if (!p.noindex) {
    // canonical + hreflang
    const self = ORIGIN + url;
    if (!p.canonical) err(url, 'no canonical');
    else if (p.canonical !== self) err(url, `canonical ${p.canonical} ≠ ${self}`);
    if (p.canonical?.includes('?')) err(url, 'canonical has query parameters');
    if (!doc.querySelector('meta[property="og:url"]')) err(url, 'missing og:url');
    if (!doc.querySelector('meta[property="og:updated_time"]')) err(url, 'missing og:updated_time');
    const alts = doc.querySelectorAll('link[rel="alternate"][hreflang]');
    const langs = alts.map((a) => a.getAttribute('hreflang'));
    for (const need of ['ru', 'en', 'x-default']) if (!langs.includes(need)) err(url, `missing hreflang="${need}"`);
    if (!alts.some((a) => a.getAttribute('href') === self)) err(url, 'hreflang set does not include the page itself');
    for (const a of alts) {
      const href = a.getAttribute('href');
      if (!fileFor(new URL(href).pathname)) err(url, `hreflang target missing: ${href}`);
    }
  }

  // links and images
  for (const href of p.links) {
    if (!href || /^(mailto:|tel:|javascript:|#)/.test(href)) continue;
    let target;
    try {
      target = new URL(href, ORIGIN + url);
    } catch {
      err(url, `bad link ${href}`);
      continue;
    }
    if (target.origin !== ORIGIN) continue;
    if (!fileFor(target.pathname)) err(url, `broken link → ${href}`);
  }
  for (const img of doc.querySelectorAll('img[src]')) {
    const src = img.getAttribute('src');
    if (src.startsWith('data:')) continue;
    const t = new URL(src, ORIGIN + url);
    if (t.origin === ORIGIN && !fileFor(t.pathname)) err(url, `missing image ${src}`);
    if (!img.hasAttribute('alt')) err(url, `image without alt: ${src}`);
    if (!img.getAttribute('width') || !img.getAttribute('height')) warn(url, `image without width/height: ${src}`);
  }

  // JSON-LD
  const blocks = doc.querySelectorAll('script[type="application/ld+json"]');
  if (!p.noindex && blocks.length !== 1) err(url, `${blocks.length} JSON-LD blocks (need exactly 1 @graph)`);
  for (const b of blocks) {
    let data;
    try {
      data = JSON.parse(b.text);
    } catch (e) {
      err(url, `JSON-LD is not valid JSON: ${e.message}`);
      continue;
    }
    if (!Array.isArray(data['@graph'])) {
      err(url, 'JSON-LD has no @graph');
      continue;
    }
    const ids = new Set();
    for (const n of data['@graph']) {
      if (!n['@type']) err(url, 'JSON-LD node without @type');
      if (n['@id']) {
        if (ids.has(n['@id'])) err(url, `duplicate @id ${n['@id']}`);
        ids.add(n['@id']);
      }
    }
    const refs = [];
    (function walk(v, top) {
      if (Array.isArray(v)) v.forEach((x) => walk(x, false));
      else if (v && typeof v === 'object') {
        const keys = Object.keys(v);
        if (!top && keys.length === 1 && keys[0] === '@id') refs.push(v['@id']);
        for (const k of keys) walk(v[k], false);
      }
    })(data['@graph'], false);
    for (const r of refs) if (!ids.has(r)) err(url, `JSON-LD reference to missing @id ${r}`);
    if (/"(aggregateRating|review|offers)"/.test(b.text)) warn(url, 'JSON-LD has ratings/reviews/offers: make sure they are real');
  }

  // a11y basics checked here too
  if (!doc.querySelector('html')?.getAttribute('lang')) err(url, 'no <html lang>');
  if (!doc.querySelector('main')) err(url, 'no <main>');
  if (!doc.querySelector('a.skip-link[href="#main"]')) err(url, 'no skip link');
  if (!doc.querySelector('meta[http-equiv="Content-Security-Policy"]')) err(url, 'no CSP meta');
}

for (const [t, urls] of titles) if (urls.length > 1) err(urls.join(', '), `duplicate title "${t}"`);
for (const [d, urls] of descs) if (urls.length > 1) err(urls.join(', '), `duplicate description "${d}"`);

// ---- sitemap ↔ pages ---------------------------------------------------
const inSitemap = new Set();
for (const { loc, lastmod } of sitemap) {
  const u = new URL(loc);
  if (u.origin !== ORIGIN) err('sitemap', `foreign URL ${loc}`);
  inSitemap.add(u.pathname);
  const page = pages.get(u.pathname);
  if (!page) err('sitemap', `URL without a page: ${loc}`);
  else if (page.noindex) err('sitemap', `noindex page in sitemap: ${loc}`);
  if (!lastmod) err('sitemap', `no lastmod: ${loc}`);
  else if (!/^\d{4}-\d{2}-\d{2}/.test(lastmod)) err('sitemap', `bad lastmod ${lastmod}: ${loc}`);
}
for (const p of pages.values()) if (!p.noindex && !inSitemap.has(p.url)) err(p.url, 'indexable page missing from sitemap');

// ---- orphans and click depth (BFS from each language's home) ----------
const graph = new Map();
for (const p of pages.values()) {
  const out = new Set();
  for (const href of p.links) {
    if (!href || /^(mailto:|tel:|#)/.test(href)) continue;
    try {
      const t = new URL(href, ORIGIN + p.url);
      if (t.origin === ORIGIN && pages.has(t.pathname)) out.add(t.pathname);
    } catch {}
  }
  graph.set(p.url, out);
}
const homes = [...pages.values()].filter((p) => !p.noindex && /^(\/[a-z]{2})?\/$/.test(p.url.slice(BASE.length) || '/')).map((p) => p.url);
const depth = new Map(homes.map((h) => [h, 0]));
const queue = [...homes];
while (queue.length) {
  const cur = queue.shift();
  for (const next of graph.get(cur) ?? []) if (!depth.has(next)) depth.set(next, depth.get(cur) + 1), queue.push(next);
}
const linkedFrom = new Map();
for (const [from, outs] of graph) for (const to of outs) if (to !== from) linkedFrom.set(to, (linkedFrom.get(to) ?? 0) + 1);
for (const p of pages.values()) {
  if (p.noindex) continue;
  if (!homes.includes(p.url) && !linkedFrom.get(p.url)) err(p.url, 'orphan page: nothing links to it');
  const d = depth.get(p.url);
  if (d === undefined) err(p.url, 'not reachable from the home page');
  else if (d > 3) err(p.url, `${d} clicks from the home page (max 3)`);
}

// ---- robots / llms -----------------------------------------------------
const robots = read('robots.txt');
if (!/Sitemap: /.test(robots)) warn('robots.txt', 'no Sitemap line (expected on non-production builds)');
for (const f of ['llms.txt', 'llms-full.txt']) if (!fs.existsSync(path.join(DIST, f))) err(f, 'missing');

// ---- report ------------------------------------------------------------
const indexable = [...pages.values()].filter((p) => !p.noindex).length;
console.log(`check:seo — ${pages.size} HTML pages (${indexable} indexable), ${sitemap.length} sitemap URLs, origin ${ORIGIN}${BASE}`);
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings.slice(0, 50)) console.log('  ⚠ ' + w);
  if (warnings.length > 50) console.log(`  … and ${warnings.length - 50} more`);
}
if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  for (const e of errors.slice(0, 200)) console.log('  ✗ ' + e);
  if (errors.length > 200) console.log(`  … and ${errors.length - 200} more`);
  process.exit(1);
}
console.log('\n✓ all SEO checks passed');
