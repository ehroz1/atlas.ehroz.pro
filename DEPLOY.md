# Деплой и подключение сервисов

## Где живёт сайт

Сейчас `atlas.ehroz.pro` отдаёт **GitHub Pages** (DNS: `CNAME atlas → ehroz1.github.io`).
Сборку и публикацию делает `.github/workflows/deploy.yml` при пуше в `main`.

Проект уже готов к переезду на **Vercel**: `vercel.json` содержит редиректы, заголовки
безопасности, кеш и `noindex` для `*.vercel.app`. Переезд = импорт репозитория в Vercel
и смена DNS-записи (это делаете вы, см. ниже). Пока сайт на GitHub Pages:

- заголовки из `vercel.json` не применяются (GitHub Pages их не умеет); CSP всё равно
  работает — она встроена в каждую страницу мета-тегом;
- `http → https` и `www → без www` делает сам GitHub Pages (Settings → Pages → Enforce HTTPS);
- `/page → /page/` GitHub Pages делает сам (301), а `/index.html` отдаётся как есть;
- Vercel Web Analytics не подключается (его скрипт есть только в сборке на Vercel).

## Процесс

1. Ветка от `main`.
2. `npm run build && npm run check:seo` — должно быть зелёным.
   По желанию: `npm run check:a11y` (axe, нужен Playwright с Chromium).
3. Пуш ветки → на Vercel появится превью (`*.vercel.app`, всегда `noindex`);
   на GitHub прогонится `CI` (сборка + `check:seo`).
4. Pull request в `main`, проверить превью.
5. Merge → продакшн-деплой → workflow `IndexNow` сообщит Яндексу и Bing об изменённых страницах.

## Откат

- **Vercel:** Project → Deployments → выбрать прошлый рабочий деплой → ⋯ → **Promote to Production**.
- **GitHub Pages:** Actions → Deploy to GitHub Pages → открыть прошлый успешный запуск →
  **Re-run all jobs** (соберётся тот же коммит), либо `git revert` плохого коммита в `main`.

## Переезд на Vercel (пошагово)

Дефолтная ветка репозитория `ehroz1/atlas.ehroz.pro` уже переключена на `main`, а `vercel.json` полностью настроен (включая `buildCommand: "node scripts/popular.mjs && npm run build && npm run check:seo"`, 301-редиректы удалённых карточек, CORS для `/api/v1/*`, `X-Robots-Tag` для технических страниц и заголовки безопасности). Для автоматического обновления скриншотов новых сайтов и `popular.json` добавлен воркфлоу `.github/workflows/catalog-sync.yml`, который коммитит обновления в `main` и триггерит деплой на Vercel.

1. vercel.com → **Add New… → Project** → импортировать `ehroz1/atlas.ehroz.pro` (ветка `main`).
   Framework определится как Astro, все настройки подтянутся из `vercel.json`.
   По желанию в **Environment Variables** можно добавить `GOATCOUNTER_TOKEN` (чтобы `node scripts/popular.mjs` обновлял статистику прямо во время сборки на Vercel).
2. Project → **Settings → Domains** → добавить `atlas.ehroz.pro` и `www.atlas.ehroz.pro`
   (www — с 301-редиректом на основной `atlas.ehroz.pro`).
3. У регистратора домена `ehroz.pro` поменять DNS-запись:
   `atlas` → `CNAME cname.vercel-dns.com` (или значение, которое покажет Vercel в панели Domains).
   **Это смена DNS — выполняется владельцем домена.**
4. Project → **Analytics → Enable** (включить Vercel Web Analytics).
5. Settings → Git → включить уведомления; аккаунт → **Settings → Notifications** →
   отметить **Deployment Failed** (почта/приложение).
6. Firewall → **Attack Challenge Mode** включать только во время атаки, не держать постоянно:
   он закрывает сайт от поисковых роботов.
7. После переезда и проверки SSL-сертификата на Vercel:
   выключить `.github/workflows/deploy.yml` (Actions → Deploy to GitHub Pages → ⋯ → Disable workflow, при этом `catalog-sync.yml`, `ci.yml`, `indexnow.yml`, `uptime.yml` и `seo-monitor.yml` остаются включёнными)
   и в Settings → Pages → Source выбрать `None`.

## Google Search Console

1. https://search.google.com/search-console → **Добавить ресурс** → тип **Доменный ресурс** →
   `ehroz.pro` (покрывает и `atlas.ehroz.pro`). Подтверждение — TXT-запись в DNS
   (если ресурс `ehroz.pro` уже подтверждён для основного сайта, ничего делать не нужно).
   Альтернатива без DNS: ресурс **С префиксом в URL** `https://atlas.ehroz.pro/` →
   способ **HTML-тег** → значение `content` вписать в `SEARCH_VERIFICATION.google`
   в `src/analytics.config.ts` → задеплоить → **Подтвердить**.
2. Слева **Файлы Sitemap** → отправить `https://atlas.ehroz.pro/sitemap-index.xml` (он включает `/sitemap-pages.xml`, `/sitemap-categories.xml`, `/sitemap-tools.xml`, `/sitemap-articles.xml`, `/sitemap-news.xml`).
3. **Проверка URL** → главная → **Запросить индексирование**.

## Яндекс Вебмастер

1. https://webmaster.yandex.ru → **Добавить сайт** → `https://atlas.ehroz.pro/`.
2. Метатег уже прописан в `src/analytics.config.ts` (`SEARCH_VERIFICATION.yandex: '623648db38a27ec0'`). Нажать **Проверить**.
3. **Индексирование → Файлы Sitemap** → `https://atlas.ehroz.pro/sitemap-index.xml` → **Добавить**.
4. **Индексирование → Переобход страниц** → главная `https://atlas.ehroz.pro/` и русская `https://atlas.ehroz.pro/ru/`.
5. **Настройки → Привязка к Метрике** → привязать счётчик `114501614`.
6. IndexNow уже настроен: ключ лежит в `public/<ключ>.txt`, workflow `IndexNow` шлёт изменённые страницы.

## Bing Webmaster

https://www.bing.com/webmasters → **Import your sites from GSC** → выбрать `atlas.ehroz.pro`
(подтверждение и sitemap подтянутся). Без GSC: вкладка **Meta tag** → значение в
`SEARCH_VERIFICATION.bing`.

## Google Analytics 4 и Яндекс Метрика

Счётчики уже подключены в `src/analytics.config.ts` (`ga4: 'G-VMHW04TWE8'`, `metrika: '114501614'`) и загружаются строго после согласия пользователя в баннере cookies.

## Счётчик посещений GoatCounter (страница «Популярное»)

Считает просмотры без cookies (`goatcounter: 'atlas-ehroz'`). Из его данных собирается `/popular/`:
при каждом деплое на Vercel (`buildCommand`), а также раз в сутки через `.github/workflows/catalog-sync.yml`
скрипт `scripts/popular.mjs` забирает просмотры за 30 дней в `src/data/popular.json`.

## События: ключевые в GA4 и цели в Метрике

Сайт шлёт события с одинаковыми именами в оба счётчика (`window.atlasTrack`).

| Событие | Когда | GA4 | Метрика |
|---|---|---|---|
| `outbound_click` | переход на внешний сайт из каталога | **ключевое** | **цель** (JavaScript-событие) |
| `contact_click` | клик по почте/Telegram/GitHub на «Контактах», отправка формы «Предложить сайт» | **ключевое** | **цель** |
| `read_complete` | дочитывание статьи в блоге до конца текста | **ключевое** | **цель** |
| `newsletter_subscribe` | отправка формы подписки на рассылку | **ключевое** | **цель** |
| `pro_checkout_click` | переход к оформлению Atlas Pro | **ключевое** | **цель** |
| `sign_in` | отправка формы входа по magic-ссылке | обычное / ключевое | цель по желанию |
| `collection_create` | создание пользовательской подборки | обычное | цель по желанию |
| `bookmark_click` | добавление карточки в закладки | обычное | цель по желанию |
| `share_click` | нажатие кнопки «Поделиться» / копирование ссылки в карточке | обычное | — |
| `search` | поиск по каталогу (2+ символа) | обычное | цель по желанию |
| `filter_use` | фильтрация по тегу, цене, цвету или теме блога | обычное | — |
| `internal_click` | переход по внутренней ссылке | обычное | — |
| `scroll_depth` | прокрутка 25/50/75/90 % | обычное | — |
| `language_switch` | переключение RU/EN | обычное | — |
| `page_not_found` | открыта 404 | обычное | цель по желанию |
| `js_error` | ошибка JavaScript (до 5 на страницу) | обычное | — |

- GA4: **Администратор → События** → дождаться появления события → переключатель
  **Отметить как ключевое событие** у `outbound_click`, `contact_click`, `read_complete`, `newsletter_subscribe`, `pro_checkout_click`.
- Метрика: **Цели → Добавить цель → JavaScript-событие** → идентификатор соответствующего события.
