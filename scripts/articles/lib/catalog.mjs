/** Read-only view of the catalog and existing articles, for prompts and checks. */
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '../../..');
export const ARTICLES_DIR = path.join(ROOT, 'src/content/articles');
export const PIPELINE_DIR = path.join(ROOT, 'content-pipeline');

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

export const tools = readJson('src/data/tools.json');
export const categories = readJson('src/data/categories.json');
export const toolIds = new Set(tools.map((t) => t.id));
export const categoryIds = new Set(categories.map((c) => c.id));

/** Compact catalog for prompts: one line per site. */
export function catalogText() {
  return categories
    .map((c) => {
      const inCat = tools.filter((t) => t.category === c.id);
      return `## ${c.id} (${c.name.en} / ${c.name.ru})\n` +
        inCat.map((t) => `- ${t.id} | ${t.name} | ${t.pricing}${t.openSource ? ', open source' : ''} | ${t.summary.en}`).join('\n');
    })
    .join('\n\n');
}

/** Full records for the given ids: the only facts a writer may state about them. */
export function toolFacts(ids) {
  return ids
    .map((id) => tools.find((t) => t.id === id))
    .filter(Boolean)
    .map((t) => ({
      id: t.id,
      name: t.name,
      url: t.url,
      page: `/tool/${t.id}/`,
      category: t.category,
      pricing: t.pricing,
      openSource: !!t.openSource,
      platforms: t.platforms,
      tags: t.tags,
      summary: t.summary,
      description: t.description,
      authorNote: t.note,
    }));
}

/** Minimal frontmatter reader (the files are written by write-article.mjs). */
function frontmatter(file) {
  const m = fs.readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
  const out = {};
  for (const line of (m?.[1] ?? '').split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].replace(/^"|"$/g, '');
  }
  return out;
}

/** Existing articles: slug, titles and main keywords, so topics don't repeat. */
export function existingArticles() {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  return fs
    .readdirSync(ARTICLES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const read = (l) => {
        const f = path.join(ARTICLES_DIR, d.name, `${l}.md`);
        return fs.existsSync(f) ? frontmatter(f) : {};
      };
      const en = read('en');
      const ru = read('ru');
      return { slug: d.name, title: { en: en.title, ru: ru.title }, keyword: { en: en.primaryKeyword, ru: ru.primaryKeyword }, updated: en.updated };
    });
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function runDir(date = today()) {
  const dir = path.join(PIPELINE_DIR, date);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
