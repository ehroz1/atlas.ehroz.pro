// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://atlas.ehroz.pro',
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
