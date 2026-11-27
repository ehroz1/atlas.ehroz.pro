# SEO-чек-лист atlas.ehroz.pro

✅ сделано в коде · 👤 сделать вручную · ➖ не относится

## Индексация и адреса

- ✅ Один канонический адрес: https, без www, со слешем в конце (`trailingSlash: 'always'`).
- ✅ Редиректы 301 в `vercel.json`: `www → без www`, `/page → /page/`, `/index.html → /`,
  а также 301-редиректы всех 25 удалённых/объединённых карточек сайтов (`/tool/<id>/`, `/alternatives/<id>/` на всех языках) на соответствующие категории.
  `http → https` делает хостинг (Vercel / GitHub Pages).
- ✅ Дефолтная ветка GitHub переключена на `main` (чтобы Vercel и cron-воркфлоу всегда брали актуальный код).
- ✅ Сайт работает на Vercel: применяются редиректы, кеш и заголовки безопасности из `vercel.json`.
- ✅ Индексируется только продакшн: превью Vercel и github.io получают `noindex` (meta), закрытый `robots.txt`;
  на `*.vercel.app`, а также для `/admin/*`, `/account/*`, `/collection/*`, `/search/*`, `/404/` и `/410/` отдаётся заголовок `X-Robots-Tag: noindex, nofollow`.
- ✅ canonical без параметров на каждой странице; hreflang `ru` / `en` / `x-default`.
- ✅ Уникальные title ≤ 60 и description 50–160 символов (обрезка по слову, `src/lib/seo.ts`).
- ✅ `robots.txt` из кода (`src/pages/robots.txt.ts`): поисковые и AI-поисковые роботы открыты, закрыты параметрические URL поиска и фильтров (`/*?q=*`, `/*?category=*`, `/*?pricing=*`, `/*?platform=*`, `/*?sort=*`, `/*?saved=*`, `/*?next=*`),
  обучающие — отдельной группой под флажком `ALLOW_AI_TRAINING` (`src/site.config.ts`), директива `Clean-param` для Яндекса, в конце Sitemap.
- ✅ Sitemap при каждой сборке разделён по типам контента (`/sitemap-index.xml`):
  `/sitemap-pages.xml` (страницы), `/sitemap-categories.xml` (категории), `/sitemap-tools.xml` (карточки и альтернативы + `<image:image>` обложек),
  `/sitemap-articles.xml` (блог, статьи и автор + `<image:image>` обложек), `/sitemap-news.xml` (Google News — включается в индекс только при наличии статей за последние 48 ч, чтобы не отдавать пустой `<urlset>`), плюс полный `/sitemap-0.xml`.
  Только канонические страницы со статусом 200, с hreflang и `lastmod` = реальная дата обновления контента.
- ✅ 404 (`/404.html`) и 410 Gone (`/410/`): `noindex`, без canonical, полезная навигация на обоих языках.
- ✅ IndexNow: свой ключ `public/<ключ>.txt`, `scripts/indexnow.mjs`, workflow `indexnow.yml`.
- ✅ Мета-теги подтверждения Google / Яндекса / Bing — только на продакшне и только если код задан.
- 👤 Подтвердить домен и отправить sitemap в GSC, Вебмастере, Bing (DEPLOY.md).

## Метаданные и микроразметка

- ✅ Open Graph + Twitter Card на каждой странице: `og:type="article"` для статей и карточек (`article:published_time`, `article:modified_time`, `article:author`, `article:section`), `og:type="profile"` для страницы автора, `twitter:image:alt`, `og:updated_time`, `og:locale` + alternate.
- ✅ OG-обложки 1200×630 генерируются при сборке для всех страниц на обоих языках (`src/pages/og/`).
- ✅ JSON-LD из `src/lib/schema.ts`, один `@graph` на страницу, связи через `@id`:
  Organization, WebSite (+SearchAction), CollectionPage / ItemPage / AboutPage / ContactPage / ProfilePage, BreadcrumbList,
  Person (тот же `@id`, что на ehroz.pro), ItemList, SoftwareApplication / WebApplication, BlogPosting / Article / NewsArticle (`wordCount`, `timeRequired`, `citation`), FAQPage, HowTo.
- ✅ Без выдуманных рейтингов, отзывов и цен.
- ✅ FAQPage + видимый блок «Частые вопросы» (`<details>`) в конце тематических статей + `HowTo` для пошаговых руководств.
- ✅ favicon.svg, favicon-32.png, apple-touch-icon.png.

## Нейросети (GEO / AEO) и E-E-A-T

- ✅ Весь текст в готовом HTML (SSG), без подгрузки скриптом.
- ✅ `/llms.txt` и `/llms-full.txt` собираются из тех же данных (`src/lib/routes.ts`), включая источники (`sources`) и вопросы-ответы (`faq`) всех статей.
- ✅ Под единственным h1 первый абзац передаёт суть страницы.
- ✅ Сравнительные таблицы, проверяемые первоисточники (`sources`) и блок FAQ в статьях.
- ✅ Редакционная политика `/editorial/` и `/ru/editorial/` (критерии отбора, проверка лицензий, политика исправлений, прозрачность партнёрских ссылок `rel="sponsored"`).
- ✅ Бренд и автор — из одного места: `src/site.config.ts`.

## Экологичный UX и навигация

- ✅ Сохранение порядка карточек (детерминированный seed в `sessionStorage`) и позиции прокрутки (`atlas:scroll`) при возврате назад в браузере.
- ✅ Переключатель анимаций в подвале («Уменьшить движение» / `localStorage` `atlas:motion` / класс `html.no-motion`) в дополнение к системному `prefers-reduced-motion`.
- ✅ Никаких всплывающих окон, автовоспроизведения со звуком и навязчивых баннеров.

## Аналитика

- ✅ Vercel Web Analytics в лейауте, только в продакшн-сборке на Vercel и только для своего домена.
- 👤 Включить в Vercel: Project → Analytics → Enable (после переезда).
- ✅ GA4 (`G-VMHW04TWE8`) и Метрика (`114501614`) загружаются только после согласия пользователя.
- ✅ Отслеживание ключевых событий: `outbound_click`, `internal_click`, `contact_click`, `scroll_depth`, `read_complete` (дочитывание статьи), `search`, `filter_use`, `bookmark_click`, `share_click`, `sign_in`, `newsletter_subscribe`, `collection_create`, `pro_checkout_click`, `language_switch`, `page_not_found`, `js_error`.
- ✅ «Настройки cookies» в подвале отзывает согласие.
- 👤 Отметить `outbound_click`, `contact_click`, `read_complete`, `newsletter_subscribe`, `pro_checkout_click` ключевыми в GA4 и целями в Метрике.

## Безопасность

- ✅ CSP мета-тегом в каждой странице с SHA-256 хешами inline-скриптов (`integrations/csp.mjs`).
- ✅ Заголовки в `vercel.json`: frame-ancestors, X-Frame-Options, nosniff, Referrer-Policy,
  Permissions-Policy, COOP, HSTS, а также `Access-Control-Allow-Origin: *` для публичного JSON API `/api/v1/*`.
- ✅ Honeypot-защита от спам-ботов во всех формах (предложение сайта, вход по почте, подписка на рассылку).
- 👤 На GitHub Pages заголовки не отдаются — начнут работать на Vercel.
- ✅ Кеш: `/assets/*` immutable на год, иконки на неделю.
- ✅ Dependabot: npm и github-actions раз в неделю.

## Мониторинг

- ✅ `npm run check:seo` (в CI и при сборке на Vercel — проверяет все 751 HTML-страниц, split-sitemaps, `410.html`, JSON-LD `@graph`, `Clean-param`).
- ✅ `npm run check:a11y` (axe, WCAG 2 A/AA, светлая и тёмная схемы, 1280 и 375 px).
- ✅ `uptime.yml` — каждый час; `seo-monitor.yml` — раз в неделю; `indexnow.yml` — после деплоя; `catalog-sync.yml` — ежедневное обновление `popular.json` и скриншотов в `main` (для автоматического редеплоя на Vercel).
- 👤 Включить уведомления Vercel о неудачных деплоях (после переезда).
- 👤 Не держать Attack Challenge Mode включённым постоянно.

## Статьи и Google Discover / News

- ✅ RSS статей с полным текстом и обложкой: `/blog/rss.xml` (en), `/ru/blog/rss.xml` (ru);
  `<link rel="alternate">` на страницах блога, статей и автора.
- ✅ Страница автора `/author/ehroz/` (ProfilePage + Person), на неё ведут подпись и блок «Об авторе» в статьях.
- ✅ Новостной sitemap `/sitemap-news.xml` (статьи за последние 2 дня), подключён в `sitemap-index.xml`.
- ✅ Обложки ≥ 1200 px, `max-image-preview:large` — требование Discover.
- 👤 Search Console → «Эффективность» → «Discover»: раздел появится, когда статьи начнут показываться в ленте.
