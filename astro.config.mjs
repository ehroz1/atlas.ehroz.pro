// @ts-check
import { defineConfig } from 'astro/config';
import csp from './integrations/csp.mjs';
import { analytics } from './src/analytics.config.ts';

// On GitHub Pages without a custom domain the site lives in a sub-folder
// (ehroz1.github.io/atlas.ehroz.pro/). The deploy workflow passes that in;
// locally, on Vercel and on the custom domain both are unset.
const site = process.env.SITE_URL || 'https://atlas.ehroz.pro';
const base = process.env.BASE_PATH || '/';
const preview = process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development';

export default defineConfig({
  site,
  base,
  // every page URL ends with "/" (vercel.json redirects /page → /page/)
  trailingSlash: 'always',
  build: { assets: 'assets', format: 'directory' },
  // languages are routed by hand: src/pages/[...lang]/, see src/i18n/index.ts
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  integrations: [csp({ ga4: analytics.ga4, metrika: analytics.metrika, preview })],
});
