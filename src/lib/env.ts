import { SITE } from '~/site.config';

/**
 * Where this build will be served.
 * - Vercel sets VERCEL_ENV = production | preview | development.
 * - GitHub Pages passes SITE_URL; on ehroz1.github.io it is not the domain.
 * Only a build for the production host (and, on Vercel, a production
 * deployment) is indexable. Everything else gets noindex and a closed robots.txt.
 */
const vercelEnv = process.env.VERCEL_ENV;
const siteHost = new URL(import.meta.env.SITE ?? SITE.url).host;

export const ON_VERCEL = !!vercelEnv;
export const IS_PREVIEW = vercelEnv === 'preview' || vercelEnv === 'development';
export const IS_PROD = siteHost === SITE.host && !IS_PREVIEW && process.env.ATLAS_NOINDEX !== '1';
/** Vercel Web Analytics only exists on Vercel production deployments */
export const VERCEL_ANALYTICS = vercelEnv === 'production';
