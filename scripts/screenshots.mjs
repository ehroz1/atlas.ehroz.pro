/**
 * Captures a homepage screenshot for every tool in src/data/tools.json
 * into src/assets/shots/<id>.jpg. Astro then optimizes them at build time.
 *
 *   npm run shots            — only tools without a screenshot
 *   npm run shots -- --all   — re-capture everything
 *   npm run shots -- figma   — specific ids
 */
import { createRequire } from 'node:module';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Uses a project-local Playwright if installed (npm i -D playwright),
// otherwise falls back to a global one found through NODE_PATH.
const { chromium } = await import('playwright').catch(() =>
  createRequire(import.meta.url)('playwright'),
);

const root = new URL('../', import.meta.url);
const tools = JSON.parse(await readFile(new URL('src/data/tools.json', root), 'utf8'));
const outDir = fileURLToPath(new URL('src/assets/shots/', root));

const args = process.argv.slice(2);
const all = args.includes('--all');
const ids = args.filter((a) => !a.startsWith('--'));

const exists = (p) => access(p).then(() => true, () => false);

const queue = [];
for (const tool of tools) {
  if (ids.length && !ids.includes(tool.id)) continue;
  const file = `${outDir}${tool.id}.jpg`;
  if (!all && !ids.length && (await exists(file))) continue;
  queue.push({ tool, file });
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  locale: 'en-US',
  colorScheme: 'light',
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
});

// Hide the most common cookie banners so screenshots show the actual site.
const hideBanners = `
  [id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i],
  [id*="onetrust" i], [class*="onetrust" i], #CybotCookiebotDialog, .cc-window
  { display: none !important; }
`;

let ok = 0;
const failed = [];
const workers = 4;

async function run({ tool, file }) {
  const page = await context.newPage();
  try {
    await page.goto(tool.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.addStyleTag({ content: hideBanners }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(Number(process.env.SHOT_WAIT ?? 2500));
    // Bot walls (Cloudflare etc.) make useless screenshots — skip them,
    // the card falls back to showing the domain name.
    const text = (await page.title()) + ' ' + (await page.locator('body').innerText().catch(() => ''));
    if (/just a moment|security verification|verify you are human|access denied/i.test(text.slice(0, 2000))) {
      throw new Error('blocked by a bot check');
    }
    await page.screenshot({ path: file, type: 'jpeg', quality: 82 });
    ok++;
    console.log('✓', tool.id);
  } catch (err) {
    failed.push(tool.id);
    console.log('✗', tool.id, String(err.message).split('\n')[0]);
  } finally {
    await page.close();
  }
}

const pool = Array.from({ length: workers }, async () => {
  while (queue.length) await run(queue.shift());
});
await Promise.all(pool);
await browser.close();

console.log(`\n${ok} captured${failed.length ? `, failed: ${failed.join(', ')}` : ''}`);
