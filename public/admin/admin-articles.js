/*
 * Atlas admin, articles tab: write and edit articles in
 * src/content/articles/<slug>/{ru,en}.md, upload a cover and pictures.
 * Same GitHub token and the same commit() as the Sites tab (admin.js):
 * every save is one commit to `main`, the site rebuilds in 2–4 minutes.
 *
 * Runs after admin.js and reuses: $, el, toast, state, gh, commit, slugify,
 * today, bytesToB64, b64ToText, REPO, BRANCH, humanError.
 */
'use strict';

const ART_DIR = 'src/content/articles/';
const ART_TYPES = { listicle: 'Подборка', comparison: 'Сравнение', alternatives: 'Альтернативы', howto: 'Как сделать', news: 'Новости' };
const art = { list: [], editing: null, tools: new Set(), cats: new Set(), cover: null, coverPath: null, coverRemoved: false, images: new Map(), preview: { ru: false, en: false } };

/* ---------- frontmatter ---------- */
function parseScalar(v) {
  v = v.trim();
  if (v.startsWith('"')) { try { return JSON.parse(v); } catch { return v.slice(1, -1); } }
  if (v.startsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}
function parseList(v) {
  const inner = v.trim().slice(1, -1).trim();
  if (!inner) return [];
  const out = []; let cur = ''; let q = null;
  for (const ch of inner) {
    if (q) { cur += ch; if (ch === q && cur.at(-2) !== '\\') q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === ',') { out.push(parseScalar(cur)); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(parseScalar(cur));
  return out;
}
function parseMd(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text };
  const data = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    data[kv[1]] = kv[2].trim().startsWith('[') ? parseList(kv[2]) : parseScalar(kv[2]);
  }
  return { data, body: m[2].replace(/^\n+/, '') };
}
const Q = (s) => JSON.stringify(String(s));
const L = (xs) => `[${xs.map(Q).join(', ')}]`;
const ORDER = ['title', 'description', 'type', 'primaryKeyword', 'secondaryKeywords', 'tools', 'categories', 'published', 'updated', 'trendSource', 'sources', 'reviewedBy', 'cover', 'coverAlt', 'draft'];
function writeMd(data, body) {
  const keys = [...ORDER.filter((k) => k in data), ...Object.keys(data).filter((k) => !ORDER.includes(k))];
  const lines = keys
    .filter((k) => data[k] !== undefined && data[k] !== '' && !(Array.isArray(data[k]) && !data[k].length && k !== 'tools'))
    .map((k) => {
      const v = data[k];
      if (Array.isArray(v)) return `${k}: ${L(v)}`;
      if (typeof v === 'boolean') return `${k}: ${v}`;
      if (['published', 'updated', 'type'].includes(k)) return `${k}: ${v}`;
      return `${k}: ${Q(v)}`;
    });
  return `---\n${lines.join('\n')}\n---\n\n${body.trim()}\n`;
}

/* ---------- loading ---------- */
async function treeAt(sha) {
  const commitObj = await gh(`/repos/${REPO}/git/commits/${sha}`);
  return (await gh(`/repos/${REPO}/git/trees/${commitObj.tree.sha}?recursive=1`)).tree;
}
async function blobText(sha) { return b64ToText((await gh(`/repos/${REPO}/git/blobs/${sha}`)).content); }

async function loadArticles() {
  const tree = await treeAt(await headSha());
  const files = tree.filter((e) => e.type === 'blob' && e.path.startsWith(ART_DIR));
  const slugs = [...new Set(files.map((e) => e.path.slice(ART_DIR.length).split('/')[0]))];
  art.list = await Promise.all(slugs.map(async (slug) => {
    const inDir = files.filter((e) => e.path.startsWith(ART_DIR + slug + '/'));
    const md = {};
    for (const lang of ['ru', 'en']) {
      const f = inDir.find((e) => e.path === `${ART_DIR}${slug}/${lang}.md`);
      if (f) md[lang] = parseMd(await blobText(f.sha));
    }
    return { slug, md, files: inDir.map((e) => e.path) };
  }));
  art.list.sort((a, b) => String(b.md.ru?.data.published ?? b.md.en?.data.published ?? '').localeCompare(String(a.md.ru?.data.published ?? a.md.en?.data.published ?? '')));
}

/* ---------- list ---------- */
function artShow(id) {
  for (const s of ['art-gate', 'art-list', 'art-edit']) $('#' + s).hidden = s !== id;
  window.scrollTo(0, 0);
}

window.renderArticles = async () => {
  if (!state.token) {
    artShow('art-gate');
    return;
  }
  artShow('art-list');
  if (!art.list.length) $('#art-rows').replaceChildren(el('div', { class: 'row row--plain' }, el('div', { class: 'main' }, 'Загрузка…')));
  try {
    await loadArticles();
    drawArticleList();
  } catch (e) {
    toast(e.status ? humanError(e) : e.message, 'bad');
  }
};

function drawArticleList() {
  const SITE_ROOT = location.pathname.replace(/admin\/?.*$/, '');
  $('#art-count').textContent = `Статей: ${art.list.length}`;
  $('#art-rows').replaceChildren(...art.list.map((a) => {
    const d = a.md.ru?.data ?? a.md.en?.data ?? {};
    const draft = a.md.ru?.data.draft || a.md.en?.data.draft;
    return el('div', { class: 'row row--plain' },
      el('div', { class: 'main', onclick: () => openArticle(a) },
        el('div', { class: 'name' }, d.title || a.slug),
        el('div', { class: 'sub' }, `${a.slug} · ${d.published || 'без даты'} · ${(d.tools || []).length} сайтов`)),
      el('div', { class: 'tags' },
        draft ? el('span', { class: 'badge warn' }, 'черновик') : null,
        !a.md.en ? el('span', { class: 'badge warn' }, 'нет EN') : null,
        a.files.some((p) => /\/cover\.\w+$/.test(p)) ? el('span', { class: 'badge' }, 'обложка') : null),
      el('div', { class: 'ops' },
        draft ? null : el('a', { class: 'btn', href: `${SITE_ROOT}ru/blog/${a.slug}/`, target: '_blank', rel: 'noopener' }, 'Открыть ↗'),
        el('button', { class: 'btn', type: 'button', onclick: () => openArticle(a) }, 'Изменить'),
        el('button', { class: 'btn danger', type: 'button', onclick: () => removeArticle(a) }, 'Удалить')));
  }));
  if (!art.list.length) $('#art-rows').replaceChildren(el('div', { class: 'row row--plain row--empty' }, el('div', { class: 'main' }, 'Статей пока нет')));
}

/* ---------- form ---------- */
const af = (name) => $('#art-form').elements[name];

function drawToolChips() {
  const byId = new Map(state.tools.map((t) => [t.id, t]));
  $('#art-tool-chips').replaceChildren(...[...art.tools].map((id) =>
    el('button', { type: 'button', class: 'chip on', title: 'Убрать', onclick: () => { art.tools.delete(id); drawToolChips(); } },
      byId.get(id)?.name || id, el('span', { class: 'x', 'aria-hidden': 'true' }, '×'))));
  $('#art-all-tools').replaceChildren(...state.tools.map((t) => el('option', { value: `${t.name} — ${t.id}` })));
  $('#art-tool-options').replaceChildren(...state.tools.filter((t) => !art.tools.has(t.id)).map((t) => el('option', { value: `${t.name} — ${t.id}` })));
  $('#art-tools-note').textContent = art.tools.size < 3 ? `Нужно минимум 3 сайта (сейчас ${art.tools.size}). Они встанут карточками под статьёй.` : `${art.tools.size} сайтов будут карточками под статьёй.`;
}
function drawCats() {
  $('#art-cats').replaceChildren(...state.cats.map((c) =>
    el('button', { type: 'button', class: 'chip' + (art.cats.has(c.id) ? ' on' : ''), 'aria-pressed': String(art.cats.has(c.id)),
      onclick: () => { art.cats.has(c.id) ? art.cats.delete(c.id) : art.cats.add(c.id); drawCats(); } }, c.name.ru || c.name.en)));
}
function counters() {
  for (const lang of ['ru', 'en']) {
    const t = af(`title_${lang}`).value.length, d = af(`description_${lang}`).value.length;
    $(`#art-c-title-${lang}`).textContent = t ? `${t}/60` + (t > 60 ? ' — длинно' : '') : '';
    $(`#art-c-desc-${lang}`).textContent = d ? `${d} симв.` + (d < 50 ? ' — мало (нужно 50–160)' : d > 160 ? ' — много (нужно 50–160)' : '') : '';
    const words = af(`body_${lang}`).value.split(/\s+/).filter(Boolean).length;
    $(`#art-c-body-${lang}`).textContent = words ? `${words} слов · ~${Math.max(1, Math.round(words / (lang === 'ru' ? 170 : 200)))} мин чтения` : '';
  }
}

function openArticle(a) {
  art.editing = a || null;
  art.cover = null; art.coverRemoved = false; art.images = new Map(); art.preview = { ru: false, en: false };
  const fm = $('#art-form');
  fm.reset();
  $('#art-error').textContent = '';
  const ru = a?.md.ru ?? { data: {}, body: '' };
  const en = a?.md.en ?? { data: {}, body: '' };
  const d = { ...en.data, ...ru.data };
  $('#art-title').textContent = a ? (ru.data.title || en.data.title || a.slug) : 'Новая статья';
  $('#art-delete').hidden = !a;
  af('slug').value = a?.slug || '';
  af('slug').readOnly = !!a;
  af('slug').dataset.auto = a ? '' : '1';
  af('type').replaceChildren(...Object.entries(ART_TYPES).map(([v, l]) => el('option', { value: v }, l)));
  af('type').value = d.type || 'listicle';
  af('published').value = d.published || today();
  af('draft').checked = !!(ru.data.draft || en.data.draft);
  af('coverAlt_ru').value = ru.data.coverAlt || '';
  af('coverAlt_en').value = en.data.coverAlt || '';
  for (const [lang, m] of [['ru', ru], ['en', en]]) {
    af(`title_${lang}`).value = m.data.title || '';
    af(`description_${lang}`).value = m.data.description || '';
    af(`kw_${lang}`).value = m.data.primaryKeyword || '';
    af(`kw2_${lang}`).value = (m.data.secondaryKeywords || []).join(', ');
    af(`body_${lang}`).value = m.body || '';
    $(`#art-preview-${lang}`).hidden = true;
    af(`body_${lang}`).hidden = false;
  }
  art.tools = new Set(d.tools || []);
  art.cats = new Set(d.categories || []);
  art.coverPath = a?.files.find((p) => /\/cover\.\w+$/.test(p)) || null;
  drawToolChips(); drawCats(); counters();
  $('#art-cover-preview').hidden = true;
  $('#art-cover-remove').hidden = !art.coverPath;
  $('#art-cover-note').textContent = art.coverPath ? 'Обложка есть. Можно заменить или убрать.' : 'Без обложки статья покажет фирменную обложку (цвет категории, заголовок, крупная цифра).';
  if (art.coverPath) loadCoverPreview(art.coverPath);
  artShow('art-edit');
  af(a ? 'title_ru' : 'title_ru').focus();
}

async function loadCoverPreview(path) {
  try {
    const r = await gh(`/repos/${REPO}/contents/${path}?ref=${BRANCH}`);
    if (art.cover) return;
    $('#art-cover-preview').src = `data:image/jpeg;base64,${r.content.replace(/\n/g, '')}`;
    $('#art-cover-preview').hidden = false;
  } catch {}
}

/** Scales an image to `w` wide (and crops to w×h when h is given) as JPEG. */
async function toJpeg(file, w, h) {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, w / img.width);
  const W = h ? w : Math.round(img.width * scale);
  const H = h ? h : Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (h) {
    const s = Math.max(W / img.width, H / img.height);
    const sw = W / s, sh = H / s;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, W, H);
  } else ctx.drawImage(img, 0, 0, W, H);
  return new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
}

/* ---------- editor toolbar ---------- */
function insert(lang, before, after = '', placeholder = '') {
  const ta = af(`body_${lang}`);
  const s = ta.selectionStart, e = ta.selectionEnd;
  const sel = ta.value.slice(s, e) || placeholder;
  ta.setRangeText(before + sel + after, s, e, 'end');
  ta.focus();
  counters();
}
function block(lang, text) {
  const ta = af(`body_${lang}`);
  const s = ta.selectionStart;
  const pre = ta.value.slice(0, s);
  const gap = !pre || pre.endsWith('\n\n') ? '' : pre.endsWith('\n') ? '\n' : '\n\n';
  ta.setRangeText(gap + text + '\n\n', s, ta.selectionEnd, 'end');
  ta.focus();
  counters();
}
function pickTool(lang, then) {
  const box = $(`#art-pick-${lang}`);
  box.hidden = false;
  const input = box.querySelector('input');
  input.value = '';
  input.focus();
  const done = () => {
    const v = input.value.trim();
    const id = v.split(' — ').pop();
    const t = state.tools.find((x) => x.id === id || x.name.toLowerCase() === v.toLowerCase());
    if (!t) return;
    box.hidden = true;
    input.onchange = null;
    art.tools.add(t.id); drawToolChips();
    then(t);
  };
  input.onchange = done;
  input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); done(); } if (e.key === 'Escape') box.hidden = true; };
}
function toolbar(lang) {
  const b = (label, title, fn) => el('button', { type: 'button', class: 'btn btn--sm', title, onclick: fn }, label);
  return [
    b('H2', 'Раздел', () => block(lang, '## Заголовок раздела')),
    b('H3', 'Подраздел', () => block(lang, '### Подзаголовок')),
    b('Ж', 'Жирный', () => insert(lang, '**', '**', 'текст')),
    b('• Список', 'Список', () => block(lang, '- пункт\n- пункт')),
    b('1. Список', 'Нумерованный список', () => block(lang, '1. шаг\n2. шаг')),
    b('❝ Цитата', 'Цитата / важная мысль', () => block(lang, '> Важная мысль')),
    b('Таблица', 'Таблица', () => block(lang, '| Сайт | Что там есть | Цена |\n|---|---|---|\n| … | … | … |')),
    b('Ссылка на сайт', 'Ссылка на страницу сайта из каталога', () => pickTool(lang, (t) => insert(lang, '[', `](/tool/${t.id}/)`, t.name))),
    b('Скриншот сайта', 'Скриншот сайта из каталога, ведёт на его страницу', () => pickTool(lang, (t) => block(lang, `![${t.name}: подпись](shot:${t.id})`))),
    b('Картинка…', 'Загрузить картинку в статью', () => { $('#art-img-file').dataset.lang = lang; $('#art-img-file').click(); }),
    b('Предпросмотр', 'Показать, как будет выглядеть', () => togglePreview(lang)),
  ];
}

/* ---------- preview (a small Markdown renderer, enough to check the text) ---------- */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function inline(s) {
  return esc(s)
    .replace(/!\[([^\]]*)\]\(shot:([a-z0-9-]+)\)/g, (_, alt, id) => `<span class="pv-shot">Скриншот: ${state.tools.find((t) => t.id === id)?.name || id}<br><small>${alt}</small></span>`)
    .replace(/!\[([^\]]*)\]\(\.\/([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_, alt, f) => art.images.has(f) ? `<img src="${art.images.get(f).url}" alt="">` : `<span class="pv-shot">Картинка ${f}</span>`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="#" title="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\W)\*([^*]+)\*/g, '$1<em>$2</em>');
}
function renderMd(md) {
  const out = [];
  const blocks = md.replace(/<!--[\s\S]*?-->/g, '').trim().split(/\n{2,}/);
  for (const b of blocks) {
    const lines = b.split('\n');
    if (/^#{2,4} /.test(b)) { const n = b.match(/^#+/)[0].length; out.push(`<h${n}>${inline(b.slice(n + 1))}</h${n}>`); }
    else if (lines.every((l) => /^[-*] /.test(l))) out.push('<ul>' + lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('') + '</ul>');
    else if (lines.every((l) => /^\d+\. /.test(l))) out.push('<ol>' + lines.map((l) => `<li>${inline(l.replace(/^\d+\. /, ''))}</li>`).join('') + '</ol>');
    else if (lines.every((l) => l.startsWith('>'))) out.push(`<blockquote>${inline(lines.map((l) => l.replace(/^>\s?/, '')).join(' '))}</blockquote>`);
    else if (lines.length > 1 && /^\|?\s*-{3}/.test(lines[1])) {
      const row = (l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      out.push('<table><tr>' + row(lines[0]).map((c) => `<th>${inline(c)}</th>`).join('') + '</tr>' +
        lines.slice(2).map((l) => '<tr>' + row(l).map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</table>');
    } else out.push(`<p>${inline(b.replace(/\n/g, ' '))}</p>`);
  }
  return out.join('');
}
function togglePreview(lang) {
  art.preview[lang] = !art.preview[lang];
  const pv = $(`#art-preview-${lang}`);
  pv.hidden = !art.preview[lang];
  af(`body_${lang}`).hidden = art.preview[lang];
  if (art.preview[lang]) pv.innerHTML = `<h1>${esc(af(`title_${lang}`).value)}</h1><p class="pv-lead">${esc(af(`description_${lang}`).value)}</p>` + renderMd(af(`body_${lang}`).value);
}

/* ---------- save ---------- */
function readArticle() {
  const slug = (af('slug').value.trim() || slugify(af('title_en').value || af('title_ru').value));
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new Error('Адрес статьи (slug) — только латиница, цифры и дефис.');
  if (!art.editing && art.list.some((a) => a.slug === slug)) throw new Error(`Статья «${slug}» уже есть.`);
  const draft = af('draft').checked;
  const has = (lang) => af(`title_${lang}`).value.trim() || af(`body_${lang}`).value.trim();
  if (!has('ru') && !has('en')) throw new Error('Напишите статью хотя бы на одном языке.');
  const langs = ['ru', 'en'].filter(has);
  if (langs.length < 2 && !draft) throw new Error(`Нет версии на ${has('ru') ? 'английском' : 'русском'}. Опубликовать можно только с обоими языками — заполните её или отметьте «Черновик».`);
  if (art.tools.size < 3) throw new Error('Выберите минимум 3 сайта из каталога.');
  if (!art.cats.size) throw new Error('Выберите хотя бы одну категорию.');
  const old = art.editing?.md ?? {};
  const out = {};
  for (const lang of langs) {
    const title = af(`title_${lang}`).value.trim();
    const description = af(`description_${lang}`).value.trim();
    const body = af(`body_${lang}`).value.trim();
    const L_ = lang === 'ru' ? 'рус' : 'англ';
    if (!title) throw new Error(`Нет заголовка (${L_}).`);
    if (title.length > 70) throw new Error(`Заголовок (${L_}) длиннее 70 символов.`);
    if (description.length < 50 || description.length > 160) throw new Error(`Описание (${L_}) должно быть 50–160 символов, сейчас ${description.length}.`);
    if (!body) throw new Error(`Нет текста статьи (${L_}).`);
    if (/^#\s/m.test(body)) throw new Error(`В тексте (${L_}) есть заголовок первого уровня «# …». Заголовок статьи уже есть сверху, в тексте начинайте с «## …».`);
    const links = new Set([...body.matchAll(/\]\(\/(tool|category)\/([a-z0-9-]+)\/?\)/g)].map((m) => m[2]));
    if (!draft && links.size < 3) throw new Error(`В тексте (${L_}) нужно минимум 3 ссылки на страницы каталога — кнопка «Ссылка на сайт».`);
    const prev = old[lang]?.data ?? {};
    const textChanged = !old[lang] || old[lang].body.trim() !== body || prev.title !== title || prev.description !== description;
    out[lang] = {
      data: {
        ...prev,
        title, description,
        type: af('type').value,
        primaryKeyword: af(`kw_${lang}`).value.trim() || title,
        secondaryKeywords: af(`kw2_${lang}`).value.split(',').map((s) => s.trim()).filter(Boolean),
        tools: [...art.tools],
        categories: [...art.cats],
        published: af('published').value || today(),
        updated: textChanged ? today() : (prev.updated || today()),
        coverAlt: af(`coverAlt_${lang}`).value.trim() || undefined,
        draft: draft || undefined,
      },
      body,
    };
    if (!draft) delete out[lang].data.draft;
  }
  return { slug, out };
}

async function saveArticle(e) {
  e.preventDefault();
  $('#art-error').textContent = '';
  let res;
  try { res = readArticle(); } catch (err) { $('#art-error').textContent = err.message; return; }
  const { slug, out } = res;
  const btn = $('#art-save');
  btn.disabled = true; btn.textContent = 'Сохраняю…';
  try {
    const blobs = {};
    const upload = async (blob) => (await gh(`/repos/${REPO}/git/blobs`, { method: 'POST', body: { content: bytesToB64(new Uint8Array(await blob.arrayBuffer())), encoding: 'base64' } })).sha;
    if (art.cover) blobs.cover = await upload(art.cover);
    for (const [name, img] of art.images) {
      if (Object.values(out).some((m) => m.body.includes(`./${name}`))) blobs[name] = await upload(img.blob);
    }
    const isNew = !art.editing;
    await commit(async (d) => {
      const tree = await treeAt(d.sha);
      const dir = `${ART_DIR}${slug}/`;
      const existing = tree.filter((x) => x.type === 'blob' && x.path.startsWith(dir)).map((x) => x.path);
      if (isNew && existing.length) throw new Error(`Статья «${slug}» уже есть в репозитории.`);
      const known = new Set(d.tools.map((t) => t.id));
      for (const id of art.tools) if (!known.has(id)) throw new Error(`Сайта «${id}» больше нет в каталоге.`);
      const files = {};
      const hasCover = blobs.cover || (!art.coverRemoved && existing.some((p) => /\/cover\.\w+$/.test(p)));
      for (const [lang, m] of Object.entries(out)) {
        const data = { ...m.data };
        if (hasCover) data.cover = './' + (blobs.cover ? 'cover.jpg' : existing.find((p) => /\/cover\.\w+$/.test(p)).split('/').pop());
        else { delete data.cover; delete data.coverAlt; }
        files[`${dir}${lang}.md`] = writeMd(data, m.body);
      }
      // a language the article no longer has
      for (const lang of ['ru', 'en']) if (!out[lang] && existing.includes(`${dir}${lang}.md`)) files[`${dir}${lang}.md`] = null;
      if (blobs.cover) {
        for (const p of existing) if (/\/cover\.\w+$/.test(p) && p !== `${dir}cover.jpg`) files[p] = null;
        files[`${dir}cover.jpg`] = { blob: blobs.cover };
      } else if (art.coverRemoved) {
        for (const p of existing) if (/\/cover\.\w+$/.test(p)) files[p] = null;
      }
      for (const [name, sha] of Object.entries(blobs)) if (name !== 'cover') files[dir + name] = { blob: sha };
      const title = out.ru?.data.title || out.en?.data.title;
      return { message: `${isNew ? 'Add' : 'Update'} article ${slug} (admin)\n\n${title}`, files };
    });
    toast(`${isNew ? 'Статья добавлена' : 'Сохранено'}. Сайт обновится через 2–4 минуты.`, 'ok');
    await window.renderArticles();
  } catch (err) {
    $('#art-error').textContent = err.status ? humanError(err) : err.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Сохранить и опубликовать';
  }
}

async function removeArticle(a) {
  const title = a.md.ru?.data.title || a.md.en?.data.title || a.slug;
  if (!confirm(`Удалить статью «${title}»?\n\nСтраница исчезнет с сайта, картинки статьи тоже удалятся.`)) return;
  try {
    toast('Удаляю…');
    await commit(async (d) => {
      const tree = await treeAt(d.sha);
      const files = {};
      for (const x of tree) if (x.type === 'blob' && x.path.startsWith(`${ART_DIR}${a.slug}/`)) files[x.path] = null;
      if (!Object.keys(files).length) throw new Error('Этой статьи уже нет в репозитории.');
      return { message: `Remove article ${a.slug} (admin)`, files };
    });
    toast(`Удалено: ${title}. Сайт обновится через 2–4 минуты.`, 'ok');
    await window.renderArticles();
  } catch (err) {
    toast(err.status ? humanError(err) : err.message, 'bad');
  }
}

/* ---------- wiring ---------- */
document.addEventListener('DOMContentLoaded', () => {
  for (const lang of ['ru', 'en']) $(`#art-toolbar-${lang}`).replaceChildren(...toolbar(lang));
  $('#art-new').addEventListener('click', () => openArticle(null));
  $('#art-back').addEventListener('click', () => artShow('art-list'));
  $('#art-cancel').addEventListener('click', () => artShow('art-list'));
  $('#art-delete').addEventListener('click', () => art.editing && removeArticle(art.editing));
  $('#art-form').addEventListener('submit', saveArticle);
  $('#art-form').addEventListener('input', (e) => {
    counters();
    if (e.target.name === 'slug') af('slug').dataset.auto = '';
    if ((e.target.name === 'title_en' || e.target.name === 'title_ru') && af('slug').dataset.auto) af('slug').value = slugify(af('title_en').value || af('title_ru').value);
  });
  const addTool = () => {
    const v = $('#art-tool-input').value.trim();
    const id = v.split(' — ').pop();
    const t = state.tools.find((x) => x.id === id || x.name.toLowerCase() === v.toLowerCase());
    if (t) { art.tools.add(t.id); $('#art-tool-input').value = ''; drawToolChips(); }
  };
  $('#art-tool-input').addEventListener('change', addTool);
  $('#art-tool-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addTool(); } });

  $('#art-cover-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      art.cover = await toJpeg(file, 1600, 900);
      art.coverRemoved = false;
      $('#art-cover-preview').src = URL.createObjectURL(art.cover);
      $('#art-cover-preview').hidden = false;
      $('#art-cover-remove').hidden = false;
      $('#art-cover-note').textContent = 'Новая обложка (обрезана до 16:9, 1600×900). Сохранится вместе со статьёй.';
    } catch { $('#art-error').textContent = 'Не удалось прочитать картинку.'; }
  });
  $('#art-cover-remove').addEventListener('click', () => {
    art.cover = null; art.coverRemoved = true;
    $('#art-cover-preview').hidden = true;
    $('#art-cover-remove').hidden = true;
    $('#art-cover-note').textContent = 'Обложка будет убрана: статья покажет фирменную обложку.';
  });
  $('#art-img-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const lang = e.target.dataset.lang || 'ru';
    e.target.value = '';
    if (!file) return;
    try {
      const blob = await toJpeg(file, 1600);
      const name = `img-${Date.now().toString(36)}.jpg`;
      art.images.set(name, { blob, url: URL.createObjectURL(blob) });
      block(lang, `![Описание картинки](./${name} "Подпись под картинкой")`);
      toast('Картинка добавлена в текст. Загрузится при сохранении.', 'ok');
    } catch { toast('Не удалось прочитать картинку.', 'bad'); }
  });
  $('#art-gate-go').addEventListener('click', () => { location.hash = 'sites'; });
});
