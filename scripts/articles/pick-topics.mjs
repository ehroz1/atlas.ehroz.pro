#!/usr/bin/env node
/**
 * Step 2: turn trend signals into article topics.
 * Reads content-pipeline/<date>/trends.json, writes topics.json.
 *
 *   node scripts/articles/pick-topics.mjs [--count 3] [--topic "free icon sites"]
 *
 * --topic skips the trend data and plans exactly that topic.
 * Topics are dropped when the catalog has fewer than 3 matching sites
 * (nothing to back the article with); those go to "addToCatalog" instead.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ask } from './lib/claude.mjs';
import { ROOT, catalogText, existingArticles, toolIds, categoryIds, runDir } from './lib/catalog.mjs';
import { arg } from './lib/args.mjs';

const count = Number(arg('count', 3));
const manual = arg('topic');
const dir = runDir();
const trendsFile = path.join(dir, 'trends.json');
const trends = manual ? null : JSON.parse(fs.readFileSync(trendsFile, 'utf8'));

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['topics', 'addToCatalog'],
  properties: {
    topics: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['slug', 'action', 'type', 'primaryKeyword', 'secondaryKeywords', 'tools', 'categories', 'score', 'trendSource', 'angle'],
        properties: {
          slug: { type: 'string', description: 'english, lowercase, dashes; for action=update the existing slug' },
          action: { type: 'string', enum: ['new', 'update'] },
          type: { type: 'string', enum: ['listicle', 'comparison', 'alternatives', 'howto', 'news'] },
          primaryKeyword: {
            type: 'object', additionalProperties: false, required: ['en', 'ru'],
            properties: { en: { type: 'string' }, ru: { type: 'string' } },
          },
          secondaryKeywords: {
            type: 'object', additionalProperties: false, required: ['en', 'ru'],
            properties: { en: { type: 'array', items: { type: 'string' } }, ru: { type: 'array', items: { type: 'string' } } },
          },
          tools: { type: 'array', items: { type: 'string' }, description: 'catalog ids, 3–12' },
          categories: { type: 'array', items: { type: 'string' } },
          score: { type: 'number' },
          trendSource: { type: 'string', description: 'the signals behind this topic, in one line' },
          angle: { type: 'string', description: 'one sentence: what this article gives that the current top results do not' },
        },
      },
    },
    addToCatalog: {
      type: 'array',
      description: 'sites or tools worth adding to the catalog, seen in the signals',
      items: { type: 'object', additionalProperties: false, required: ['name', 'why'], properties: { name: { type: 'string' }, url: { type: 'string' }, why: { type: 'string' } } },
    },
  },
};

const system = `You plan SEO articles for Atlas (atlas.ehroz.pro), a hand-picked catalog of useful websites and tools for designers, developers and curious people. The site is bilingual: English at the root, Russian under /ru/. Each article must lead readers to the catalog's own pages about the sites it mentions, so only topics the catalog can back with at least 3 of its sites are worth writing.

Scoring (0–11):
- demand 0–3: search volume or how often the query shows up in the signals
- growth 0–3: rising now (new releases, Show HN, GitHub stars, rising queries)
- catalog fit 0–3: how many strong catalog sites answer the query
- opportunity 0–2: the site already gets impressions for it at positions 6–30, or the query has weak results
- an existing article on the same cluster: use action "update" with its slug instead of a new one

Group queries that a single page would answer into one topic; never plan two topics that would compete for the same query. Prefer queries with clear intent: choosing a tool, comparing tools, free alternatives, how to do a task. Skip news that will be stale in a month unless it is big. Keywords: write them the way people actually type them in each language (the Russian keyword is not a translation of the English one if Russians search differently).`;

const prompt = manual
  ? `Plan exactly one article on this topic: "${manual}".`
  : `Pick up to ${count} topics from these signals, best score first.\n\n<signals>\n${JSON.stringify(trends.signals.slice(0, 400))}\n</signals>`;

const result = await ask({
  system,
  effort: 'high',
  schema,
  prompt: `${prompt}

<existing_articles>
${JSON.stringify(existingArticles())}
</existing_articles>

<catalog>
${catalogText()}
</catalog>

Use only ids from the catalog in "tools" and only category ids from the catalog headings in "categories".`,
});

// keep only what the catalog can back
const kept = [];
for (const t of result.topics) {
  t.tools = t.tools.filter((id) => toolIds.has(id));
  t.categories = t.categories.filter((id) => categoryIds.has(id));
  if (t.tools.length < 3 || !t.categories.length) {
    console.log(`drop "${t.slug}": ${t.tools.length} catalog sites`);
    continue;
  }
  t.slug = t.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  kept.push(t);
}
kept.sort((a, b) => b.score - a.score);
const topics = kept.slice(0, manual ? 1 : count);

fs.writeFileSync(path.join(dir, 'topics.json'), JSON.stringify({ topics, addToCatalog: result.addToCatalog }, null, 2));
console.log(`${topics.length} topic(s) → ${path.relative(ROOT, path.join(dir, 'topics.json'))}`);
for (const t of topics) console.log(`  ${t.score}  ${t.action.padEnd(6)} ${t.slug}  (${t.tools.length} sites)`);
