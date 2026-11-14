#!/usr/bin/env node
/**
 * npm run check:a11y — axe-core (WCAG 2 A/AA) on the key pages of dist/,
 * in light and dark color-scheme, at 1280 px and 375 px. Also fails on
 * horizontal scroll at 375 px. Needs Playwright with Chromium.
 */
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const axePath = require.resolve('axe-core/axe.min.js');

const PORT = 4399;
const PAGES = ['/', '/ru/', '/en/', '/categories/', '/category/design/', '/ru/category/ai/', '/tool/figma/', '/ru/tool/claude/', '/about/', '/ru/about/', '/contact/', '/ru/contact/', '/submit/', '/wall/', '/no-such-page/'];

const server = await serve('dist', PORT);
const browser = await chromium.launch();
let total = 0;
try {
  for (const scheme of ['light', 'dark']) {
    for (const width of [1280, 375]) {
      const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width, height: 900 }, bypassCSP: true, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      for (const p of PAGES) {
        await page.goto(`http://localhost:${PORT}${p}`, { waitUntil: 'load' });
        await page.addScriptTag({ path: axePath });
        const res = await page.evaluate(() =>
          // @ts-ignore
          window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }),
        );
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        const label = `${scheme} ${width}px ${p}`;
        if (overflow > 0 && !p.startsWith('/wall')) {
          total++;
          console.log(`✗ ${label}: horizontal scroll (${overflow}px)`);
        }
        for (const v of res.violations) {
          total += v.nodes.length;
          console.log(`✗ ${label}: [${v.impact}] ${v.id} — ${v.help} (${v.nodes.length})`);
          for (const n of v.nodes.slice(0, 3)) console.log(`    ${n.target.join(' ')}  ${n.failureSummary?.split('\n')[1]?.trim() ?? ''}`);
        }
        if (!res.violations.length && !(overflow > 0)) console.log(`✓ ${label}`);
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}
console.log(total ? `\n${total} accessibility problem(s)` : '\n✓ axe: 0 violations');
process.exit(total ? 1 : 0);
