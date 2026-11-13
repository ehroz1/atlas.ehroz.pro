# SEO-чек-лист atlas.ehroz.pro

✅ сделано в коде · 👤 сделать вручную · ➖ не относится

## Индексация и адреса

- ✅ Один канонический адрес: https, без www, со слешем в конце (`trailingSlash: 'always'`).
- ✅ Редиректы 301 в `vercel.json`: `www → без www`, `/page → /page/`, `/index.html → /`.
  `http → https` делает хостинг (Vercel / GitHub Pages).
- 👤 Сейчас сайт на GitHub Pages: `vercel.json` начнёт работать после переезда на Vercel (см. DEPLOY.md).
- ✅ Индексируется только продакшн: превью Vercel и github.io получают `noindex` (meta), закрытый `robots.txt`;
  на `*.vercel.app` ещё и заголовок `X-Robots-Tag`.
- ✅ canonical без параметров на каждой странице; hreflang `ru` / `en` / `x-default`.
- ✅ Уникальные title ≤ 60 и description 50–160 символов (обрезка по слову, `src/lib/seo.ts`).
- ✅ `robots.txt` из кода (`src/pages/robots.txt.ts`): поисковые и AI-поисковые роботы открыты,
  обучающие — отдельной группой под флажком `ALLOW_AI_TRAINING` (`src/site.config.ts`), в конце Sitemap.
- ✅ Sitemap при каждой сборке: `/sitemap-index.xml` → `/sitemap-0.xml`, только канонические страницы,
  с hreflang; `lastmod` = поле `updated` в данных (не дата сборки).
- ✅ 404: `noindex`, без canonical, ссылки на основные страницы на обоих языках.
- ✅ IndexNow: свой ключ `public/<ключ>.txt`, `scripts/indexnow.mjs`, workflow `indexnow.yml`.
- ✅ Мета-теги подтверждения Google / Яндекса / Bing — только на продакшне и только если код задан.
- 👤 Подтвердить домен и отправить sitemap в GSC, Вебмастере, Bing (DEPLOY.md).

## Метаданные и микроразметка

- ✅ Open Graph + Twitter Card на каждой странице, `og:updated_time`, `og:locale` + alternate.
- ✅ OG-обложки 1200×630 генерируются при сборке для всех страниц на обоих языках (`src/pages/og/`).
- ✅ JSON-LD из `src/lib/schema.ts`, один `@graph` на страницу, связи через `@id`:
  WebSite (+SearchAction), CollectionPage / ItemPage / AboutPage / ContactPage, BreadcrumbList,
  Person (тот же `@id`, что на ehroz.pro), ItemList, SoftwareApplication / WebApplication.
- ✅ Без выдуманных рейтингов, отзывов и цен.
- ➖ FAQPage: на сайте нет блока вопросов и ответов.
- ✅ favicon.svg, favicon-32.png, apple-touch-icon.png.

## Нейросети (GEO)

- ✅ Весь текст в готовом HTML (SSG), без подгрузки скриптом.
- ✅ `/llms.txt` и `/llms-full.txt` собираются из тех же данных (`src/lib/routes.ts`).
- ✅ Под единственным h1 первый абзац передаёт суть страницы.
- ✅ Бренд и автор — из одного места: `src/site.config.ts`.

## Аналитика

- ✅ Vercel Web Analytics в лейауте, только в продакшн-сборке на Vercel и только для своего домена.
- 👤 Включить в Vercel: Project → Analytics → Enable (после переезда).
- ✅ GA4 и Метрика только после согласия; пока ID пустые — ни счётчиков, ни cookies, ни плашки.
- ✅ «Настройки cookies» в подвале отзывает согласие.
- 👤 Создать GA4 и Метрику, вписать ID в `src/analytics.config.ts`.
- 👤 Отметить `outbound_click`, `contact_click` ключевыми в GA4 и целями в Метрике.

## Безопасность

- ✅ CSP мета-тегом в каждой странице с SHA-256 хешами inline-скриптов (`integrations/csp.mjs`).
- ✅ Заголовки в `vercel.json`: frame-ancestors, X-Frame-Options, nosniff, Referrer-Policy,
  Permissions-Policy, COOP, HSTS.
- 👤 На GitHub Pages заголовки не отдаются — начнут работать на Vercel.
- ✅ Кеш: `/assets/*` immutable на год, иконки на неделю.
- ✅ Dependabot: npm и github-actions раз в неделю.

## Мониторинг

- ✅ `npm run check:seo` (в CI и перед деплоем).
- ✅ `npm run check:a11y` (axe, WCAG 2 A/AA, светлая и тёмная схемы, 1280 и 375 px).
- ✅ `uptime.yml` — каждый час; `seo-monitor.yml` — раз в неделю; `indexnow.yml` — после деплоя.
- 👤 Включить уведомления Vercel о неудачных деплоях (после переезда).
- 👤 Не держать Attack Challenge Mode включённым постоянно.
