# Статьи по трендам: как это устроено

Нейросеть (Claude) раз в неделю собирает тренды, выбирает темы, пишет статьи
на en и ru и открывает pull request. Человек читает, дописывает свой опыт и
мерджит. Без мерджа ничего не публикуется.

> Google и Яндекс наказывают массовый контент «ради выдачи» (Google Spam
> Policies → *scaled content abuse*). Поэтому 2–3 статьи в неделю, проверка
> человеком и личный опыт автора в каждой статье. Не превращайте это в
> «50 статей в день».

## Что сделано

| Часть | Где |
|---|---|
| Раздел статей `/blog/` и `/blog/<slug>/` на обоих языках | `src/views/Blog.astro`, `src/views/Article.astro`, `src/pages/[...lang]/blog*` |
| Схема статьи (zod), обязательны обе версии | `src/content.config.ts`, `src/lib/articles.ts` |
| Ссылки `/tool/<id>/` в тексте сами получают префикс языка; ссылка на несуществующий сайт останавливает сборку | `src/lib/articles.ts` |
| Карточки сайтов под статьёй, блок «Статьи про X» на странице сайта | `Article.astro`, `Tool.astro` |
| sitemap, llms.txt, OG-обложки (со скриншотами сайтов из статьи), `BlogPosting` в JSON-LD | `routes.ts`, `schema.ts`, `og/[...slug].png.ts` |
| «Статьи» в меню и подвале (появляются, когда есть хотя бы одна статья) | `Header.astro`, `Footer.astro` |
| `check:seo`: в тексте ≥ 3 ссылки на каталог, есть `BlogPosting`; предупреждения — короткая статья и незаполненный `<!-- AUTHOR -->` | `scripts/check-seo.mjs` |
| Конвейер: тренды → темы → статьи | `scripts/articles/` |
| Еженедельный запуск с pull request | `.github/workflows/articles.yml` |
| Первая статья (написана вручную по данным каталога) | `src/content/articles/free-fonts-for-commercial-use/` |

## Конвейер

```
collect-trends → pick-topics → write-article (research → brief → draft → editor) → build + check:seo → PR
```

Рабочие файлы каждого запуска — в `content-pipeline/<дата>/` (не коммитятся):
`trends.json`, `topics.json`, `<slug>.research.md`, `<slug>.brief.json`, `report.md`.

### 1. Тренды — `scripts/articles/collect-trends.mjs`

| Источник | Что нужно | Что даёт |
|---|---|---|
| `scripts/articles/seeds.txt` | ничего, вписываете руками | запросы из Wordstat и Google Trends, идеи |
| Google Search Console | `GSC_SERVICE_ACCOUNT`, `GSC_SITE` | запросы с показами на позициях 6–30 или с CTR < 2% |
| Яндекс Вебмастер | `YANDEX_WEBMASTER_TOKEN`, `YANDEX_USER_ID`, `YANDEX_HOST_ID` | популярные запросы, показы, позиции |
| Hacker News (Show HN) | ничего | новые инструменты недели |
| GitHub | ничего (`GITHUB_TOKEN` поднимает лимит) | новые репозитории с большим числом звёзд |
| Reddit | ничего | топ недели в r/webdev, r/web_design и др. (часто отвечает 403 — не страшно) |

У Wordstat и Google Trends нет открытого API, поэтому их запросы — через `seeds.txt`.
Источник без ключей пропускается, упавший источник не останавливает остальные.

### 2. Темы — `pick-topics.mjs`

Модель группирует сигналы в кластеры (одна статья — один кластер) и ставит балл
0–11: спрос, рост, сколько сайтов каталога подходит, есть ли шанс (мы уже на 6–30).
Тема, под которую в каталоге меньше 3 сайтов, отбрасывается, а найденные новые
сервисы попадают в список «добавить в каталог» (он есть в описании PR).
Если статья по кластеру уже есть — задача «обновить» (тот же slug, новая дата `updated`).

### 3–5. Статья — `write-article.mjs`

1. **Research** — веб-поиск по главным запросам на обоих языках: что есть у всех
   в топе, чего нет ни у кого, какие вопросы задают; проверка цен и лимитов
   каждого сайта на его официальной странице.
2. **Brief** — заголовки, план H2, FAQ, проверенные факты со ссылками.
3. **Draft** — en и ru отдельно (не перевод). Упоминать сайты можно только
   ссылкой на их страницу в каталоге, утверждать — только факты из каталога и брифа.
4. **Editor** — отдельный проход «строгого редактора» по чек-листу: факты,
   первый абзац, ключ, длины, заголовки, ссылки, ИИ-штампы.
5. **Проверки скриптом** — неизвестные ссылки превращаются в текст, нужно
   ≥ 3 ссылки на каталог, длины title/description, frontmatter собирается
   скриптом (модель его не пишет).

Модель: `claude-opus-5-5` (можно поменять переменной `ARTICLES_MODEL`).
При отказе модели запрос автоматически повторяется на запасной модели.

## Как запустить

Локально (нужен `ANTHROPIC_API_KEY`):

```bash
npm run articles
```

```bash
npm run articles -- --topic "бесплатные иконки для сайта"
```

```bash
npm run build && npm run check:seo
```

В GitHub: Actions → **Articles** → Run workflow (можно указать тему).
По расписанию — каждый понедельник в 04:17 UTC.

### Настройка GitHub (один раз)

1. Settings → Secrets and variables → Actions → секрет `ANTHROPIC_API_KEY`.
2. Settings → Actions → General → включить **Allow GitHub Actions to create and approve pull requests**.
3. По желанию — доступ к Search Console: создать сервисный аккаунт в Google Cloud,
   включить Search Console API, добавить e-mail аккаунта пользователем в GSC,
   JSON-ключ положить в секрет `GSC_SERVICE_ACCOUNT`, в переменную `GSC_SITE` —
   `sc-domain:atlas.ehroz.pro`.
4. По желанию — Яндекс Вебмастер: OAuth-токен в секрет `YANDEX_WEBMASTER_TOKEN`,
   `YANDEX_USER_ID` и `YANDEX_HOST_ID` (например `https:atlas.ehroz.pro:443`) — в переменные.

## Что делать с pull request

1. Прочитать обе версии. Сверить цены и лимиты со ссылками из «Источников».
2. Заменить `<!-- AUTHOR: personal experience -->` своим опытом: 1–2 абзаца
   «пользовался — вот что важно». Это главный сигнал качества, его нейросеть не подделает.
3. Добавить `reviewedBy: ehroz` во frontmatter обеих версий.
4. Мерджить. После деплоя `indexnow.yml` сам отправит новые адреса в Яндекс и Bing.

## Формат статьи

`src/content/articles/<slug>/en.md` и `ru.md`:

```yaml
title: "…"            # H1; ≤ 60 символов, иначе в <title> не влезет бренд (максимум 70)
description: "…"      # 50–160
type: listicle        # listicle | comparison | alternatives | howto | news
primaryKeyword: "…"
secondaryKeywords: ["…"]
tools: [figma, framer, webflow]   # id из tools.json, ≥ 3, одинаковые в обоих языках
categories: [design]
published: 2026-11-23
updated: 2026-11-23   # меняйте при правке текста — это lastmod в sitemap
trendSource: "…"
sources: ["https://…"]
reviewedBy: ehroz     # ставит человек
draft: false          # true — статья не собирается
```

В тексте ссылки на каталог пишутся без языка: `[Figma](/tool/figma/)`,
`[Дизайн](/category/design/)`. Заголовки начинаются с `##`.

## Что смотреть раз в месяц

- Показы и клики `/blog/` в Search Console и Вебмастере.
- Переходы со статей на карточки и `outbound_click` (GA4 / Метрика).
- Статья без показов 90 дней — переписать под другой запрос (`--topic`) или удалить.

## Что ещё можно добавить

- Обновление старых статей по падению кликов в GSC (сейчас обновление
  запускается, когда тема из трендов совпадает с уже написанной статьёй).
- Product Hunt как источник (нужен токен их GraphQL API).
- Статьи в RSS (`src/pages/rss.xml.ts`).
