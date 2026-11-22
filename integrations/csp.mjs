/**
 * After the build, puts a Content-Security-Policy <meta> into every HTML
 * page, with the SHA-256 hash of each of its inline scripts. Analytics
 * hosts are added only when their ID is set; vercel.live only on Vercel
 * previews. (frame-ancestors can't live in a meta tag: it is sent as a
 * header, see vercel.json.)
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function* htmlFiles(dir, root = dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    // admin/ is a static page from public/ with its own, stricter policy
    if (e.isDirectory()) { if (e.name !== 'admin' || dir !== root) yield* htmlFiles(p, root); }
    else if (e.name.endsWith('.html')) yield p;
  }
}

/** @param {{ ga4?: string, metrika?: string, goatcounter?: string, preview?: boolean, supabase?: string }} opts */
export function policyHosts({ ga4, metrika, goatcounter, preview, supabase }) {
  const h = { script: [], img: [], connect: [], frame: [] };
  if (supabase) {
    // accounts, collections, member counter: REST + Realtime websocket
    const host = new URL(supabase).host;
    h.connect.push(`https://${host}`, `wss://${host}`);
  }
  // GoatCounter: the page view is a plain image request to <code>.goatcounter.com
  if (goatcounter) h.img.push(`https://${goatcounter}.goatcounter.com`);
  if (ga4) {
    h.script.push('https://www.googletagmanager.com');
    h.img.push('https://*.google-analytics.com', 'https://www.googletagmanager.com');
    h.connect.push('https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://www.googletagmanager.com');
  }
  if (metrika) {
    h.script.push('https://mc.yandex.ru', 'https://mc.yandex.com', 'https://yastatic.net');
    h.img.push('https://mc.yandex.ru', 'https://mc.yandex.com');
    h.connect.push('https://mc.yandex.ru', 'https://mc.yandex.com');
    h.frame.push('blob:', 'https://mc.yandex.ru', 'https://mc.yandex.com');
  }
  if (preview) {
    h.script.push('https://vercel.live');
    h.img.push('https://vercel.live', 'https://vercel.com');
    h.connect.push('https://vercel.live', 'wss://ws-us3.pusher.com');
    h.frame.push('https://vercel.live');
  }
  return h;
}

/** @param {{ ga4?: string, metrika?: string, goatcounter?: string, preview?: boolean, supabase?: string }} opts */
export default function csp(opts) {
  return {
    name: 'atlas-csp',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const hosts = policyHosts(opts);
        let n = 0;
        for await (const file of htmlFiles(root)) {
          let html = await fs.readFile(file, 'utf8');
          const hashes = new Set();
          for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
            const [, attrs, body] = m;
            if (/\bsrc\s*=/.test(attrs) || /type\s*=\s*["']?application\/(ld\+)?json/i.test(attrs) || !body.trim()) continue;
            hashes.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
          }
          const policy = [
            "default-src 'self'",
            ['script-src', "'self'", ...hashes, ...hosts.script].join(' '),
            "style-src 'self' 'unsafe-inline'",
            ['img-src', "'self'", 'data:', ...hosts.img].join(' '),
            "font-src 'self'",
            ['connect-src', "'self'", ...hosts.connect].join(' '),
            ...(hosts.frame.length ? [['frame-src', ...hosts.frame].join(' ')] : []),
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; ');
          html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/i, '');
          html = html.replace(/(<meta charset="utf-8"\s*\/?>)/i, `$1<meta http-equiv="Content-Security-Policy" content="${policy}">`);
          await fs.writeFile(file, html);
          n++;
        }
        logger.info(`CSP meta added to ${n} pages`);
      },
    },
  };
}
