#!/usr/bin/env node
/**
 * The whole pipeline: trends → topics → articles.
 *
 *   npm run articles                         # weekly run, 3 topics from trends
 *   npm run articles -- --count 1            # one topic
 *   npm run articles -- --topic "free icon sites"   # a topic you choose, no trend step
 *
 * Then: npm run build && npm run check:seo, read the articles, add your own
 * experience where the <!-- AUTHOR --> comment is, open a PR.
 * In CI this runs from .github/workflows/articles.yml, which opens the PR itself.
 */
import { execFileSync } from 'node:child_process';
import { arg } from './lib/args.mjs';

const run = (script, args = []) =>
  execFileSync(process.execPath, [new URL(script, import.meta.url).pathname, ...args], { stdio: 'inherit' });

const topic = arg('topic');
const count = String(arg('count', 3));

if (!topic) run('./collect-trends.mjs');
run('./pick-topics.mjs', topic ? ['--topic', topic] : ['--count', count]);
run('./write-article.mjs');
