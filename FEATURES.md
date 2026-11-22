# Аккаунты, подборки, рассылка, Pro, API — как это устроено и как включить

Сайт остаётся статичным (GitHub Pages). Всё, чему нужен сервер, вынесено в бесплатные сервисы
и **включается само**, когда в сборку переданы их ключи. Пока ключей нет — эти части скрыты
или показывают «скоро», остальной сайт работает как раньше.

| # | Функция | Чем сделано | Цена |
|---|---|---|---|
| 1 | Вход через Google | Supabase Auth (Google OAuth) | бесплатно |
| 2 | Регистрация по почте | Supabase Auth, вход по ссылке из письма (без пароля) + SMTP Resend | бесплатно |
| 3 | Настройка рекомендаций | `localStorage` + профиль в Supabase | бесплатно |
| 4 | Количество пользователей | `public_stats()` (участники) + Supabase Realtime Presence (сейчас на сайте) | бесплатно |
| 5 | Заметки автора | поле `note` в `tools.json` | бесплатно |
| 6 | Рассылка «5 находок» раз в месяц | GitHub Actions (1-го числа) + Resend | бесплатно до 3000 писем/мес |
| 7 | Своя подборка для друга | ссылка без сервера (`#…`) или сохранение в аккаунт | бесплатно |
| 8 | Продажа подписки | Lemon Squeezy + вебхук в Supabase Edge Function | без абонплаты, 5% + 50¢ с платежа |
| 9 | API | статичные JSON `/api/v1/…`, документация на `/api/` | бесплатно |
| 10 | Партнёрские ссылки | поле `affiliateUrl` в `tools.json`, пометка на карточке и странице | бесплатно |

Ограничения бесплатных тарифов (проверьте актуальные на сайтах сервисов):
- **Supabase Free**: 50 000 активных пользователей в месяц, база 500 МБ, 200 одновременных
  подключений Realtime (счётчик «онлайн» перестанет расти выше этого — сайт не ломается).
  **Проект засыпает после 7 дней без запросов** — на живом сайте с посетителями это не случится;
  если всё же уснул, «разбудить» можно в панели Supabase.
- **Resend Free**: 3000 писем в месяц и 100 в день. Если подписчиков станет больше 100 —
  перейти на платный тариф или на Brevo (300/день бесплатно, нужно поменять `sendBatch` в скрипте).
- **Lemon Squeezy**: работает как «продавец» (Merchant of Record) — сам считает и платит налоги
  с продаж в разных странах. Выплаты — на банковский счёт в поддерживаемых странах или через PayPal.
  **Проверьте Казахстан** в списке:
  https://docs.lemonsqueezy.com/help/getting-started/supported-countries.
  Если не подходит — замените ссылки оплаты на Paddle / Gumroad / Boosty / Tribute: страница
  `/pro/` просто открывает ссылку из `PUBLIC_CHECKOUT_*`, а вебхук нужно будет адаптировать.

---

## Шаг 1. Supabase (аккаунты, подборки, рассылка, счётчик)

1. Зарегистрируйтесь на https://supabase.com → **New project** (регион — ближайший, например Frankfurt).
2. **SQL Editor** → вставьте весь файл [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. **Project Settings → API**: скопируйте `Project URL` и ключ `anon public`.
4. **Authentication → URL Configuration**:
   - Site URL: `https://atlas.ehroz.pro`
   - Redirect URLs: `https://atlas.ehroz.pro/**` и для локальной разработки `http://localhost:4321/**`
5. **Authentication → Sign In / Providers → Email**: включено. «Confirm email» — включено.

### Вход через Google
1. https://console.cloud.google.com → создайте проект → **APIs & Services → OAuth consent screen**:
   тип External, название Atlas, ваш email, домен `ehroz.pro`. Опубликуйте (Publish app).
2. **Credentials → Create credentials → OAuth client ID** → Web application.
   - Authorized redirect URI: `https://<ваш-проект>.supabase.co/auth/v1/callback`
     (точный адрес показан в Supabase → Authentication → Providers → Google).
3. Client ID и Client Secret вставьте в Supabase → Authentication → Providers → **Google** → Enable.

### Письма для входа (обязательно)
Встроенная почта Supabase отправляет письма только участникам вашей команды в Supabase,
поэтому подключите свой SMTP — бесплатно через Resend:
1. https://resend.com → добавьте домен `ehroz.pro` (DNS-записи у регистратора) → дождитесь Verified.
2. Создайте API-ключ.
3. Supabase → **Authentication → Emails → SMTP Settings**: host `smtp.resend.com`, port `465`,
   user `resend`, password = API-ключ, sender `Atlas <hello@ehroz.pro>`.
4. По желанию переведите шаблон письма (Authentication → Emails → Templates → Magic Link).

## Шаг 2. Ключи в сборку

GitHub → репозиторий → **Settings → Secrets and variables → Actions → вкладка Variables**
(именно *Variables*, это публичные значения):

| Имя | Значение |
|---|---|
| `PUBLIC_SUPABASE_URL` | `https://<проект>.supabase.co` |
| `PUBLIC_SUPABASE_ANON_KEY` | ключ `anon public` |
| `PUBLIC_CHECKOUT_MONTHLY` | ссылка оплаты на месяц (шаг 3) |
| `PUBLIC_CHECKOUT_YEARLY` | ссылка оплаты на год (шаг 3) |
| `PUBLIC_BILLING_PORTAL` | `https://<магазин>.lemonsqueezy.com/billing` |

Потом **Actions → Deploy to GitHub Pages → Run workflow**. Локально — те же строки в `.env`
(образец: [`.env.example`](.env.example)).

`anon`-ключ можно светить: что им можно делать, ограничено правилами RLS в `schema.sql`.
**Никогда** не кладите в эти переменные `service_role`-ключ.

## Шаг 3. Продажа подписки (Lemon Squeezy)

1. https://lemonsqueezy.com → создайте магазин, пройдите проверку (identity verification).
2. **Products → New product** «Atlas Pro», тип Subscription, два варианта: $3/месяц и $24/год
   (цены на странице `/pro/` меняются в `src/site.config.ts` → `PRO`).
3. У каждого варианта **Share → Checkout link** → это `PUBLIC_CHECKOUT_MONTHLY` / `PUBLIC_CHECKOUT_YEARLY`.
4. Вебхук — включает Pro после оплаты и выключает после отмены:
   ```bash
   npx supabase login
   ```
   ```bash
   npx supabase link --project-ref <проект>
   ```
   ```bash
   npx supabase secrets set LEMONSQUEEZY_WEBHOOK_SECRET=<придумайте длинную строку>
   ```
   ```bash
   npx supabase functions deploy payments-webhook --no-verify-jwt
   ```
   В Lemon Squeezy → **Settings → Webhooks → +**: URL
   `https://<проект>.supabase.co/functions/v1/payments-webhook`, тот же секрет,
   события `subscription_created`, `subscription_updated`, `subscription_cancelled`,
   `subscription_resumed`, `subscription_expired`, `subscription_payment_success`.
5. Проверка: включите Test mode в Lemon Squeezy, войдите на сайт, купите тестовой картой
   `4242 4242 4242 4242` — в аккаунте должно появиться «Pro».

Что даёт Pro (поменять можно в `schema.sql` → `collections_limits` и в текстах `pro.*`):
безлимитные и личные подборки в аккаунте и отметка «Поддерживает проект». Сам каталог остаётся
бесплатным для всех.

## Шаг 4. Рассылка раз в месяц

GitHub → **Settings → Secrets and variables → Actions → Secrets** (секретные!):

| Имя | Значение |
|---|---|
| `SUPABASE_URL` | `https://<проект>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` |
| `RESEND_API_KEY` | ключ Resend |
| `NEWSLETTER_FROM` | `Atlas <hello@ehroz.pro>` |

- Письмо уходит **1-го числа каждого месяца** (`.github/workflows/newsletter.yml`).
- Сначала отправьте тест себе: Actions → Newsletter → Run workflow → поле *test_to*.
- Посмотреть письмо без отправки: `node scripts/newsletter.mjs` → файлы в `newsletter-preview/`.
- **Какие пять сайтов**: по умолчанию — добавленные за прошлый месяц (сначала с вашей заметкой,
  потом featured, потом новые). Чтобы выбрать самому, впишите в `src/data/newsletter.json`:
  ```json
  { "2026-12": ["figma", "linear", "excalidraw", "cobalt", "regex101"] }
  ```
  Ключ — месяц отправки. Превью следующего выпуска видно на `/newsletter/`.
- Подписка = вход по ссылке из письма (это и есть подтверждение адреса). Отписка — ссылка
  в каждом письме, работает в один клик и без входа.

## Как пользоваться

### Заметки автора (5)
В `src/data/tools.json` у сайта:
```json
"note": { "en": "I start every layout here.", "ru": "С него начинаю каждый макет." }
```
Показывается курсивом на карточке, цитатой на странице сайта, в письме рассылки и в API.
Сайты с заметкой первыми попадают в рассылку.

### Партнёрские ссылки (10)
```json
"affiliateUrl": "https://partner.example.com/?ref=atlas"
```
Кнопка «Открыть …» ведёт на партнёрскую ссылку с `rel="sponsored"` (так требует Google),
на карточке появляется метка «Партнёр», на странице — пояснение. Метка `?ref=` к партнёрским
ссылкам не добавляется. Тексты на странице «О проекте» обновлены: «Партнёрские ссылки всегда помечены».

### Рекомендации (3)
`/account/#prefs` — категории, цена, «убирать просмотренные в конец». Работает и без входа.
Главная сортирует карточки до отрисовки, над сеткой появляется «Отсортировано для вас · Изменить».

### Подборки (7)
`/collection/` — отметить сайты (сохранённые закладкой уже отмечены), название, пара слов →
«Получить ссылку» → скопировать / Telegram / WhatsApp. Такая ссылка хранит всё в себе и не требует
ни аккаунта, ни сервера. «Сохранить в аккаунт» даёт короткую ссылку `?c=…`, которую можно изменить.

### Счётчик (4)
В подвале: «Участников: N · Сейчас на сайте: M». Никаких персональных данных: число аккаунтов
и случайный ключ на вкладку.

### API (9)
`/api/v1/index.json`, `/api/v1/tools.json`, `/api/v1/tools/<id>.json`, `/api/v1/categories.json`.
Обновляется при каждой сборке, CORS открыт (GitHub Pages сам отдаёт `Access-Control-Allow-Origin: *`).
Документация: `/api/`.

## Файлы

```
supabase/schema.sql                         таблицы, права (RLS), триггеры, RPC
supabase/functions/payments-webhook/        Lemon Squeezy → plan = pro/free
src/lib/backend.ts                          какие сервисы включены (на этапе сборки)
src/scripts/backend.ts                      клиент Supabase, профиль, рекомендации
src/scripts/site.ts                         счётчик в подвале, отметка входа в шапке
src/views/Account|Collection|Newsletter|Pro|Api.astro
src/lib/picks.mjs                           правило «пяти находок» (страница и письмо)
src/lib/api.ts, src/pages/api/v1/           JSON API
scripts/newsletter.mjs, .github/workflows/newsletter.yml
```
