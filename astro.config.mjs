// @ts-check
import { defineConfig } from 'astro/config';

// On GitHub Pages without a custom domain the site lives in a sub-folder
// (ehroz1.github.io/atlas.ehroz.pro/). The deploy workflow passes that in;
// locally and on the custom domain both are unset.
const site = process.env.SITE_URL || 'https://atlas.ehroz.pro';
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  build: { assets: 'assets' },
  i18n: {
    // English is the only language for now. To add Russian:
    // 1) add 'ru' to locales, 2) fill src/i18n/ru.ts, 3) add `ru` fields in src/data/*.json
    defaultLocale: 'en',
    locales: ['en'],
    routing: { prefixDefaultLocale: false },
  },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
