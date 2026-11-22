/**
 * Fetches page views of every site page (/tool/<id>/, any language) from
 * GoatCounter for the last DAYS days and writes src/data/popular.json,
 * which the Popular page is built from.
 *
 *   GOATCOUNTER_TOKEN=… node scripts/popular.mjs
 *
 * The site code is read from src/analytics.config.ts (or GOATCOUNTER_CODE).
 * The token is an API key with "Read statistics" permission, created in
 * GoatCounter → Settings → API; in CI it is the GOATCOUNTER_TOKEN secret.
 * Without a code or a token, or if the API fails, the existing file is left
 * as it is and the script exits 0, so a build never breaks because of it.
 */
import fs from 'node:fs/promises';

const DAYS = 30;
const OUT = new URL('../src/data/popular.json', import.meta.url);

const config = await fs.readFile(new URL('../src/analytics.config.ts', import.meta.url), 'utf8');
const code = process.env.GOATCOUNTER_CODE || /goatcounter:\s*'([^']*)'/.exec(config)?.[1] || '';
const token = process.env.GOATCOUNTER_TOKEN || '';

const skip = (why) => {
  console.log(`popular: ${why}; keeping src/data/popular.json as it is.`);
  process.exit(0);
};
if (!code) skip('analytics.goatcounter is empty');
if (!/^[a-z0-9-]+$/.test(code)) skip(`"${code}" is not a GoatCounter site code`);
if (!token) skip('GOATCOUNTER_TOKEN is not set');

const day = (d) => d.toISOString().slice(0, 10);
const end = new Date();
const start = new Date(end.getTime() - DAYS * 86_400_000);
const api = `https://${code}.goatcounter.com/api/v0/stats/hits`;

const views = {};
let pages = 0;
const seen = [];
try {
  // pages of 100 paths, most viewed first; exclude_paths pages through the rest
  for (let i = 0; i < 20; i++) {
    const q = new URLSearchParams({ start: day(start), end: day(end), limit: '100' });
    for (const id of seen) q.append('exclude_paths', String(id));
    const res = await fetch(`${api}?${q}`, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    if (res.status === 429) { await new Promise((r) => setTimeout(r, 2000)); i--; continue; }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    for (const h of data.hits ?? []) {
      seen.push(h.path_id);
      const m = /^\/(?:[a-z]{2}\/)?tool\/([^/]+)\/?$/.exec(h.path ?? '');
      if (m) views[m[1]] = (views[m[1]] ?? 0) + (h.count ?? h.count_unique ?? 0);
    }
    pages++;
    if (!data.more || !(data.hits ?? []).length) break;
  }
} catch (e) {
  skip(`GoatCounter API failed (${e.message})`);
}

const sorted = Object.fromEntries(Object.entries(views).sort((a, b) => b[1] - a[1]));
await fs.writeFile(OUT, JSON.stringify({ updated: day(end), days: DAYS, views: sorted }, null, 2) + '\n');
console.log(`popular: ${Object.keys(sorted).length} site pages with views over ${DAYS} days (${pages} API page(s)).`);
