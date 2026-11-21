/**
 * Sends the monthly "five finds" email.
 *
 *   node scripts/newsletter.mjs              # preview only: writes newsletter-preview/*.html
 *   node scripts/newsletter.mjs --send       # sends to every subscriber
 *   node scripts/newsletter.mjs --to me@x.y  # sends one test email
 *   ISSUE=2026-12 node scripts/newsletter.mjs …  # a specific issue (default: this month)
 *
 * Env (GitHub Actions secrets for .github/workflows/newsletter.yml):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  read the subscriber list (server only, never in the site)
 *   RESEND_API_KEY                           send (resend.com free plan: 3,000 emails/month, 100/day)
 *   NEWSLETTER_FROM                          e.g. "Atlas <hello@ehroz.pro>" on a domain verified in Resend
 *   SITE_URL                                 default https://atlas.ehroz.pro
 *
 * Which five: src/lib/picks.mjs (your list in src/data/newsletter.json wins).
 */
import fs from 'node:fs';
import path from 'node:path';
import { picksFor, issueKey } from '../src/lib/picks.mjs';

const args = process.argv.slice(2);
const SEND = args.includes('--send');
const TO = args.includes('--to') ? args[args.indexOf('--to') + 1] : '';
const SITE = (process.env.SITE_URL || 'https://atlas.ehroz.pro').replace(/\/$/, '');
const KEY = process.env.ISSUE || issueKey(new Date());

const tools = JSON.parse(fs.readFileSync('src/data/tools.json', 'utf8'));
const categories = JSON.parse(fs.readFileSync('src/data/categories.json', 'utf8'));
const overrides = JSON.parse(fs.readFileSync('src/data/newsletter.json', 'utf8'));
const catName = new Map(categories.map((c) => [c.id, c.name]));
const ids = picksFor(tools, KEY, overrides);
const picks = ids.map((id) => tools.find((t) => t.id === id));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const loc = (v, lang) => (v ? v[lang] ?? v.en : '');
const [y, m] = KEY.split('-').map(Number);
const monthName = (lang) => new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)));

const T = {
  en: { subject: (mo) => `Five finds · ${mo}`, intro: 'Five sites worth your time this month.', note: 'Note', open: 'Open', unsub: 'Unsubscribe', why: 'You get this because you subscribed on Atlas.', all: 'All sites on Atlas' },
  ru: { subject: (mo) => `Пять находок · ${mo}`, intro: 'Пять сайтов, на которые стоит потратить время в этом месяце.', note: 'Заметка', open: 'Открыть', unsub: 'Отписаться', why: 'Вы получили письмо, потому что подписались на Atlas.', all: 'Все сайты Atlas' },
};

function render(lang, unsubToken) {
  const t = T[lang];
  const prefix = lang === 'en' ? '' : `/${lang}`;
  const utm = `utm_source=newsletter&utm_medium=email&utm_campaign=${KEY}`;
  const unsub = `${SITE}${prefix}/newsletter/?unsubscribe=${unsubToken ?? 'TOKEN'}`;
  const items = picks
    .map((p, i) => {
      const page = `${SITE}${prefix}/tool/${p.id}/?${utm}`;
      const note = loc(p.note, lang);
      return `
      <tr><td style="padding:0 0 28px">
        <a href="${page}" style="text-decoration:none;color:#111">
          <img src="${SITE}/og/${lang}/tool/${p.id}.png" width="520" alt="" style="display:block;width:100%;max-width:520px;height:auto;border-radius:12px;border:1px solid #e5e5e5">
        </a>
        <p style="margin:14px 0 4px;font:600 18px/1.3 -apple-system,Segoe UI,Roboto,sans-serif;color:#111">${i + 1}. <a href="${page}" style="color:#111;text-decoration:none">${esc(p.name)}</a>
          <span style="font-weight:400;color:#888;font-size:14px"> · ${esc(loc(catName.get(p.category), lang))}</span></p>
        <p style="margin:0;font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#333">${esc(loc(p.description, lang))}</p>
        ${note ? `<p style="margin:8px 0 0;padding-left:10px;border-left:2px solid #2a78ff;font:italic 14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#444">${esc(note)}</p>` : ''}
        <p style="margin:10px 0 0"><a href="${page}" style="font:600 14px -apple-system,Segoe UI,Roboto,sans-serif;color:#2a78ff">${t.open} ↗</a></p>
      </td></tr>`;
    })
    .join('');
  const subject = t.subject(monthName(lang));
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(subject)}</title></head>
<body style="margin:0;background:#f4f4f4">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;padding:28px 20px">
  <tr><td style="padding:0 0 24px">
    <p style="margin:0;font:600 14px -apple-system,Segoe UI,Roboto,sans-serif;color:#888">Atlas · ${esc(monthName(lang))}</p>
    <h1 style="margin:6px 0 0;font:600 26px/1.2 -apple-system,Segoe UI,Roboto,sans-serif;color:#111">${esc(subject)}</h1>
    <p style="margin:8px 0 0;font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#555">${t.intro}</p>
  </td></tr>
  ${items}
  <tr><td style="padding-top:8px;border-top:1px solid #eee;font:13px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#888">
    <a href="${SITE}${prefix}/?${utm}" style="color:#555">${t.all}</a><br>${t.why}
    <a href="${unsub}" style="color:#888">${t.unsub}</a>
  </td></tr>
</table></td></tr></table></body></html>`;
  const text = [subject, '', t.intro, '', ...picks.map((p, i) => `${i + 1}. ${p.name} — ${loc(p.description, lang)}\n${SITE}${prefix}/tool/${p.id}/`), '', `${t.unsub}: ${unsub}`].join('\n');
  return { subject, html, text, unsub };
}

async function subscribers() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to send');
  const out = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${url}/rest/v1/profiles?select=email,lang,unsub_token&newsletter=eq.true&email=not.is.null&order=created_at`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    const page = await res.json();
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

async function sendBatch(emails) {
  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(emails),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

const message = (to, lang, token) => {
  const r = render(lang, token);
  return {
    from: process.env.NEWSLETTER_FROM,
    to: [to],
    subject: r.subject,
    html: r.html,
    text: r.text,
    headers: { 'List-Unsubscribe': `<${r.unsub}>` },
  };
};

console.log(`Issue ${KEY}: ${ids.join(', ')}`);
if (picks.length === 0) throw new Error('nothing to send');

if (!SEND && !TO) {
  fs.mkdirSync('newsletter-preview', { recursive: true });
  for (const lang of ['en', 'ru']) fs.writeFileSync(path.join('newsletter-preview', `${KEY}.${lang}.html`), render(lang).html);
  console.log('Preview written to newsletter-preview/. Use --to you@example.com for a test or --send to send.');
} else {
  if (!process.env.RESEND_API_KEY || !process.env.NEWSLETTER_FROM) throw new Error('RESEND_API_KEY and NEWSLETTER_FROM are required');
  if (TO) {
    await sendBatch([message(TO, process.env.LANG_TEST || 'ru', 'TEST')]);
    console.log(`Test sent to ${TO}`);
  } else {
    const list = await subscribers();
    console.log(`${list.length} subscribers`);
    for (let i = 0; i < list.length; i += 100) {
      await sendBatch(list.slice(i, i + 100).map((s) => message(s.email, s.lang === 'ru' ? 'ru' : 'en', s.unsub_token)));
      console.log(`sent ${Math.min(i + 100, list.length)}/${list.length}`);
    }
  }
}
