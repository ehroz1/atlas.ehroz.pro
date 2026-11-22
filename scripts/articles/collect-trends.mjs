#!/usr/bin/env node
/**
 * Step 1: collect trend signals into content-pipeline/<date>/trends.json.
 *
 * Every source is optional: a source without its credentials is skipped
 * with a note, a source that fails doesn't stop the others.
 *
 *  seeds          scripts/articles/seeds.txt — queries you paste by hand
 *                 (Yandex Wordstat, Google Trends "rising", ideas)
 *  gsc            Google Search Console: GSC_SERVICE_ACCOUNT (JSON key), GSC_SITE (e.g. sc-domain:atlas.ehroz.pro)
 *  yandex         Yandex Webmaster: YANDEX_WEBMASTER_TOKEN, YANDEX_USER_ID, YANDEX_HOST_ID
 *  hackernews     Show HN posts of the last 7 days (no key)
 *  github         new repositories with many stars (GITHUB_TOKEN optional)
 *  reddit         top posts of the week in design / dev subreddits (no key, often rate-limited)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, runDir } from './lib/catalog.mjs';

const DAY = 864e5;
const since = (days) => new Date(Date.now() - days * DAY).toISOString().slice(0, 10);
const UA = 'atlas-article-pipeline/1.0';

async function getJson(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} ← ${url.split('?')[0]}`);
  return res.json();
}

// ---- sources -----------------------------------------------------------

async function seeds() {
  const file = path.join(ROOT, 'scripts/articles/seeds.txt');
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((query) => ({ source: 'seeds', query, lang: /[а-яё]/i.test(query) ? 'ru' : 'en' }));
}

/** Service-account JWT → access token (no googleapis dependency). */
async function googleToken(key, scope) {
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: key.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url');
  const data = await getJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
  });
  return data.access_token;
}

/** Queries with impressions where we are close to the top or barely clicked. */
async function gsc() {
  const { GSC_SERVICE_ACCOUNT, GSC_SITE } = process.env;
  if (!GSC_SERVICE_ACCOUNT || !GSC_SITE) return skip('gsc', 'GSC_SERVICE_ACCOUNT / GSC_SITE not set');
  const token = await googleToken(JSON.parse(GSC_SERVICE_ACCOUNT), 'https://www.googleapis.com/auth/webmasters.readonly');
  const data = await getJson(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate: since(30), endDate: since(2), dimensions: ['query', 'page'], rowLimit: 2000 }),
  });
  return (data.rows ?? [])
    .filter((r) => r.impressions >= 10 && ((r.position >= 6 && r.position <= 30) || r.ctr < 0.02))
    .map((r) => ({
      source: 'gsc',
      query: r.keys[0],
      page: r.keys[1],
      lang: /[а-яё]/i.test(r.keys[0]) ? 'ru' : 'en',
      impressions: r.impressions,
      clicks: r.clicks,
      position: Math.round(r.position * 10) / 10,
    }));
}

async function yandex() {
  const { YANDEX_WEBMASTER_TOKEN: token, YANDEX_USER_ID: user, YANDEX_HOST_ID: host } = process.env;
  if (!token || !user || !host) return skip('yandex', 'YANDEX_WEBMASTER_TOKEN / YANDEX_USER_ID / YANDEX_HOST_ID not set');
  const qs = new URLSearchParams({ order_by: 'TOTAL_SHOWS', date_from: since(30), date_to: since(2), limit: '500' });
  for (const i of ['TOTAL_SHOWS', 'TOTAL_CLICKS', 'AVG_SHOW_POSITION']) qs.append('query_indicator', i);
  const data = await getJson(`https://api.webmaster.yandex.net/v4/user/${user}/hosts/${encodeURIComponent(host)}/search-queries/popular?${qs}`, {
    headers: { Authorization: `OAuth ${token}` },
  });
  return (data.queries ?? []).map((q) => ({
    source: 'yandex',
    query: q.query_text,
    lang: 'ru',
    impressions: q.indicators?.TOTAL_SHOWS,
    clicks: q.indicators?.TOTAL_CLICKS,
    position: q.indicators?.AVG_SHOW_POSITION,
  }));
}

async function hackernews() {
  const ts = Math.floor((Date.now() - 7 * DAY) / 1000);
  const data = await getJson(`https://hn.algolia.com/api/v1/search?tags=show_hn&numericFilters=created_at_i>${ts},points>40&hitsPerPage=50`);
  return data.hits.map((h) => ({ source: 'hackernews', query: h.title.replace(/^Show HN:\s*/i, ''), url: h.url, points: h.points, lang: 'en' }));
}

async function github() {
  const headers = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
  const q = encodeURIComponent(`created:>${since(14)} stars:>300`);
  const url = `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=30`;
  // a token that doesn't work here (401) shouldn't lose the source: retry anonymously
  const data = await getJson(url, { headers }).catch((e) => (headers.Authorization && /^401/.test(e.message) ? getJson(url) : Promise.reject(e)));
  return data.items.map((r) => ({ source: 'github', query: `${r.full_name}: ${r.description ?? ''}`.trim(), url: r.homepage || r.html_url, stars: r.stargazers_count, lang: 'en' }));
}

async function reddit() {
  const out = [];
  for (const sub of ['webdev', 'web_design', 'graphic_design', 'UI_Design', 'SideProject']) {
    try {
      const data = await getJson(`https://www.reddit.com/r/${sub}/top.json?t=week&limit=15`);
      for (const p of data.data.children) out.push({ source: `reddit/${sub}`, query: p.data.title, score: p.data.score, lang: 'en' });
    } catch (e) {
      notes.push(`reddit/${sub}: ${e.message}`);
    }
  }
  return out;
}

// ---- run ---------------------------------------------------------------

const notes = [];
function skip(name, why) {
  notes.push(`${name}: skipped (${why})`);
  return [];
}

const sources = { seeds, gsc, yandex, hackernews, github, reddit };
const signals = [];
for (const [name, fn] of Object.entries(sources)) {
  try {
    const got = await fn();
    signals.push(...got);
    console.log(`${name}: ${got.length}`);
  } catch (e) {
    notes.push(`${name}: failed (${e.message})`);
    console.log(`${name}: failed — ${e.message}`);
  }
}

const out = path.join(runDir(), 'trends.json');
fs.writeFileSync(out, JSON.stringify({ collected: new Date().toISOString(), notes, signals }, null, 2));
console.log(`\n${signals.length} signals → ${path.relative(ROOT, out)}`);
if (notes.length) console.log(notes.map((n) => '  · ' + n).join('\n'));
