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

## Переезд на Vercel (когда решите)

1. vercel.com → **Add New… → Project** → импортировать `ehroz1/atlas.ehroz.pro`.
   Framework определится как Astro, настройки берутся из `vercel.json`. Переменные окружения не нужны.
2. Project → **Settings → Domains** → добавить `atlas.ehroz.pro` и `www.atlas.ehroz.pro`
   (www — с редиректом на основной).
3. У регистратора поменять DNS: `atlas` → `CNAME cname.vercel-dns.com` (Vercel покажет точное значение).
   **Это смена DNS — делаете вы.**
4. Project → **Analytics → Enable** (Web Analytics).
5. Settings → Git → включить уведомления; аккаунт → **Settings → Notifications** →
   отметить **Deployment Failed** (почта/приложение).
6. Firewall → **Attack Challenge Mode** включать только во время атаки, не держать постоянно:
   он закрывает сайт от поисковых роботов.
7. После переезда выключить `deploy.yml` (Actions → Deploy to GitHub Pages → ⋯ → Disable workflow)
   и Settings → Pages → Source: None.

## Google Search Console

1. https://search.google.com/search-console → **Добавить ресурс** → тип **Доменный ресурс** →
   `ehroz.pro` (покрывает и `atlas.ehroz.pro`). Подтверждение — TXT-запись в DNS
   (если ресурс `ehroz.pro` уже подтверждён для основного сайта, ничего делать не нужно).
   Альтернатива без DNS: ресурс **С префиксом в URL** `https://atlas.ehroz.pro/` →
   способ **HTML-тег** → значение `content` вписать в `SEARCH_VERIFICATION.google`
   в `src/analytics.config.ts` → задеплоить → **Подтвердить**.
2. Слева **Файлы Sitemap** → вписать **полный адрес** `https://atlas.ehroz.pro/sitemap-index.xml` → **Отправить**.
3. **Проверка URL** → главная → **Запросить индексирование**.

## Яндекс Вебмастер

1. https://webmaster.yandex.ru → **Добавить сайт** → `https://atlas.ehroz.pro/`.
2. Вкладка **«Метатег»** → скопировать значение `content` → вписать в
   `SEARCH_VERIFICATION.yandex` в `src/analytics.config.ts` → задеплоить → **Проверить**.
3. **Индексирование → Файлы Sitemap** → `https://atlas.ehroz.pro/sitemap-index.xml` → **Добавить**.
4. **Индексирование → Переобход страниц** → главная и `/en/`.
5. **Настройки → Привязка к Метрике** → выбрать счётчик (после создания Метрики).
6. IndexNow уже настроен: ключ лежит в `public/<ключ>.txt`, workflow `IndexNow` шлёт изменённые страницы.

## Bing Webmaster

https://www.bing.com/webmasters → **Import your sites from GSC** → выбрать `atlas.ehroz.pro`
(подтверждение и sitemap подтянутся). Без GSC: вкладка **Meta tag** → значение в
`SEARCH_VERIFICATION.bing`.

## Google Analytics 4

1. https://analytics.google.com → **Администратор → Создать → Ресурс** → название `Atlas`,
   часовой пояс, валюта → **Далее** → бизнес-данные → **Создать**.
2. **Сбор данных → Веб** → URL `https://atlas.ehroz.pro`, имя потока `atlas` → **Создать поток**.
3. Скопировать **Идентификатор потока данных** `G-XXXXXXXXXX` → `analytics.ga4` в `src/analytics.config.ts`.
4. Задеплоить. Появится плашка согласия; счётчик грузится только после «Разрешить».

## Яндекс Метрика

1. https://metrika.yandex.ru → **Добавить счётчик** → адрес `atlas.ehroz.pro`,
   принять условия → **Создать счётчик**. Вебвизор можно не включать
   (он управляется флажком `analytics.webvisor`).
2. Номер счётчика → `analytics.metrika` в `src/analytics.config.ts`.
   Стандартный код в `<head>` **не вставлять**: Метрика грузится из скрипта согласия.

## События: ключевые в GA4 и цели в Метрике

Сайт шлёт события с одинаковыми именами в оба счётчика (`window.atlasTrack`).

| Событие | Когда | GA4 | Метрика |
|---|---|---|---|
| `outbound_click` | переход на внешний сайт из каталога | **ключевое** | **цель** (JavaScript-событие) |
| `contact_click` | клик по почте/Telegram/GitHub на «Контактах», отправка формы «Предложить сайт» | **ключевое** | **цель** |
| `search` | поиск по каталогу (2+ символа) | обычное | цель по желанию |
| `internal_click` | переход по внутренней ссылке | обычное | — |
| `scroll_depth` | прокрутка 25/50/75/90 % | обычное | — |
| `language_switch` | переключение RU/EN | обычное | — |
| `page_not_found` | открыта 404 | обычное | цель по желанию |
| `js_error` | ошибка JavaScript (до 5 на страницу) | обычное | — |

- GA4: **Администратор → События** → дождаться появления события → переключатель
  **Отметить как ключевое событие** у `outbound_click` и `contact_click`.
- Метрика: **Цели → Добавить цель → JavaScript-событие** → идентификатор `outbound_click`;
  то же для `contact_click`.

`download_click`, `open_app_click`, `order_click` и `read_complete` не используются: на сайте
нет загрузок, приложений, заказов и статей.
