#!/usr/bin/env node
/**
 * Tells IndexNow (Yandex, Bing and others) about pages that changed:
 * sitemap URLs whose lastmod is within the last DAYS days (default 3).
 *   node scripts/indexnow.mjs            # changed pages
 *   ALL=1 node scripts/indexnow.mjs      # every page in the sitemap
 * The key comes from src/analytics.config.ts; public/<key>.txt proves it.
 */
import fs from 'node:fs';

const SITE = (process.env.SITE ?? 'https://atlas.ehroz.pro').replace(/\/$/, '');
const DAYS = Number(process.env.DAYS ?? 3);
const key = fs.readFileSync(new URL('../src/analytics.config.ts', import.meta.url), 'utf8').match(/INDEXNOW_KEY = '([^']*)'/)?.[1];
if (!key) {
  console.log('No INDEXNOW_KEY in src/analytics.config.ts, nothing to do.');
  process.exit(0);
}

const keyFile = await fetch(`${SITE}/${key}.txt`);
if (!keyFile.ok || (await keyFile.text()).trim() !== key) {
  console.error(`${SITE}/${key}.txt is missing or wrong; deploy it first.`);
  process.exit(1);
}

const idx = await (await fetch(`${SITE}/sitemap-index.xml`)).text();
const entries = [];
for (const [, map] of idx.matchAll(/<loc>(.*?)<\/loc>/g)) {
  const xml = await (await fetch(map)).text();
  for (const [, block] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g))
    entries.push({ loc: block.match(/<loc>(.*?)<\/loc>/)[1], lastmod: block.match(/<lastmod>(.*?)<\/lastmod>/)?.[1] });
}
const since = Date.now() - DAYS * 86400000;
const urls = entries.filter((e) => process.env.ALL || (e.lastmod && Date.parse(e.lastmod) >= since)).map((e) => e.loc);
console.log(`${entries.length} URLs in sitemap, ${urls.length} to submit${process.env.ALL ? ' (ALL)' : ` (changed in the last ${DAYS} days)`}`);
if (!urls.length) process.exit(0);

const host = new URL(SITE).host;
let failed = 0;
for (const endpoint of ['https://api.indexnow.org/indexnow', 'https://yandex.com/indexnow']) {
  for (let i = 0; i < urls.length; i += 10000) {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key, keyLocation: `${SITE}/${key}.txt`, urlList: urls.slice(i, i + 10000) }),
    });
    console.log(`${endpoint} → ${r.status}`);
    if (![200, 202].includes(r.status)) {
      failed++;
      console.log(await r.text().catch(() => ''));
    }
  }
}
process.exit(failed === 2 ? 1 : 0);
