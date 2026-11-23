/**
 * robots.txt, built from code. Production: open to search engines and AI
 * search; AI-training bots in their own group, switched by
 * ALLOW_AI_TRAINING in site.config.ts; Clean-param strips query filter and
 * tracking parameters for Yandex. Any other build (previews, github.io):
 * everything closed.
 */
import type { APIRoute } from 'astro';
import { ALLOW_AI_TRAINING, SITE } from '~/site.config';
import { IS_PROD } from '~/lib/env';
import { absUrl } from '~/lib/seo';

export const SEARCH_BOTS = [
  'Googlebot', 'GoogleOther', 'Bingbot', 'YandexBot', 'YandexAdditional', 'DuckDuckBot', 'DuckAssistBot', 'Applebot',
  'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Perplexity-User', 'Claude-SearchBot', 'Claude-User',
  'Meta-ExternalFetcher', 'YouBot', 'MistralAI-User',
];
export const TRAINING_BOTS = [
  'GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Meta-ExternalAgent', 'Bytespider', 'Amazonbot', 'cohere-ai',
];

/** Query parameters that do not create separate indexable pages (Yandex Clean-param). */
export const CLEAN_PARAMS = 'q&category&pricing&platform&sort&saved&c&edit&next&subscribe&unsubscribe&ref&utm_source&utm_medium&utm_campaign&utm_content&utm_term&yclid&gclid&fbclid';

export const GET: APIRoute = () => {
  const sitemap = absUrl('/sitemap-index.xml');
  const body = IS_PROD
    ? [
        `# ${SITE.host}: open to search engines and AI search.`,
        ...SEARCH_BOTS.map((b) => `User-agent: ${b}`),
        'Allow: /',
        'Disallow: /admin/',
        '',
        `# AI training crawlers: ${ALLOW_AI_TRAINING ? 'allowed' : 'not allowed'} (ALLOW_AI_TRAINING in src/site.config.ts)`,
        ...TRAINING_BOTS.map((b) => `User-agent: ${b}`),
        ALLOW_AI_TRAINING ? 'Allow: /' : 'Disallow: /',
        ...(ALLOW_AI_TRAINING ? ['Disallow: /admin/'] : []),
        '',
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin/',
        `Clean-param: ${CLEAN_PARAMS}`,
        '',
        `Sitemap: ${sitemap}`,
        '',
      ]
    : ['# Not the production site: nothing here should be indexed.', 'User-agent: *', 'Disallow: /', ''];
  return new Response(body.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
