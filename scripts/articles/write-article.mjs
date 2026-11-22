#!/usr/bin/env node
/**
 * Steps 3–5 for each topic in content-pipeline/<date>/topics.json:
 *   research (web search) → brief → draft en + ru → editor pass → checks → files.
 *
 *   node scripts/articles/write-article.mjs [--slug only-this-one]
 *
 * Writes src/content/articles/<slug>/{en,ru}.md and appends to
 * content-pipeline/<date>/report.md (used as the pull request text).
 * Nothing is published here: a person reviews the PR and merges it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ask } from './lib/claude.mjs';
import { ROOT, ARTICLES_DIR, toolFacts, toolIds, categoryIds, existingArticles, runDir, today } from './lib/catalog.mjs';
import { arg } from './lib/args.mjs';

const LANGS = ['en', 'ru'];
const LANG_NAME = { en: 'English', ru: 'Russian' };
const dir = runDir();
const { topics } = JSON.parse(fs.readFileSync(path.join(dir, 'topics.json'), 'utf8'));
const only = arg('slug');
const reportFile = path.join(dir, 'report.md');

const STYLE = `Voice of the site: short, calm, concrete. No exclamation marks, no marketing adjectives ("powerful", "revolutionary", "game-changing", "мощный", "революционный"), no filler openings ("in today's world", "let's dive in", "в современном мире", "давайте разберёмся"), no closing summaries that repeat the article ("in conclusion", "в заключение"). Russian text addresses the reader as «вы». Short paragraphs. Every claim about a tool's price, limits or features must come from TOOL FACTS or RESEARCH; if it isn't there, don't state it.`;

const LINKS = `Links: mention each catalog site with a Markdown link to its catalog page, exactly as given in TOOL FACTS "page" (e.g. [Figma](/tool/figma/)), the first time it appears. Category pages are /category/<id>/. Never link to a tool's own website in the text (the catalog page has the link) and never invent catalog paths. Do not use links to anything else on the site.`;

const MARKDOWN = `Format: Markdown body only, without the H1 (the title is rendered as H1 separately). Start with the answer paragraph, then H2 sections (##) and H3 (###) under them; never skip a level. Use a table when comparing 3+ sites on the same attributes. A "FAQ" section only with real questions from the brief, as H3 questions with short answers. Leave one HTML comment <!-- AUTHOR: personal experience --> in the place where the author's own experience would help most; the author fills it in before merging.`;

const pair = { type: 'object', additionalProperties: false, required: ['en', 'ru'], properties: { en: { type: 'string' }, ru: { type: 'string' } } };
const outline = {
  type: 'array',
  items: {
    type: 'object', additionalProperties: false, required: ['h2', 'points'],
    properties: { h2: { type: 'string' }, points: { type: 'array', items: { type: 'string' } } },
  },
};

const briefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['intent', 'angle', 'title', 'description', 'outline', 'faq', 'toolOrder', 'facts', 'sources'],
  properties: {
    intent: { type: 'string' },
    angle: { type: 'string' },
    title: pair,
    description: pair,
    outline: {
      type: 'object', additionalProperties: false, required: ['en', 'ru'],
      properties: { en: outline, ru: outline },
    },
    faq: {
      type: 'object', additionalProperties: false, required: ['en', 'ru'],
      properties: { en: { type: 'array', items: { type: 'string' } }, ru: { type: 'array', items: { type: 'string' } } },
    },
    toolOrder: { type: 'array', items: { type: 'string' } },
    facts: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['tool', 'fact', 'source'],
        properties: { tool: { type: 'string' }, fact: { type: 'string' }, source: { type: 'string' } },
      },
    },
    sources: { type: 'array', items: { type: 'string' } },
  },
};

const draftSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'description', 'body'],
  properties: {
    title: { type: 'string', description: 'H1, at most 60 characters, contains the primary keyword' },
    description: { type: 'string', description: 'meta description, 120–155 characters' },
    body: { type: 'string' },
  },
};

const reviewSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['issues', 'title', 'description', 'body'],
  properties: {
    issues: { type: 'array', items: { type: 'string' }, description: 'what was wrong and is now fixed, or still needs the author' },
    title: { type: 'string' },
    description: { type: 'string' },
    body: { type: 'string' },
  },
};

// ---- steps -------------------------------------------------------------

async function research(topic, facts) {
  return ask({
    webSearch: 10,
    effort: 'high',
    maxTokens: 32000,
    system: 'You research search results and facts for an SEO article. Report only what you found, with the URL for every fact.',
    prompt: `Primary queries: "${topic.primaryKeyword.en}" (English) and "${topic.primaryKeyword.ru}" (Russian).

1. Search both queries. For the top results, note: which subtopics all of them cover, what none of them covers well, the common page type and length, and the questions people ask ("People also ask", forum threads).
2. For each site below, open its official site and check the facts an article would state: free plan and its limits, prices, platforms, notable recent changes. Note the URL you read each fact on. If a fact in the catalog record looks outdated, say so.

<sites>
${JSON.stringify(facts.map(({ id, name, url, pricing, description }) => ({ id, name, url, pricing, description: description.en })))}
</sites>

Return plain notes in English, grouped by "SERP" and then by site id.`,
  });
}

async function brief(topic, facts, notes) {
  return ask({
    effort: 'high',
    schema: briefSchema,
    maxTokens: 32000,
    system: `You write content briefs for Atlas (atlas.ehroz.pro), a hand-picked catalog of useful websites for designers and developers. ${STYLE}`,
    prompt: `Topic: ${JSON.stringify(topic)}

<research>
${notes}
</research>

<tool_facts>
${JSON.stringify(facts)}
</tool_facts>

Write the brief for both languages. Title: at most 60 characters, contains the primary keyword of its language. Description: 120–155 characters. Outline: the H2 sections in order, each with the points to make. "facts" lists the verified facts the writer may use, each with its source URL (only from the research). "sources" lists the URLs that facts come from. "toolOrder" orders the topic's tool ids as they should appear.`,
  });
}

async function draft(lang, topic, facts, b) {
  return ask({
    effort: 'high',
    schema: draftSchema,
    system: `You write articles for Atlas (atlas.ehroz.pro), a hand-picked catalog of useful websites, by its author Ehroz, a designer and developer. Write in ${LANG_NAME[lang]} as a native writer would, not as a translation. ${STYLE}\n\n${LINKS}\n\n${MARKDOWN}`,
    prompt: `Language: ${LANG_NAME[lang]}
Primary keyword: "${topic.primaryKeyword[lang]}" — put it in the title, the first paragraph and one H2, naturally. Secondary: ${JSON.stringify(topic.secondaryKeywords[lang])}.
Article type: ${topic.type}. Angle: ${b.angle}. Search intent: ${b.intent}.
Title (may refine): ${b.title[lang]}
Description (may refine): ${b.description[lang]}
Outline: ${JSON.stringify(b.outline[lang])}
FAQ questions: ${JSON.stringify(b.faq[lang])}
Tool order: ${JSON.stringify(b.toolOrder)}

<tool_facts>
${JSON.stringify(facts)}
</tool_facts>

<verified_facts>
${JSON.stringify(b.facts)}
</verified_facts>

The first paragraph answers the query directly in 2–3 sentences and names the best options with links. Length: as long as the intent needs, usually 900–1800 words.`,
  });
}

async function review(lang, topic, facts, b, d) {
  return ask({
    effort: 'high',
    schema: reviewSchema,
    system: `You are a strict editor at Atlas (atlas.ehroz.pro). You fix the article yourself and return the corrected version. ${STYLE}\n\n${LINKS}\n\n${MARKDOWN}`,
    prompt: `Check this ${LANG_NAME[lang]} article and return the fixed title, description and body.

Checklist:
- every statement about a tool is backed by TOOL FACTS or VERIFIED FACTS; remove or soften anything that isn't, and list it in issues
- the first paragraph answers the query "${topic.primaryKeyword[lang]}" directly; no filler intro
- the primary keyword is in the title, first paragraph and one H2, without stuffing
- title at most 60 characters; description 120–155 characters
- headings: no H1 in the body, no skipped levels
- every catalog site is linked to its /tool/<id>/ page on first mention; no other internal links; no links to the tools' own sites
- no AI-sounding phrases, no marketing adjectives, no repeated summary at the end
- natural ${LANG_NAME[lang]}, not translated-sounding
- keep the <!-- AUTHOR: ... --> comment

<tool_facts>
${JSON.stringify(facts)}
</tool_facts>

<verified_facts>
${JSON.stringify(b.facts)}
</verified_facts>

<article>
TITLE: ${d.title}
DESCRIPTION: ${d.description}

${d.body}
</article>`,
  });
}

// ---- checks ------------------------------------------------------------

/** Catalog links to unknown pages become plain text; returns body and the set of linked catalog pages. */
function cleanLinks(body) {
  const linked = new Set();
  const out = body.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, href) => {
    const cat = href.match(/^\/(tool|alternatives|category)\/([^/]+)\/?$/);
    if (cat) {
      const ok = cat[1] === 'category' ? categoryIds.has(cat[2]) : toolIds.has(cat[2]);
      if (!ok) return text;
      linked.add(`/${cat[1]}/${cat[2]}/`);
      return `[${text}](/${cat[1]}/${cat[2]}/)`;
    }
    if (href.startsWith('/')) return text; // other internal paths: not allowed
    return m;
  });
  return { body: out, linked };
}

function cutByWord(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,.;:—–-]+$/, '') + '…';
}

const yamlStr = (s) => JSON.stringify(s);
const yamlList = (xs) => `[${xs.map(yamlStr).join(', ')}]`;

function fileText(lang, topic, b, final, published) {
  return `---
title: ${yamlStr(final.title)}
description: ${yamlStr(final.description)}
type: ${topic.type}
primaryKeyword: ${yamlStr(topic.primaryKeyword[lang])}
secondaryKeywords: ${yamlList(topic.secondaryKeywords[lang])}
tools: ${yamlList(topic.tools)}
categories: ${yamlList(topic.categories)}
published: ${published}
updated: ${today()}
trendSource: ${yamlStr(topic.trendSource)}
sources: ${yamlList(b.sources.filter((s) => /^https?:\/\//.test(s)))}
---

${final.body.trim()}
`;
}

// ---- run ---------------------------------------------------------------

const existing = new Map(existingArticles().map((a) => [a.slug, a]));
const written = [];

for (const topic of topics) {
  if (only && topic.slug !== only) continue;
  console.log(`\n▶ ${topic.slug} (${topic.action})`);
  try {
    // tools in the order the brief prefers, unknown ids dropped
    const facts = toolFacts(topic.tools);
    console.log('  research…');
    const notes = await research(topic, facts);
    fs.writeFileSync(path.join(dir, `${topic.slug}.research.md`), notes);
    console.log('  brief…');
    const b = await brief(topic, facts, notes);
    fs.writeFileSync(path.join(dir, `${topic.slug}.brief.json`), JSON.stringify(b, null, 2));
    const order = b.toolOrder.filter((id) => topic.tools.includes(id));
    topic.tools = [...order, ...topic.tools.filter((id) => !order.includes(id))];

    const published = topic.action === 'update' && existing.get(topic.slug)
      ? fs.readFileSync(path.join(ARTICLES_DIR, topic.slug, 'en.md'), 'utf8').match(/^published:\s*(\S+)/m)?.[1] ?? today()
      : today();

    const files = {};
    const issues = {};
    for (const lang of LANGS) {
      console.log(`  draft ${lang}…`);
      const d = await draft(lang, topic, facts, b);
      console.log(`  review ${lang}…`);
      const r = await review(lang, topic, facts, b, d);
      issues[lang] = r.issues;

      const { body, linked } = cleanLinks(r.body.replace(/^#\s+.*\n+/, ''));
      if (linked.size < 3) throw new Error(`${lang}: only ${linked.size} catalog links in the text`);
      const final = {
        title: r.title.trim(),
        description: cutByWord(r.description.trim(), 160),
        body,
      };
      if (final.title.length > 70) throw new Error(`${lang}: title is ${final.title.length} characters`);
      if (final.description.length < 50) throw new Error(`${lang}: description is too short`);
      files[lang] = fileText(lang, topic, b, final, published);
    }

    const outDir = path.join(ARTICLES_DIR, topic.slug);
    fs.mkdirSync(outDir, { recursive: true });
    for (const lang of LANGS) fs.writeFileSync(path.join(outDir, `${lang}.md`), files[lang]);
    written.push(topic.slug);
    console.log(`  ✓ src/content/articles/${topic.slug}/`);

    fs.appendFileSync(
      reportFile,
      `## ${topic.action === 'update' ? 'Updated' : 'New'}: \`${topic.slug}\`

- **Keywords:** ${topic.primaryKeyword.en} / ${topic.primaryKeyword.ru}
- **Why now:** ${topic.trendSource} (score ${topic.score})
- **Angle:** ${b.angle}
- **Sites:** ${topic.tools.join(', ')}
- **Sources checked:** ${b.sources.length}

Editor notes (en): ${issues.en.length ? '\n' + issues.en.map((i) => `  - ${i}`).join('\n') : 'none'}
Editor notes (ru): ${issues.ru.length ? '\n' + issues.ru.map((i) => `  - ${i}`).join('\n') : 'none'}

`,
    );
  } catch (e) {
    console.log(`  ✗ ${e.message}`);
    fs.appendFileSync(reportFile, `## Skipped: \`${topic.slug}\`\n\n${e.message}\n\n`);
  }
}

console.log(`\n${written.length} article(s) written.`);
if (!written.length) process.exitCode = 1;
