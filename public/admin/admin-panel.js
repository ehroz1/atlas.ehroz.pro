/*
 * Atlas admin, second half: everything that lives in Supabase.
 * Overview, submissions, comment moderation, users, newsletter picks,
 * service links. Uses the session of the account signed in on the site
 * (same origin, so the same localStorage); the database lets through only
 * profiles with is_admin = true (supabase/002_admin_comments_submissions.sql).
 *
 * Runs after admin.js and reuses its helpers: $, el, toast, state, gh,
 * commit, refresh, renderList, openForm, show, domainOf, store.
 */
'use strict';

const SB = 'https://uqfsxipvbccporjtsfoi.supabase.co';
const SB_KEY = 'sb_publishable_RWIWeSUBKWz4dGs35_b96w_pAT-HjV9';
const SB_STORE = 'sb-uqfsxipvbccporjtsfoi-auth-token';
const TABS = ['overview', 'subs', 'comments', 'sites', 'users', 'newsletter', 'services'];
const NEEDS_DB = new Set(['overview', 'subs', 'comments', 'users']);
const SITE = location.pathname.replace(/admin\/?.*$/, ''); // "/" or "/atlas.ehroz.pro/"
const panel = { admin: null, tools: null, fromSubmission: null };

/* ---------- Supabase session and REST ---------- */
function readSession() {
  try { return JSON.parse(localStorage.getItem(SB_STORE) || 'null'); } catch { return null; }
}
async function session() {
  let s = readSession();
  if (!s?.access_token) return null;
  if (s.expires_at && s.expires_at * 1000 < Date.now() + 60_000) {
    const r = await fetch(`${SB}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    });
    if (!r.ok) return null;
    s = await r.json();
    try { localStorage.setItem(SB_STORE, JSON.stringify(s)); } catch {}
  }
  return s;
}
async function db(path, { method = 'GET', body, prefer } = {}) {
  const s = await session();
  if (!s) throw Object.assign(new Error('Нет входа'), { status: 401 });
  const res = await fetch(SB + path, {
    method,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${s.access_token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    let m = String(res.status);
    try { const j = await res.json(); m += ' ' + (j.message || j.error || ''); } catch {}
    throw Object.assign(new Error(m), { status: res.status });
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
const rpc = (name, args = {}) => db(`/rest/v1/rpc/${name}`, { method: 'POST', body: args });

/** null = not signed in, false = signed in but not admin, object = admin profile */
async function whoIsAdmin() {
  const s = await session();
  if (!s) return null;
  const rows = await db(`/rest/v1/profiles?id=eq.${s.user.id}&select=id,email,is_admin`);
  return rows?.[0]?.is_admin ? rows[0] : false;
}

/* ---------- small helpers ---------- */
const fmtDate = (iso) => new Date(iso).toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const toolName = (id) => (panel.tools?.find((t) => t.id === id)?.name) || id;
async function siteTools() {
  // the public API has every site; no GitHub token needed
  if (!panel.tools) {
    const r = await fetch(`${SITE}api/v1/tools.json`, { cache: 'no-store' });
    panel.tools = (await r.json()).tools;
  }
  return panel.tools;
}
function busy(btn, on, text) {
  if (!btn) return;
  if (on) { btn.dataset.label = btn.textContent; btn.textContent = text || '…'; btn.disabled = true; }
  else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
}
const fail = (e) => toast(e.status === 401 || e.status === 403 ? 'Нет прав. Войдите на сайте под аккаунтом администратора.' : 'Ошибка: ' + e.message, 'bad');

/* ---------- tabs ---------- */
let current = '';
async function openTab(name) {
  if (!TABS.includes(name)) name = 'overview';
  current = name;
  document.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('on', a.dataset.tab === name));
  for (const t of TABS) $('#tab-' + t).hidden = t !== name;
  $('#sb-gate').hidden = true;

  if (NEEDS_DB.has(name)) {
    if (panel.admin === null || panel.admin === false) panel.admin = await whoIsAdmin().catch(() => null);
    if (!panel.admin) {
      $('#tab-' + name).hidden = true;
      $('#sb-gate').hidden = false;
      $('#sb-login').href = `${SITE}account/?next=admin`;
      $('#sb-gate-text').textContent = panel.admin === false
        ? 'Вы вошли на сайте, но у аккаунта нет прав администратора. Выполните в Supabase SQL из ADMIN.md (is_admin = true) и обновите страницу.'
        : 'Войдите на сайте под своей почтой (как обычный пользователь), а потом вернитесь сюда.';
      return;
    }
  }
  try {
    if (name === 'overview') await renderOverview();
    if (name === 'subs') await renderSubs();
    if (name === 'comments') await renderComments();
    if (name === 'users') await renderUsers();
    if (name === 'newsletter') await renderNewsletter();
    if (name === 'services') await renderServices();
  } catch (e) { fail(e); }
}

async function updateCounts() {
  if (!panel.admin) return;
  try {
    const s = await rpc('admin_stats');
    document.querySelectorAll('[data-count]').forEach((n) => (n.textContent = s[n.dataset.count] ? String(s[n.dataset.count]) : ''));
    return s;
  } catch { return null; }
}

/* ---------- overview ---------- */
async function renderOverview() {
  const s = await updateCounts();
  if (!s) return;
  const card = (label, value, tab, hot) =>
    el('a', { class: 'stat' + (hot ? ' hot' : ''), href: tab ? '#' + tab : undefined },
      el('span', { class: 'stat__n' }, String(value)), el('span', { class: 'stat__l' }, label));
  $('#stats').replaceChildren(
    card('Новые заявки', s.submissions_new, 'subs', s.submissions_new > 0),
    card('Комментарии ждут', s.comments_pending, 'comments', s.comments_pending > 0),
    card('Пользователей', s.members, 'users'),
    card('Новых за 7 дней', s.members_7d, 'users'),
    card('Подписаны на рассылку', s.newsletter, 'newsletter'),
    card('Pro', s.pro, 'users'),
    card('Подборок в аккаунтах', s.collections),
    card('Опубликованных комментариев', s.comments_approved, 'comments'),
  );
  $('#stats-note').textContent = `Вы вошли как ${panel.admin.email}.`;
}

/* ---------- submissions ---------- */
async function photoUrls(paths) {
  if (!paths?.length) return [];
  try {
    const r = await db('/storage/v1/object/sign/submissions', { method: 'POST', body: { expiresIn: 3600, paths } });
    return r.map((x) => (x.signedURL ? SB + '/storage/v1' + x.signedURL : null)).filter(Boolean);
  } catch { return []; }
}

async function renderSubs() {
  const status = $('#subs-filter').value;
  const rows = await db(`/rest/v1/submissions?select=*&order=created_at.desc&limit=200${status ? '&status=eq.' + status : ''}`);
  const tools = await siteTools().catch(() => []);
  const known = (url) => tools.find((t) => domainOf(t.url) === domainOf(url));
  const list = $('#subs-list');
  if (!rows.length) { list.replaceChildren(el('p', { class: 'muted' }, 'Заявок нет.')); return; }
  list.replaceChildren(...await Promise.all(rows.map(async (r) => {
    const dup = known(r.url);
    const photos = await photoUrls(r.photos);
    const setStatus = async (st, btn) => {
      busy(btn, true);
      try { await db(`/rest/v1/submissions?id=eq.${r.id}`, { method: 'PATCH', body: { status: st }, prefer: 'return=minimal' }); renderSubs(); updateCounts(); }
      catch (e) { fail(e); busy(btn, false); }
    };
    return el('article', { class: 'item' },
      el('div', { class: 'item__head' },
        el('strong', {}, r.name),
        el('a', { href: r.url, target: '_blank', rel: 'noopener noreferrer' }, domainOf(r.url) + ' ↗'),
        el('span', { class: 'badge' }, { new: 'новая', added: 'добавлена', rejected: 'отклонена' }[r.status]),
        r.maker ? el('span', { class: 'badge' }, 'автор проекта') : null,
        dup ? el('span', { class: 'badge warn' }, 'уже в каталоге: ' + dup.name) : null,
        el('span', { class: 'grow' }),
        el('span', { class: 'muted' }, fmtDate(r.created_at))),
      el('p', { class: 'item__body' }, r.why),
      el('p', { class: 'muted' },
        [r.category ? 'Категория: ' + r.category : null, r.lang ? 'язык: ' + r.lang : null].filter(Boolean).join(' · '),
        r.email ? el('span', {}, ' · ', el('a', { href: `mailto:${r.email}?subject=${encodeURIComponent('Atlas: ' + r.name)}` }, r.email)) : null),
      photos.length ? el('div', { class: 'photos' }, ...photos.map((u) => el('a', { href: u, target: '_blank', rel: 'noopener' }, el('img', { src: u, alt: '' })))) : null,
      el('div', { class: 'actions' },
        r.status !== 'added' ? el('button', { class: 'btn primary', type: 'button', onclick: () => addFromSubmission(r) }, 'Добавить в каталог') : null,
        r.status !== 'rejected' ? el('button', { class: 'btn', type: 'button', onclick: (e) => setStatus('rejected', e.target) }, 'Отклонить') : null,
        r.status !== 'new' ? el('button', { class: 'btn', type: 'button', onclick: (e) => setStatus('new', e.target) }, 'Вернуть в новые') : null,
        el('span', { class: 'grow' }),
        el('button', { class: 'btn danger', type: 'button', onclick: async (e) => {
          if (!confirm(`Удалить заявку «${r.name}» насовсем?`)) return;
          busy(e.target, true);
          try {
            if (r.photos?.length) await db('/storage/v1/object/submissions', { method: 'DELETE', body: { prefixes: r.photos } }).catch(() => {});
            await db(`/rest/v1/submissions?id=eq.${r.id}`, { method: 'DELETE', prefer: 'return=minimal' });
            renderSubs(); updateCounts();
          } catch (err) { fail(err); busy(e.target, false); }
        } }, 'Удалить')),
    );
  })));
}

function addFromSubmission(r) {
  location.hash = '#sites';
  if (!state.token) { toast('Сначала войдите GitHub-токеном — каталог хранится в репозитории.', 'bad'); return; }
  openForm(null);
  const fm = $('#tool-form').elements;
  fm.url.value = r.url;
  fm.name.value = r.name;
  fm.url.dispatchEvent(new Event('change'));
  fm.name.dispatchEvent(new Event('input', { bubbles: true }));
  if (r.category && [...fm.category.options].some((o) => o.value === r.category)) fm.category.value = r.category;
  (r.lang === 'en' ? fm.description_en : fm.description_ru).value = r.why;
  panel.fromSubmission = r.id;
  toast('Форма заполнена из заявки. Допишите описания и сохраните — заявка отметится «добавлена».');
}

window.onToolSaved = async () => {
  panel.tools = null;
  if (!panel.fromSubmission) return;
  const id = panel.fromSubmission;
  panel.fromSubmission = null;
  try { await db(`/rest/v1/submissions?id=eq.${id}`, { method: 'PATCH', body: { status: 'added' }, prefer: 'return=minimal' }); updateCounts(); } catch {}
};

/* ---------- comments ---------- */
async function renderComments() {
  const status = $('#comments-filter').value;
  $('#approve-all').hidden = status !== 'pending';
  const rows = await db(`/rest/v1/comments?select=*&order=created_at.desc&limit=200${status ? '&status=eq.' + status : ''}`);
  await siteTools().catch(() => {});
  const list = $('#comments-list');
  list.dataset.ids = rows.map((r) => r.id).join(',');
  if (!rows.length) { list.replaceChildren(el('p', { class: 'muted' }, status === 'pending' ? 'Всё проверено 🎉' : 'Комментариев нет.')); return; }
  const set = async (ids, st, btn) => {
    busy(btn, true);
    try {
      await db(`/rest/v1/comments?id=in.(${ids.join(',')})`, { method: 'PATCH', body: { status: st }, prefer: 'return=minimal' });
      renderComments(); updateCounts();
    } catch (e) { fail(e); busy(btn, false); }
  };
  list.replaceChildren(...rows.map((r) => el('article', { class: 'item' },
    el('div', { class: 'item__head' },
      el('strong', {}, r.author_name),
      el('span', { class: 'muted' }, 'о сайте'),
      el('a', { href: `${SITE}tool/${r.tool_id}/#comments-h`, target: '_blank', rel: 'noopener' }, toolName(r.tool_id) + ' ↗'),
      el('span', { class: 'badge' + (r.status === 'pending' ? ' warn' : '') }, { pending: 'на проверке', approved: 'опубликован', rejected: 'скрыт' }[r.status]),
      el('span', { class: 'grow' }),
      el('span', { class: 'muted' }, fmtDate(r.created_at))),
    el('p', { class: 'item__body' }, r.body),
    el('div', { class: 'actions' },
      r.status !== 'approved' ? el('button', { class: 'btn primary', type: 'button', onclick: (e) => set([r.id], 'approved', e.target) }, 'Одобрить') : null,
      r.status !== 'rejected' ? el('button', { class: 'btn', type: 'button', onclick: (e) => set([r.id], 'rejected', e.target) }, 'Скрыть') : null,
      el('span', { class: 'grow' }),
      el('button', { class: 'btn danger', type: 'button', onclick: async (e) => {
        if (!confirm('Удалить комментарий насовсем? Автор тоже перестанет его видеть.')) return;
        busy(e.target, true);
        try { await db(`/rest/v1/comments?id=eq.${r.id}`, { method: 'DELETE', prefer: 'return=minimal' }); renderComments(); updateCounts(); }
        catch (err) { fail(err); busy(e.target, false); }
      } }, 'Удалить')),
  )));
  $('#approve-all').onclick = (e) => {
    const ids = list.dataset.ids.split(',').filter(Boolean);
    if (ids.length && confirm(`Одобрить ${ids.length} комментари(ев)?`)) set(ids, 'approved', e.target);
  };
}

/* ---------- users ---------- */
let usersCache = [];
async function renderUsers(reload = true) {
  if (reload) usersCache = await db('/rest/v1/profiles?select=id,email,display_name,created_at,plan,plan_until,newsletter,is_admin,lang&order=created_at.desc&limit=1000');
  const q = $('#users-q').value.trim().toLowerCase();
  const list = usersCache.filter((u) => !q || [u.email, u.display_name].join(' ').toLowerCase().includes(q));
  $('#users-count').textContent = `Всего: ${usersCache.length}` + (list.length !== usersCache.length ? ` · найдено ${list.length}` : '');
  const isPro = (u) => u.plan === 'pro' && (!u.plan_until || new Date(u.plan_until) > new Date());
  $('#users-list').replaceChildren(...list.map((u) => el('div', { class: 'row users-row' },
    el('span'),
    el('div', { class: 'main' },
      el('div', { class: 'name' }, u.email || '—', u.is_admin ? el('span', { class: 'badge' }, 'админ') : null),
      el('div', { class: 'sub' }, [u.display_name, 'с ' + new Date(u.created_at).toLocaleDateString('ru'), u.lang].filter(Boolean).join(' · '))),
    el('div', { class: 'tags' },
      isPro(u) ? el('span', { class: 'badge ok' }, 'Pro' + (u.plan_until ? ' до ' + new Date(u.plan_until).toLocaleDateString('ru') : '')) : el('span', { class: 'badge' }, 'Free'),
      u.newsletter ? el('span', { class: 'badge' }, 'рассылка') : null),
    el('div', { class: 'ops' },
      el('button', { class: 'btn', type: 'button', onclick: async (e) => {
        busy(e.target, true);
        try {
          if (isPro(u)) await rpc('admin_set_plan', { uid: u.id, new_plan: 'free', until: null });
          else await rpc('admin_set_plan', { uid: u.id, new_plan: 'pro', until: new Date(Date.now() + 365 * 864e5).toISOString() });
          await renderUsers();
        } catch (err) { fail(err); busy(e.target, false); }
      } }, isPro(u) ? 'Снять Pro' : 'Дать Pro на год'),
      u.newsletter ? el('button', { class: 'btn', type: 'button', onclick: async (e) => {
        busy(e.target, true);
        try { await rpc('admin_set_newsletter', { uid: u.id, on_: false }); await renderUsers(); } catch (err) { fail(err); busy(e.target, false); }
      } }, 'Отписать') : null),
  )));
}

/* ---------- newsletter ---------- */
const NL_PATH = 'src/data/newsletter.json';
const nl = { picks: [], all: {} };
const issueKey = (d = new Date()) => d.toISOString().slice(0, 7);
const nextIssue = (k) => { const [y, m] = k.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; };
/** same rule as src/lib/picks.mjs */
function autoPicks(tools, key) {
  const [y, m] = key.split('-').map(Number);
  const from = Date.UTC(m === 1 ? y - 1 : y, m === 1 ? 11 : m - 2, 1), to = Date.UTC(y, m - 1, 1);
  const time = (t) => new Date(t.added).getTime();
  const fresh = tools.filter((t) => time(t) >= from && time(t) < to)
    .sort((a, b) => Number(!!b.note) - Number(!!a.note) || Number(!!b.featured) - Number(!!a.featured) || time(b) - time(a));
  const out = fresh.map((t) => t.id);
  for (const t of tools.filter((t) => time(t) < to && !out.includes(t.id)).sort((a, b) => time(b) - time(a))) { if (out.length >= 5) break; out.push(t.id); }
  return out.slice(0, 5);
}

async function renderNewsletter() {
  if (panel.admin) {
    const s = await rpc('admin_stats').catch(() => null);
    $('#nl-subs').textContent = s ? `Подписчиков: ${s.newsletter}. Бесплатный Resend отправляет до 100 писем в день и 3000 в месяц.` : '';
  } else {
    $('#nl-subs').textContent = 'Число подписчиков видно после входа на сайте под аккаунтом администратора.';
  }
  const tools = await siteTools();
  if (!$('#nl-month').value) $('#nl-month').value = nextIssue(issueKey());
  // the newest committed choice: from GitHub with a token, else from the live site
  if (state.token) {
    try {
      const r = await gh(`/repos/${REPO}/contents/${NL_PATH}?ref=${BRANCH}`);
      nl.all = JSON.parse(b64ToText(r.content));
    } catch { nl.all = {}; }
  }
  $('#nl-need-token').hidden = !!state.token;
  $('#nl-save').disabled = $('#nl-clear').disabled = !state.token;
  loadPicks(tools);
}
function loadPicks(tools) {
  const key = $('#nl-month').value;
  nl.picks = [...(nl.all[key] || [])];
  $('#nl-auto').textContent = nl.picks.length ? '' : 'Сейчас выбирается автоматически: ' + autoPicks(tools, key).map(toolName).join(', ') + '.';
  drawPicks(tools);
}
function drawPicks(tools) {
  $('#nl-picks').replaceChildren(...nl.picks.map((id, i) =>
    el('button', { type: 'button', class: 'chip on', title: 'Убрать', onclick: () => { nl.picks.splice(i, 1); drawPicks(tools); } },
      `${i + 1}. ${toolName(id)}`, el('span', { class: 'x', 'aria-hidden': 'true' }, '×'))));
  $('#nl-input').hidden = nl.picks.length >= 5;
  $('#nl-options').replaceChildren(...tools.filter((t) => !nl.picks.includes(t.id)).map((t) => el('option', { value: `${t.name} — ${t.domain}` })));
}
async function saveNewsletter(empty, btn) {
  const key = $('#nl-month').value;
  busy(btn, true, 'Сохраняю…');
  try {
    await commit(async (d) => {
      let all = {};
      try { all = JSON.parse(b64ToText((await gh(`/repos/${REPO}/contents/${NL_PATH}?ref=${d.sha}`)).content)); } catch {}
      if (empty || !nl.picks.length) delete all[key]; else all[key] = nl.picks.slice(0, 5);
      nl.all = all;
      return { message: `Newsletter picks for ${key} (admin)`, files: { [NL_PATH]: JSON.stringify(all, null, 2) + '\n' } };
    });
    toast(empty ? `Выпуск ${key}: сайты выберутся автоматически.` : `Сохранено: выпуск ${key}.`, 'ok');
    loadPicks(await siteTools());
  } catch (e) { toast(e.status ? humanError(e) : e.message, 'bad'); }
  finally { busy(btn, false); }
}

/* ---------- services ---------- */
async function renderServices() {
  let google = null;
  try {
    const r = await fetch(`${SB}/auth/v1/settings`, { headers: { apikey: SB_KEY } });
    google = (await r.json()).external?.google;
  } catch {}
  const row = (name, note, href, state_) => el('div', { class: 'row' },
    el('span'),
    el('div', { class: 'main' }, el('div', { class: 'name' }, name, state_ != null ? el('span', { class: 'badge ' + (state_ ? 'ok' : 'warn') }, state_ ? 'включено' : 'не настроено') : null),
      el('div', { class: 'sub' }, note)),
    el('span'),
    el('div', { class: 'ops' }, el('a', { class: 'btn', href, target: '_blank', rel: 'noopener' }, 'Открыть ↗')));
  $('#services').replaceChildren(
    row('Supabase — база, аккаунты', 'Пользователи, комментарии, заявки, SQL', 'https://supabase.com/dashboard/project/uqfsxipvbccporjtsfoi'),
    row('Вход через Google', 'Supabase → Authentication → Providers → Google', 'https://supabase.com/dashboard/project/uqfsxipvbccporjtsfoi/auth/providers', google),
    row('Почта (Resend)', 'Письма для входа и рассылка, домен ehroz.pro', 'https://resend.com/emails'),
    row('GitHub Actions', 'Публикация сайта и ежемесячная рассылка', 'https://github.com/ehroz1/atlas.ehroz.pro/actions'),
    row('Секреты GitHub', 'Ключи для рассылки', 'https://github.com/ehroz1/atlas.ehroz.pro/settings/secrets/actions'),
    row('Gumroad — продажа Pro', 'Подписки, продажи и выплаты', 'https://app.gumroad.com/dashboard'),
    row('Google Cloud — OAuth', 'Клиент для входа через Google', 'https://console.cloud.google.com/auth/clients'),
    row('Porkbun — DNS', 'Домен ehroz.pro', 'https://porkbun.com/account/domainsSpeedy'),
  );
}

/* ---------- wiring ---------- */
window.onSitesReady = () => {
  const go = () => openTab(location.hash.slice(1) || 'overview');
  window.addEventListener('hashchange', go);
  go();
  whoIsAdmin().then((a) => { panel.admin = a; updateCounts(); }).catch(() => {});
};
document.addEventListener('DOMContentLoaded', () => {
  $('#subs-filter').addEventListener('change', () => renderSubs().catch(fail));
  $('#comments-filter').addEventListener('change', () => renderComments().catch(fail));
  $('#users-q').addEventListener('input', () => renderUsers(false));
  $('#nl-month').addEventListener('change', async () => loadPicks(await siteTools()));
  $('#nl-input').addEventListener('change', async () => {
    const tools = await siteTools();
    const v = $('#nl-input').value.trim();
    const t = tools.find((x) => `${x.name} — ${x.domain}` === v || x.name.toLowerCase() === v.toLowerCase());
    if (t && !nl.picks.includes(t.id) && nl.picks.length < 5) { nl.picks.push(t.id); $('#nl-input').value = ''; drawPicks(tools); }
  });
  $('#nl-save').addEventListener('click', (e) => saveNewsletter(false, e.target));
  $('#nl-clear').addEventListener('click', (e) => saveNewsletter(true, e.target));
  // a GitHub login can happen on the Sites tab; refresh newsletter rights after it
  $('#login-form').addEventListener('submit', () => setTimeout(() => current === 'newsletter' && renderNewsletter(), 1500));
});
