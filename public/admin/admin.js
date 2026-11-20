/*
 * Atlas admin: edits src/data/tools.json (and alternatives.json, screenshots)
 * straight in the GitHub repository. Every save is one commit to `main`,
 * which triggers the deploy workflow; it also captures missing screenshots.
 * No server: the browser talks to api.github.com with the owner's token.
 */
'use strict';

const REPO = 'ehroz1/atlas.ehroz.pro';
const BRANCH = 'main';
const API = 'https://api.github.com';
const P = {
  tools: 'src/data/tools.json',
  cats: 'src/data/categories.json',
  alts: 'src/data/alternatives.json',
  shots: 'src/assets/shots/',
};
const KNOWN_PLATFORMS = ['Web', 'macOS', 'Windows', 'Linux', 'iOS', 'Android', 'Figma', 'Telegram', 'CLI', 'API', 'React', 'Vue'];
const PRICING = { free: 'бесплатно', freemium: 'freemium', paid: 'платно' };
const TOKEN_KEY = 'atlas-admin-token';

const $ = (s) => document.querySelector(s);
const state = { token: '', tools: [], cats: [], alts: [], shots: new Set(), editing: null, platforms: new Set(), altIds: new Set(), shotBlob: null };

/* ---------- storage ---------- */
const store = {
  get() { try { return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } },
  set(t, remember) { try { (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, t); } catch {} },
  clear() { try { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY); } catch {} },
};

/* ---------- GitHub API ---------- */
async function gh(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${state.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try { msg += ' ' + (await res.json()).message; } catch {}
    const e = new Error(msg); e.status = res.status; throw e;
  }
  return res.status === 204 ? null : res.json();
}

const b64ToText = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, '')), (c) => c.charCodeAt(0)));
const bytesToB64 = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };

async function headSha() {
  const ref = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
  return ref.object.sha;
}

/** Reads JSON files and the screenshot list as of commit `sha`. */
async function loadData(sha) {
  const commit = await gh(`/repos/${REPO}/git/commits/${sha}`);
  const tree = await gh(`/repos/${REPO}/git/trees/${commit.tree.sha}?recursive=1`);
  const blobOf = (p) => tree.tree.find((e) => e.path === p)?.sha;
  const read = async (p) => JSON.parse(b64ToText((await gh(`/repos/${REPO}/git/blobs/${blobOf(p)}`)).content));
  const [tools, cats, alts] = await Promise.all([read(P.tools), read(P.cats), read(P.alts)]);
  const shots = new Map();
  for (const e of tree.tree) {
    if (e.type === 'blob' && e.path.startsWith(P.shots)) shots.set(e.path.slice(P.shots.length).replace(/\.\w+$/, ''), e.path);
  }
  return { sha, treeSha: commit.tree.sha, tools, cats, alts, shots };
}

/** Same layout as the hand-written files, so diffs stay small. */
function fmtTools(list) {
  return JSON.stringify(list, null, 2).replace(
    /\[\n\s+("(?:[^"\\]|\\.)*"(?:,\n\s+"(?:[^"\\]|\\.)*")*)\n\s+\]/g,
    (_, inner) => '[' + inner.split(/,\n\s+/).join(', ') + ']',
  ) + '\n';
}
function fmtAlts(groups) {
  return '[\n' + groups.map((g) => `  { "about": ${JSON.stringify(g.about)}, "ids": [${g.ids.map((x) => JSON.stringify(x)).join(', ')}] }`).join(',\n') + '\n]\n';
}

/**
 * Applies `change(data)` to the freshest copy of the files and commits it.
 * Re-reading right before the commit means a save never overwrites edits
 * made elsewhere in the meantime; if `main` moves during the commit, retry.
 * `change` returns { message, files: { path: text | {blob} | null } }.
 */
async function commit(change) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const data = await loadData(await headSha());
    const { message, files } = await change(data);
    const tree = [];
    for (const [path, v] of Object.entries(files)) {
      if (v === null) tree.push({ path, mode: '100644', type: 'blob', sha: null });
      else if (typeof v === 'string') tree.push({ path, mode: '100644', type: 'blob', content: v });
      else tree.push({ path, mode: '100644', type: 'blob', sha: v.blob });
    }
    const newTree = await gh(`/repos/${REPO}/git/trees`, { method: 'POST', body: { base_tree: data.treeSha, tree } });
    const c = await gh(`/repos/${REPO}/git/commits`, { method: 'POST', body: { message, tree: newTree.sha, parents: [data.sha] } });
    try {
      await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: { sha: c.sha, force: false } });
      return c.sha;
    } catch (e) {
      if (e.status !== 422 || attempt === 2) throw e;
    }
  }
}

async function refresh() {
  const d = await loadData(await headSha());
  state.tools = d.tools; state.cats = d.cats.sort((a, b) => a.order - b.order); state.alts = d.alts;
  state.shots = d.shots;
}

/* ---------- helpers ---------- */
const today = () => new Date().toISOString().slice(0, 10);
const domainOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };
const catName = (id) => state.cats.find((c) => c.id === id)?.name.ru || id;
const TRANSLIT = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
const slugify = (s) => s.toLowerCase().replace(/[а-яё]/g, (c) => TRANSLIT[c] ?? '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
  }
  n.append(...kids.flat().filter((k) => k != null));
  return n;
};

let toastTimer;
function toast(text, kind = '') {
  const t = $('#toast');
  t.textContent = text; t.className = 'toast ' + kind; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), kind === 'bad' ? 9000 : 6000);
}
const humanError = (e) =>
  e.status === 401 ? 'Токен не подошёл или истёк. Войдите заново.'
  : e.status === 403 || e.status === 404 ? 'У токена нет доступа к репозиторию. Нужен доступ к ' + REPO + ' и Contents: Read and write.'
  : 'Ошибка GitHub: ' + e.message;

function show(id) {
  for (const s of ['login', 'list', 'edit']) $('#' + s).hidden = s !== id;
  $('#logout').hidden = id === 'login';
  window.scrollTo(0, 0);
}

/* ---------- login ---------- */
async function start(token) {
  state.token = token;
  try {
    const me = await gh('/user');
    await refresh();
    $('#who').textContent = me.login;
    renderList();
    show('list');
    return true;
  } catch (e) {
    state.token = '';
    $('#login-error').textContent = humanError(e);
    show('login');
    return false;
  }
}

/* ---------- list ---------- */
function renderList() {
  const q = $('#q').value.trim().toLowerCase();
  const cat = $('#cat-filter').value;
  const sel = $('#cat-filter');
  if (sel.options.length === 1) for (const c of state.cats) sel.append(el('option', { value: c.id }, c.name.ru || c.name.en));

  const list = [...state.tools]
    .sort((a, b) => b.added.localeCompare(a.added) || state.tools.indexOf(b) - state.tools.indexOf(a))
    .filter((t) => !cat || t.category === cat)
    .filter((t) => !q || [t.name, t.url, t.id, ...(t.tags || []), t.summary?.ru, t.summary?.en].join(' ').toLowerCase().includes(q));

  $('#count').textContent = `Сайтов: ${state.tools.length}` + (list.length !== state.tools.length ? ` · показано ${list.length}` : '');
  $('#rows').replaceChildren(...list.map((t) =>
    el('div', { class: 'row' },
      el('img', { src: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domainOf(t.url))}&sz=64`, alt: '', loading: 'lazy' }),
      el('div', { class: 'main', onclick: () => openForm(t) },
        el('div', { class: 'name' }, t.name),
        el('div', { class: 'sub' }, `${domainOf(t.url)} · ${catName(t.category)} · ${t.added}`)),
      el('div', { class: 'tags' },
        state.shots.has(t.id) ? null : el('span', { class: 'badge warn', title: 'Снимется при следующей публикации' }, 'нет скриншота'),
        t.featured ? el('span', { class: 'badge' }, 'закреплён') : null,
        el('span', { class: 'badge' }, PRICING[t.pricing] || t.pricing)),
      el('div', { class: 'ops' },
        el('button', { class: 'btn', type: 'button', onclick: () => openForm(t) }, 'Изменить'),
        el('button', { class: 'btn danger', type: 'button', onclick: () => removeTool(t) }, 'Удалить')),
    )));
  if (!list.length) $('#rows').replaceChildren(el('div', { class: 'row' }, el('span'), el('span', { class: 'muted' }, 'Ничего не найдено')));
}

/* ---------- form ---------- */
const form = () => $('#tool-form');
const f = (name) => form().elements[name];

function renderPlatforms() {
  const all = [...new Set([...KNOWN_PLATFORMS, ...state.platforms])];
  $('#platforms').replaceChildren(...all.map((p) =>
    el('button', { type: 'button', class: 'chip' + (state.platforms.has(p) ? ' on' : ''), 'aria-pressed': String(state.platforms.has(p)),
      onclick: () => { state.platforms.has(p) ? state.platforms.delete(p) : state.platforms.add(p); renderPlatforms(); } }, p)));
}

function renderAlts() {
  const byId = new Map(state.tools.map((t) => [t.id, t]));
  $('#alt-chips').replaceChildren(...[...state.altIds].map((id) =>
    el('button', { type: 'button', class: 'chip on', title: 'Убрать', onclick: () => { state.altIds.delete(id); renderAlts(); } },
      byId.get(id)?.name || id, el('span', { class: 'x', 'aria-hidden': 'true' }, '×'))));
  const self = state.editing?.id;
  $('#alt-options').replaceChildren(...state.tools.filter((t) => t.id !== self && !state.altIds.has(t.id))
    .map((t) => el('option', { value: `${t.name} — ${domainOf(t.url)}` })));
}

/** Ids that share at least one alternatives group with `id`. */
function altsOf(id) {
  const s = new Set();
  for (const g of state.alts) if (g.ids.includes(id)) g.ids.forEach((x) => x !== id && s.add(x));
  return s;
}

function openForm(tool) {
  state.editing = tool || null;
  state.shotBlob = null;
  const fm = form();
  fm.reset();
  fm.querySelectorAll('.touched').forEach((n) => n.classList.remove('touched'));
  $('#form-error').textContent = '';
  $('#edit-title').textContent = tool ? tool.name : 'Новый сайт';
  $('#delete').hidden = !tool;
  f('category').replaceChildren(el('option', { value: '' }, '— выберите —'), ...state.cats.map((c) => el('option', { value: c.id }, c.name.ru || c.name.en)));

  const t = tool || {};
  f('url').value = t.url || '';
  f('name').value = t.name || '';
  f('id').value = t.id || '';
  f('id').readOnly = !!tool;
  f('id').dataset.auto = tool ? '' : '1';
  f('category').value = t.category || '';
  f('pricing').value = t.pricing || 'free';
  f('openSource').checked = !!t.openSource;
  f('featured').checked = !!t.featured;
  f('own').checked = !!t.own;
  f('tags').value = (t.tags || []).join(', ');
  f('summary_ru').value = t.summary?.ru || '';
  f('summary_en').value = t.summary?.en || '';
  f('description_ru').value = t.description?.ru || '';
  f('description_en').value = t.description?.en || '';
  f('added').value = t.added || today();
  f('updated').value = t.updated || '';
  state.platforms = new Set(t.platforms || (tool ? [] : ['Web']));
  state.altIds = tool ? altsOf(tool.id) : new Set();
  renderPlatforms();
  renderAlts();
  updateCounters();

  const has = tool && state.shots.has(tool.id);
  $('#shot-preview').hidden = true;
  $('#shot-preview').removeAttribute('src');
  $('#reshoot-wrap').hidden = !has;
  $('#shot-note').textContent = has
    ? 'Скриншот есть. Можно загрузить свой или переснять автоматически.'
    : tool ? 'Скриншота пока нет — он снимется автоматически при публикации. Можно загрузить свой (16:10).'
    : 'Если не загружать картинку, скриншот снимется автоматически при публикации (16:10).';
  if (has) loadShotPreview(tool.id);
  show('edit');
  (tool ? f('name') : f('url')).focus();
}

async function loadShotPreview(id) {
  try {
    const path = state.shots.get(id);
    const r = await gh(`/repos/${REPO}/contents/${path}?ref=${BRANCH}`);
    if (state.editing?.id !== id || state.shotBlob) return;
    const ext = path.split('.').pop().replace('jpg', 'jpeg');
    $('#shot-preview').src = `data:image/${ext};base64,${r.content.replace(/\n/g, '')}`;
    $('#shot-preview').hidden = false;
  } catch {}
}

function updateCounters() {
  for (const c of document.querySelectorAll('.counter')) {
    const n = f(c.dataset.for).value.length;
    c.textContent = n ? `${n} симв.` + (n > 75 ? ' — длинновато' : '') : '';
  }
}

/** Crops/scales an uploaded image to 1440×900 JPEG (what the screenshot script makes). */
async function toShotJpeg(file) {
  const img = await createImageBitmap(file);
  const W = 1440, H = 900;
  const scale = Math.max(W / img.width, H / img.height);
  const sw = W / scale, sh = H / scale;
  const sx = (img.width - sw) / 2, sy = 0; // keep the top of the page
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  return new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
}

function readForm() {
  const fm = form();
  fm.querySelectorAll('input, select, textarea').forEach((n) => n.classList.add('touched'));
  const url = f('url').value.trim();
  const name = f('name').value.trim();
  const id = f('id').value.trim() || slugify(name);
  const need = [['url', 'адрес'], ['name', 'название'], ['category', 'категорию'], ['summary_ru', 'короткое описание (рус)'], ['summary_en', 'короткое описание (англ)'], ['description_ru', 'описание (рус)'], ['description_en', 'описание (англ)']];
  const missing = need.filter(([n]) => !f(n).value.trim()).map(([, l]) => l);
  if (missing.length) throw new Error('Заполните: ' + missing.join(', ') + '.');
  try { const u = new URL(url); if (!/^https?:$/.test(u.protocol)) throw 0; } catch { throw new Error('Адрес должен начинаться с https://'); }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) throw new Error('ID — только строчная латиница, цифры и дефис.');
  if (!state.editing && state.tools.some((t) => t.id === id)) throw new Error(`Сайт с ID «${id}» уже есть.`);
  const dup = state.tools.find((t) => t.id !== state.editing?.id && domainOf(t.url) === domainOf(url) && new URL(t.url).pathname === new URL(url).pathname);
  if (dup && !confirm(`Похоже, этот адрес уже есть в каталоге: «${dup.name}». Всё равно сохранить?`)) throw new Error('Отменено.');

  const old = state.editing || {};
  const t = {
    id, name, url,
    category: f('category').value,
    pricing: f('pricing').value,
    ...(f('openSource').checked ? { openSource: true } : {}),
    platforms: [...state.platforms],
    tags: f('tags').value.split(',').map((s) => s.trim()).filter(Boolean).filter((s, i, a) => a.indexOf(s) === i),
    added: f('added').value || today(),
    updated: f('updated').value || f('added').value || today(),
    ...(f('featured').checked ? { featured: true } : {}),
    ...(f('own').checked ? { own: true } : {}),
    summary: { en: f('summary_en').value.trim(), ru: f('summary_ru').value.trim() },
    description: { en: f('description_en').value.trim(), ru: f('description_ru').value.trim() },
  };
  // keep any fields this form doesn't know about
  for (const [k, v] of Object.entries(old)) if (!(k in t) && !['openSource', 'featured', 'own'].includes(k)) t[k] = v;
  // text changed → bump "updated" unless the user set it by hand
  if (state.editing && f('updated').value === (old.updated || '')) {
    const textChanged = JSON.stringify([old.name, old.summary, old.description]) !== JSON.stringify([t.name, t.summary, t.description]);
    if (textChanged) t.updated = today();
  }
  return t;
}

/**
 * Rewrites alternatives so that `id` shares groups with exactly `wanted`.
 * A group means "all of these do the same job", so `id` only stays in or
 * joins a group whose every other member is wanted.
 */
function applyAlts(alts, id, wanted, toolName) {
  const groups = alts.map((g) => ({ ...g, ids: [...g.ids] }));
  for (const g of groups) {
    if (g.ids.includes(id) && g.ids.some((x) => x !== id && !wanted.has(x))) g.ids = g.ids.filter((x) => x !== id);
  }
  const covered = new Set();
  for (const g of groups) if (g.ids.includes(id)) g.ids.forEach((x) => covered.add(x));
  let rest = [...wanted].filter((x) => !covered.has(x));
  for (const g of groups) {
    if (!rest.length) break;
    if (g.ids.includes(id) || !g.ids.every((x) => wanted.has(x)) || !g.ids.some((x) => rest.includes(x))) continue;
    g.ids.push(id);
    rest = rest.filter((x) => !g.ids.includes(x));
  }
  if (rest.length) groups.push({ about: toolName, ids: [id, ...rest] });
  return groups.filter((g) => g.ids.length > 1);
}

async function save(e) {
  e.preventDefault();
  const btn = $('#save');
  $('#form-error').textContent = '';
  let tool;
  try { tool = readForm(); } catch (err) { $('#form-error').textContent = err.message; return; }
  const isNew = !state.editing;
  const shotBlob = state.shotBlob;
  const reshoot = $('#reshoot').checked;
  btn.disabled = true; btn.textContent = 'Сохраняю…';
  try {
    let uploaded = null;
    if (shotBlob) {
      const bytes = new Uint8Array(await shotBlob.arrayBuffer());
      uploaded = (await gh(`/repos/${REPO}/git/blobs`, { method: 'POST', body: { content: bytesToB64(bytes), encoding: 'base64' } })).sha;
    }
    await commit(async (d) => {
      const tools = d.tools;
      const i = tools.findIndex((t) => t.id === tool.id);
      if (isNew && i >= 0) throw new Error(`Сайт с ID «${tool.id}» уже есть.`);
      if (!isNew && i < 0) throw new Error('Этот сайт уже удалён в репозитории. Обновите страницу.');
      if (!d.cats.some((c) => c.id === tool.category)) throw new Error('Такой категории больше нет.');
      if (isNew) tools.push(tool); else tools[i] = tool;
      const known = new Set(tools.map((t) => t.id));
      const wanted = new Set([...state.altIds].filter((x) => known.has(x)));
      const alts = applyAlts(d.alts, tool.id, wanted, tool.name);
      const files = { [P.tools]: fmtTools(tools) };
      if (fmtAlts(alts) !== fmtAlts(d.alts)) files[P.alts] = fmtAlts(alts);
      const oldShot = d.shots.get(tool.id);
      if (uploaded) {
        if (oldShot && oldShot !== `${P.shots}${tool.id}.jpg`) files[oldShot] = null;
        files[`${P.shots}${tool.id}.jpg`] = { blob: uploaded };
      } else if (reshoot && oldShot) {
        files[oldShot] = null;
      }
      return { message: `${isNew ? 'Add' : 'Update'} ${tool.name} (admin)`, files };
    });
    await refresh();
    renderList();
    show('list');
    toast(`${isNew ? 'Добавлено' : 'Сохранено'}: ${tool.name}. Сайт обновится через 2–4 минуты.`, 'ok');
  } catch (err) {
    $('#form-error').textContent = err.status ? humanError(err) : err.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Сохранить и опубликовать';
  }
}

async function removeTool(tool) {
  if (!confirm(`Удалить «${tool.name}» (${domainOf(tool.url)}) из каталога?\n\nСтраница сайта исчезнет, скриншот тоже удалится.`)) return;
  try {
    toast('Удаляю…');
    await commit(async (d) => {
      const tools = d.tools.filter((t) => t.id !== tool.id);
      if (tools.length === d.tools.length) throw new Error('Этого сайта уже нет в репозитории.');
      const alts = d.alts.map((g) => ({ ...g, ids: g.ids.filter((x) => x !== tool.id) })).filter((g) => g.ids.length > 1);
      const files = { [P.tools]: fmtTools(tools) };
      if (fmtAlts(alts) !== fmtAlts(d.alts)) files[P.alts] = fmtAlts(alts);
      const shot = d.shots.get(tool.id);
      if (shot) files[shot] = null;
      return { message: `Remove ${tool.name} (admin)`, files };
    });
    await refresh();
    renderList();
    show('list');
    toast(`Удалено: ${tool.name}. Сайт обновится через 2–4 минуты.`, 'ok');
  } catch (err) {
    toast(err.status ? humanError(err) : err.message, 'bad');
  }
}

/* ---------- wiring ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  $('#repo-name').textContent = REPO;
  if (location.hostname.endsWith('github.io')) $('#site-link').href = '../';

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#login-error').textContent = '';
    const t = $('#token').value.trim();
    if (await start(t)) { store.set(t, $('#remember').checked); $('#token').value = ''; }
  });
  $('#logout').addEventListener('click', () => { store.clear(); state.token = ''; show('login'); });

  $('#q').addEventListener('input', renderList);
  $('#cat-filter').addEventListener('change', renderList);
  $('#add').addEventListener('click', () => openForm(null));
  $('#back').addEventListener('click', () => show('list'));
  $('#cancel').addEventListener('click', () => show('list'));
  $('#delete').addEventListener('click', () => state.editing && removeTool(state.editing));
  form().addEventListener('submit', save);
  form().addEventListener('input', (e) => {
    if (e.target.name?.startsWith('summary_')) updateCounters();
    if (e.target.name === 'id') f('id').dataset.auto = '';
    if (e.target.name === 'name' && f('id').dataset.auto) f('id').value = slugify(f('name').value);
  });
  f('url').addEventListener('change', () => {
    const u = f('url').value.trim();
    if (u && !/^https?:\/\//i.test(u)) f('url').value = 'https://' + u;
    if (!f('name').value.trim() && u) {
      const host = domainOf(f('url').value).split('.')[0];
      f('name').value = host.charAt(0).toUpperCase() + host.slice(1);
      if (f('id').dataset.auto) f('id').value = slugify(f('name').value);
    }
  });

  $('#platform-extra').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const v = e.target.value.trim();
    if (v) { state.platforms.add(v); e.target.value = ''; renderPlatforms(); }
  });
  const pickAlt = () => {
    const v = $('#alt-input').value.trim();
    const t = state.tools.find((x) => `${x.name} — ${domainOf(x.url)}` === v || x.id === v || x.name.toLowerCase() === v.toLowerCase());
    if (t && t.id !== state.editing?.id) { state.altIds.add(t.id); $('#alt-input').value = ''; renderAlts(); }
  };
  $('#alt-input').addEventListener('change', pickAlt);
  $('#alt-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); pickAlt(); } });

  $('#shot-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    state.shotBlob = null;
    if (!file) return;
    try {
      state.shotBlob = await toShotJpeg(file);
      $('#shot-preview').src = URL.createObjectURL(state.shotBlob);
      $('#shot-preview').hidden = false;
      $('#reshoot').checked = false;
    } catch { $('#form-error').textContent = 'Не удалось прочитать картинку.'; }
  });

  const saved = store.get();
  if (saved) await start(saved); else show('login');
});
