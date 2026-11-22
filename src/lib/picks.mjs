/**
 * "Five finds of the month" — one rule shared by the /newsletter/ page and
 * scripts/newsletter.mjs, so the preview and the email can't differ.
 *
 * An issue is named by its month, "2026-12", and is sent on the 1st of
 * that month. It contains:
 *   1. the ids listed for that month in src/data/newsletter.json, if any
 *      (your own hand-picked five: { "2026-12": ["id", …] }), otherwise
 *   2. sites added during the previous month: ones with an author's note
 *      first, then featured, then newest; topped up with the newest sites
 *      overall if the month had fewer than five.
 *
 * Plain JS (no Astro imports) so a Node script can use it.
 */
export const PICKS = 5;

/** "2026-12" for a Date (UTC) */
export function issueKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

/** the issue after `key`: "2026-12" → "2027-01" */
export function nextIssue(key) {
  const [y, m] = key.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

/**
 * @param {{ id: string, added: string|Date, featured?: boolean, note?: object }[]} tools  flat tool records
 * @param {string} key  issue month "YYYY-MM"
 * @param {Record<string, string[]>} overrides  src/data/newsletter.json
 * @returns {string[]} up to PICKS ids
 */
export function picksFor(tools, key, overrides = {}) {
  const byId = new Map(tools.map((t) => [t.id, t]));
  const manual = (overrides[key] ?? []).filter((id) => byId.has(id));
  if (manual.length) return manual.slice(0, PICKS);

  const [y, m] = key.split('-').map(Number);
  const from = Date.UTC(m === 1 ? y - 1 : y, m === 1 ? 11 : m - 2, 1);
  const to = Date.UTC(y, m - 1, 1);
  const time = (t) => new Date(t.added).getTime();
  const rank = (a, b) =>
    Number(!!b.note) - Number(!!a.note) ||
    Number(!!b.featured) - Number(!!a.featured) ||
    time(b) - time(a);

  const fresh = tools.filter((t) => time(t) >= from && time(t) < to).sort(rank);
  const out = fresh.map((t) => t.id);
  if (out.length < PICKS) {
    const older = tools.filter((t) => time(t) < to && !out.includes(t.id)).sort((a, b) => time(b) - time(a));
    for (const t of older) {
      if (out.length >= PICKS) break;
      out.push(t.id);
    }
  }
  return out.slice(0, PICKS);
}
