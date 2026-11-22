/**
 * Article view counts, kept in Supabase (supabase/003_article_views.sql).
 * Plain fetch to the REST endpoint, so pages don't load the Supabase client.
 * An article page counts one view per browser per day; [data-views] elements
 * get the number (or stay hidden if the backend or the table isn't there).
 */
import { SUPABASE } from '~/site.config';

const URL_ = (import.meta.env.PUBLIC_SUPABASE_URL as string | undefined) || SUPABASE.url;
const KEY = (import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined) || SUPABASE.anonKey;

async function rpc<T>(fn: string, body: unknown): Promise<T | null> {
  if (!URL_ || !KEY) return null;
  try {
    const res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

function paint(slug: string, n: number) {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-views="${slug}"]`)) {
    if (n <= 0) continue;
    const fmt = new Intl.NumberFormat(document.documentElement.lang).format(n);
    const forms = (el.dataset.label ?? '{n}').split('|');
    // forms: "one|few|many|other" for ru, "one|other" for en; {n} is the number
    const cat = new Intl.PluralRules(document.documentElement.lang).select(n);
    const pick = forms.length === 4 ? forms[['one', 'few', 'many', 'other'].indexOf(cat)] ?? forms[3] : cat === 'one' ? forms[0] : forms[forms.length - 1];
    el.querySelector('[data-views-text]')!.textContent = pick.replace('{n}', fmt);
    el.hidden = false;
  }
}

/** On an article page: count this view (once a day per browser) and show the total. */
export async function hitArticle(slug: string) {
  if (navigator.webdriver) return;
  const key = `atlas-view-${slug}`;
  const today = new Date().toISOString().slice(0, 10);
  let seen = false;
  try { seen = localStorage.getItem(key) === today; } catch {}
  if (seen) {
    const rows = await rpc<{ slug: string; views: number }[]>('article_views_get', { p_slugs: [slug] });
    if (rows?.[0]) paint(slug, rows[0].views);
    return;
  }
  const n = await rpc<number>('hit_article', { p_slug: slug });
  if (typeof n === 'number') {
    try { localStorage.setItem(key, today); } catch {}
    paint(slug, n);
  }
}

/** On a list: fill in the counts of every [data-views] on the page. */
export async function showViews() {
  const slugs = [...new Set([...document.querySelectorAll<HTMLElement>('[data-views]')].map((x) => x.dataset.views!))];
  if (!slugs.length) return;
  const rows = await rpc<{ slug: string; views: number }[]>('article_views_get', { p_slugs: slugs });
  for (const r of rows ?? []) paint(r.slug, r.views);
}
