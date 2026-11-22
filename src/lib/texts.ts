/**
 * Long-form text of the support and legal pages, per language.
 * Short strings (titles, descriptions, H1, lead) live in src/i18n; the
 * bodies live here because they are paragraphs, not interface strings.
 *
 * Everything here must stay TRUE for the build it ships in: which counters
 * run comes from src/analytics.config.ts, the host from src/lib/env.ts.
 * When you change what the site stores or sends, change this file and the
 * dates in PAGE_UPDATED (src/lib/routes.ts).
 */
import { analytics } from '~/analytics.config';
import { ON_VERCEL } from '~/lib/env';
import { BACKEND } from '~/lib/backend';
import { AUTHOR, SITE, SUPABASE } from '~/site.config';
import tools from '~/data/tools.json';
import type { Lang } from '~/i18n';

/** A section: an H2 and paragraphs or a list. `**x**` is not parsed: plain text only. */
export interface Section {
  h: string;
  p?: string[];
  list?: string[];
  /** rows for a key/value table (storage keys, cookies) */
  rows?: { k: string; v: string }[];
  /** show the button that brings the cookie banner back */
  consent?: boolean;
}

const has = {
  goat: !!analytics.goatcounter,
  ga4: !!analytics.ga4,
  metrika: !!analytics.metrika,
  /** Supabase: accounts, comments, submissions, newsletter */
  backend: BACKEND.enabled,
  pro: !!(BACKEND.checkoutMonthly || BACKEND.checkoutYearly),
  /** any site in the index that links through a partner URL */
  partner: (tools as { affiliateUrl?: string }[]).some((x) => !!x.affiliateUrl),
};
const payHost = (() => {
  try { return new URL(BACKEND.checkoutMonthly || BACKEND.checkoutYearly).host.replace(/^[^.]+\.(?=[^.]+\.[^.]+$)/, ''); } catch { return ''; }
})();
const payName = /gumroad/.test(payHost) ? 'Gumroad' : /lemonsqueezy/.test(payHost) ? 'Lemon Squeezy' : payHost;
const authKey = (() => {
  try { return `sb-${new URL(SUPABASE.url).host.split('.')[0]}-auth-token`; } catch { return 'sb-…-auth-token'; }
})();
const host = ON_VERCEL ? 'Vercel' : 'GitHub Pages';
const hostPolicy = ON_VERCEL ? 'vercel.com/legal/privacy-policy' : 'docs.github.com/site-policy/privacy-policies';

/** What the site keeps in the browser. Keys are the real ones used in the code. */
function storage(lang: Lang): { k: string; v: string }[] {
  const ru = lang === 'ru';
  return [
    { k: 'atlas:saved', v: ru ? 'Сохранённые вами сайты (закладка на карточке). Пока вы их не удалите.' : 'Sites you saved with the bookmark on a card. Until you remove them.' },
    { k: 'atlas:seen', v: ru ? 'Сайты, которые вы уже открывали, — для отметки «Смотрели». Пока вы не очистите данные сайта.' : 'Sites you have opened, for the “Viewed” mark. Until you clear site data.' },
    { k: 'atlas:prefs', v: ru ? 'Ваши настройки рекомендаций (со страницы аккаунта). Пока вы их не измените.' : 'Your recommendation settings (from the account page). Until you change them.' },
    { k: 'atlas:lang', v: ru ? 'Язык, который вы выбрали вручную. Пока вы не очистите данные сайта.' : 'The language you picked by hand. Until you clear site data.' },
    { k: 'atlas:visits', v: ru ? 'Номер вашего визита: от него зависит порядок карточек на главной. Пока вы не очистите данные сайта.' : 'Your visit number; it shapes the card order on the home page. Until you clear site data.' },
    { k: 'atlas:visit', v: ru ? 'То же для текущей вкладки (sessionStorage). До закрытия вкладки.' : 'The same for the current tab (sessionStorage). Until the tab closes.' },
    ...(has.backend
      ? [{ k: authKey, v: ru ? 'Только если вы вошли в аккаунт: ключ сессии, чтобы не входить заново. До выхода из аккаунта.' : 'Only if you signed in: the session key, so you stay signed in. Until you sign out.' }]
      : []),
    ...(has.ga4 || has.metrika
      ? [{ k: 'atlas:consent', v: ru ? 'Ваш ответ на вопрос о cookies: разрешили или отказались. Пока вы его не измените.' : 'Your answer to the cookie question: allowed or declined. Until you change it.' }]
      : []),
  ];
}

export function privacy(lang: Lang): Section[] {
  const ru = lang === 'ru';
  const counters = [has.ga4 && 'Google Analytics', has.metrika && (ru ? 'Яндекс Метрика' : 'Yandex Metrica')].filter(Boolean).join(ru ? ' и ' : ' and ');
  if (ru) {
    return [
      {
        h: 'Кто отвечает за сайт',
        p: [
          `${SITE.name} (${SITE.host}) ведёт один человек — ${AUTHOR.name}, ${AUTHOR.city.ru}. По любым вопросам о данных пишите на ${AUTHOR.email}.`,
          has.backend
            ? 'Пользоваться каталогом можно без регистрации. Аккаунт нужен только для подборок в облаке, комментариев, рассылки и Pro.'
            : 'На сайте нет регистрации, аккаунтов и комментариев. Мы не просим у вас имя, почту или телефон, чтобы пользоваться каталогом.',
        ],
      },
      {
        h: 'Что видит хостинг',
        p: [`Сайт размещён на ${host}. Как любой веб-сервер, он записывает технические журналы: IP-адрес, браузер, адрес страницы и время запроса. Эти журналы ведёт ${host} по своим правилам (${hostPolicy}); у нас к ним доступа нет.`],
      },
      ...(has.backend
        ? [
            {
              h: 'Аккаунт',
              p: [
                'Войти можно через Google или по ссылке из письма, без пароля. Аккаунты, подборки и комментарии хранятся в Supabase (база данных в облаке); письма для входа и рассылки уходят через почтовый сервис, подключённый к Supabase.',
                'В аккаунте хранятся: почта, язык, настройки рекомендаций, подписка на рассылку, тариф (бесплатный или Pro), ваши подборки и имя, которое вы показываете под комментариями. При входе через Google он передаёт почту, имя и фото профиля; сайт использует только почту.',
              ],
            },
            {
              h: 'Комментарии',
              p: ['К комментарию сохраняются текст, имя автора и IP-адрес. IP нужен только чтобы бороться со спамом; публично он не показывается. Комментарии проходят модерацию.'],
            },
            {
              h: 'Рассылка',
              p: ['Письмо раз в месяц приходит, только если вы сами включили рассылку в аккаунте. В каждом письме есть ссылка, чтобы отписаться в один клик.'],
            },
          ]
        : []),
      ...(has.pro
        ? [{ h: `${SITE.name} Pro`, p: [`Оплату принимает ${payName}: данные карты вводятся у них, мы их не видим. Нам приходит только идентификатор покупателя и срок подписки, чтобы включить Pro в вашем аккаунте.`] }]
        : []),
      {
        h: 'Форма «Предложить сайт»',
        p: has.backend
          ? [
              'Заявка сохраняется в базе: ссылка, название, категория, ваш текст, фотографии, если вы их приложили, почта, если вы её указали, и IP-адрес (для защиты от спама). Если вы вошли, заявка связывается с аккаунтом.',
              'Заявки читает только автор каталога. Попросите — удалим.',
            ]
          : [
              'Форма ничего не отправляет на наш сервер. Она собирает текст письма и открывает ваше почтовое приложение, Telegram или WhatsApp — отправляете вы сами, и сообщение идёт через выбранный сервис по его правилам.',
              'Полученные письма и сообщения мы храним, чтобы ответить и проверить предложенный сайт. Попросите — удалим переписку.',
            ],
      },
      {
        h: 'Счётчики посещений',
        p: [
          ...(has.goat ? ['GoatCounter считает просмотры страниц (по ним собрана страница «Популярное»). Он не ставит cookies и не хранит IP-адреса. Ему уходят адрес и заголовок страницы, адрес, с которого вы пришли, размер экрана, а также браузер, система и страна, которые он определяет по запросу.'] : []),
          counters
            ? `${counters} загружаются только после того, как вы нажмёте «Разрешить» в плашке внизу экрана. Они ставят cookies и собирают данные о посещении по своим правилам. Если вы отказались, ничего не загружается. Передумать можно в любой момент: кнопка «Настройки cookies» на странице «Cookies».`
            : 'Google Analytics и Яндекс Метрика сейчас не подключены.',
          ...(ON_VERCEL ? ['Vercel Web Analytics считает просмотры без cookies и без сохранения IP-адресов.'] : []),
        ],
      },
      {
        h: 'Что хранится в вашем браузере',
        p: ['Несколько настроек сайт держит в localStorage вашего браузера. Они никуда не отправляются, кроме ключа сессии, когда вы входите в аккаунт. Удалить их можно, очистив данные сайта в браузере.'],
        rows: storage('ru'),
      },
      {
        h: 'Ссылки на другие сайты',
        p: [
          `К обычным внешним ссылкам из каталога добавляется только метка ?ref=${SITE.ref}, чтобы сайт знал, откуда пришёл посетитель.${has.partner ? ' Партнёрские ссылки помечены; по ним сайт может заплатить нам комиссию.' : ''} После перехода действуют правила того сайта.`,
        ],
      },
      {
        h: 'Ваши права',
        p: [`Вы можете спросить, какие данные о вас у нас есть, исправить их или попросить удалить${has.backend ? ' — вместе с аккаунтом, подборками и комментариями' : ''}. Пишите на ${AUTHOR.email} или в Telegram ${AUTHOR.telegram.handle}.`],
      },
    ];
  }
  return [
    {
      h: 'Who runs the site',
      p: [
        `${SITE.name} (${SITE.host}) is run by one person, ${AUTHOR.name}, in ${AUTHOR.city.en}. For anything about your data, write to ${AUTHOR.email}.`,
        has.backend
          ? 'You can use the index without signing up. An account is only needed for cloud collections, comments, the newsletter and Pro.'
          : 'There are no sign-ups, accounts or comments here. We never ask for your name, email or phone to use the index.',
      ],
    },
    {
      h: 'What the host sees',
      p: [`The site is hosted on ${host}. Like any web server it keeps technical logs: IP address, browser, page and time of the request. ${host} keeps these logs under its own policy (${hostPolicy}); we have no access to them.`],
    },
    ...(has.backend
      ? [
          {
            h: 'Your account',
            p: [
              'You sign in with Google or with a link sent to your email, no password. Accounts, collections and comments are stored in Supabase (a cloud database); sign-in and newsletter emails go through the mail service connected to Supabase.',
              'An account holds: your email, language, recommendation settings, newsletter choice, plan (free or Pro), your collections and the name you show under comments. With Google sign-in, Google passes your email, name and profile photo; the site uses only the email.',
            ],
          },
          {
            h: 'Comments',
            p: ['With a comment we store its text, the author name and the IP address. The IP is only used to fight spam and is never shown. Comments are moderated.'],
          },
          {
            h: 'Newsletter',
            p: ['The monthly email comes only if you switch it on in your account. Every email has a one-click unsubscribe link.'],
          },
        ]
      : []),
    ...(has.pro
      ? [{ h: `${SITE.name} Pro`, p: [`Payments are handled by ${payName}: you enter card details with them and we never see them. We receive only a customer ID and the subscription period, to switch Pro on in your account.`] }]
      : []),
    {
      h: 'The “Submit a site” form',
      p: has.backend
        ? [
            'A submission is stored in the database: the link, name, category, your text, photos if you attach any, your email if you give it, and the IP address (against spam). If you are signed in, it is linked to your account.',
            'Only the curator reads submissions. Ask and we’ll delete yours.',
          ]
        : [
            'The form sends nothing to our server. It writes the message and opens your mail app, Telegram or WhatsApp; you send it yourself, and it travels through that service under its rules.',
            'We keep the emails and messages we receive so we can reply and review the site. Ask and we’ll delete the conversation.',
          ],
    },
    {
      h: 'Visit counters',
      p: [
        ...(has.goat ? ['GoatCounter counts page views (the Popular page is built from them). It sets no cookies and does not store IP addresses. It receives the page address and title, the page you came from, your screen size, and the browser, system and country it reads from the request.'] : []),
        counters
          ? `${counters} load only after you press “Allow” in the banner at the bottom of the screen. They set cookies and collect visit data under their own policies. If you decline, nothing loads. You can change your mind any time with the “Cookie settings” button on the Cookies page.`
          : 'Google Analytics and Yandex Metrica are not connected right now.',
        ...(ON_VERCEL ? ['Vercel Web Analytics counts page views with no cookies and without storing IP addresses.'] : []),
      ],
    },
    {
      h: 'What stays in your browser',
      p: ['The site keeps a few settings in your browser’s localStorage. Nothing there is sent anywhere, except the session key when you sign in. Clear the site’s data in your browser to remove them.'],
      rows: storage('en'),
    },
    {
      h: 'Links to other sites',
      p: [
        `Regular outbound links from the index carry only a ?ref=${SITE.ref} tag, so the site knows where the visitor came from.${has.partner ? ' Partner links are labelled; the site may pay us a commission for them.' : ''} Once you leave, that site’s policy applies.`,
      ],
    },
    {
      h: 'Your rights',
      p: [`You can ask what data we have about you, correct it or ask us to delete it${has.backend ? ', together with your account, collections and comments' : ''}. Write to ${AUTHOR.email} or on Telegram ${AUTHOR.telegram.handle}.`],
    },
  ];
}

export function cookies(lang: Lang): Section[] {
  const counters = has.ga4 || has.metrika;
  if (lang === 'ru') {
    return [
      {
        h: 'Коротко',
        p: [
          counters
            ? 'Сам сайт cookies не ставит. Cookies появляются, только если вы разрешите Google Analytics или Яндекс Метрику в плашке внизу экрана.'
            : 'Сайт не ставит cookies. Сторонние счётчики, которые могли бы их ставить, сейчас не подключены.',
        ],
      },
      {
        h: 'localStorage вместо cookies',
        p: ['Чтобы помнить ваши закладки и язык, сайт пользуется localStorage — хранилищем в вашем браузере. В отличие от cookies, оно не уходит на сервер с каждым запросом. Вот всё, что там лежит:'],
        rows: storage('ru'),
      },
      ...(has.goat
        ? [{ h: 'Счётчик посещений', p: ['GoatCounter считает посещения без cookies и без localStorage. Подробнее — в политике конфиденциальности.'] }]
        : []),
      ...(counters
        ? [
            {
              h: 'Cookies счётчиков',
              p: ['Только после вашего согласия:'],
              list: [
                ...(has.ga4 ? ['Google Analytics: _ga, _ga_<ID> — различают посетителей, до 2 лет.'] : []),
                ...(has.metrika ? ['Яндекс Метрика: _ym_uid, _ym_d, _ym_isad, _ym_visorc — различают посетителей и визиты, до 1 года.'] : []),
              ],
            },
            { h: 'Как отозвать согласие', p: ['Нажмите «Настройки cookies» ниже — плашка появится снова. Можно также удалить cookies сайта в настройках браузера.'], consent: true },
          ]
        : []),
      { h: 'Как всё удалить', p: ['В браузере откройте настройки сайта (значок замка в адресной строке) → «Удалить данные». Закладки и отметки «Смотрели» при этом пропадут.'] },
    ];
  }
  return [
    {
      h: 'In short',
      p: [
        counters
          ? 'The site itself sets no cookies. Cookies appear only if you allow Google Analytics or Yandex Metrica in the banner at the bottom of the screen.'
          : 'The site sets no cookies. Third-party counters that could set them are not connected right now.',
      ],
    },
    {
      h: 'localStorage instead of cookies',
      p: ['To remember your bookmarks and language, the site uses localStorage, a store inside your browser. Unlike cookies, it is not sent to a server with every request. Here is everything in it:'],
      rows: storage('en'),
    },
    ...(has.goat
      ? [{ h: 'Visit counter', p: ['GoatCounter counts visits with no cookies and no localStorage. More in the privacy policy.'] }]
      : []),
    ...(counters
      ? [
          {
            h: 'Counter cookies',
            p: ['Only after you agree:'],
            list: [
              ...(has.ga4 ? ['Google Analytics: _ga, _ga_<ID> tell visitors apart, up to 2 years.'] : []),
              ...(has.metrika ? ['Yandex Metrica: _ym_uid, _ym_d, _ym_isad, _ym_visorc tell visitors and visits apart, up to 1 year.'] : []),
            ],
          },
          { h: 'Withdrawing consent', p: ['Press “Cookie settings” below and the banner comes back. You can also delete the site’s cookies in your browser settings.'], consent: true },
        ]
      : []),
    { h: 'Removing everything', p: ['In your browser, open the site settings (the lock icon in the address bar) → “Clear data”. Your bookmarks and “Viewed” marks go with it.'] },
  ];
}

export function disclaimer(lang: Lang): Section[] {
  if (lang === 'ru') {
    return [
      {
        h: 'Каталог — это подборка, а не гарантия',
        p: [
          `${SITE.name} — список сайтов, которые нам показались полезными. Описания, цены и платформы верны на дату, указанную на странице сайта, но сервисы меняются: проверяйте условия у самого сервиса, прежде чем платить или загружать туда свои файлы.`,
          'Информация на сайте дана «как есть». Мы не отвечаем за работу, доступность, безопасность и содержимое чужих сайтов и за то, как вы ими пользуетесь.',
        ],
      },
      {
        h: 'Мы не связаны с сайтами из каталога',
        p: [
          has.partner
            ? 'Ни один сайт не платил за место в списке. У некоторых сайтов кнопка ведёт по партнёрской ссылке: она помечена, и сайт может заплатить нам комиссию. На то, попадёт ли сайт в каталог и где он окажется, это не влияет.'
            : 'Ни один сайт не платил за место в списке, и партнёрских ссылок сейчас нет. К внешним ссылкам добавляется только метка ref, и денег она не приносит.',
          'Названия, логотипы и товарные знаки принадлежат их владельцам. Скриншоты главных страниц показаны только для того, чтобы сайт можно было узнать.',
        ],
      },
      {
        h: 'Это не профессиональный совет',
        p: ['Тексты на сайте — личное мнение составителя. Это не юридическая, финансовая или иная профессиональная консультация.'],
      },
      {
        h: 'Если вы владелец сайта',
        p: [`Нашли ошибку в описании, хотите заменить скриншот или убрать сайт из каталога — напишите на ${AUTHOR.email}. Поправим или уберём.`],
      },
    ];
  }
  return [
    {
      h: 'A selection, not a guarantee',
      p: [
        `${SITE.name} is a list of sites we found useful. Descriptions, prices and platforms are correct as of the date shown on each site’s page, but services change: check the terms with the service itself before you pay or upload your files.`,
        'Everything here is provided “as is”. We are not responsible for how other sites work, whether they are available or safe, what they contain, or how you use them.',
      ],
    },
    {
      h: 'We are not affiliated with the listed sites',
      p: [
        has.partner
          ? 'No site paid to be listed. For some sites the button uses a partner link: it is labelled, and the site may pay us a commission. It never decides whether or where a site is listed.'
          : 'No site paid to be listed and there are no partner links right now. Outbound links carry only a ref tag, and it earns nothing.',
        'Names, logos and trademarks belong to their owners. Home-page screenshots are shown only so you can recognise the site.',
      ],
    },
    {
      h: 'Not professional advice',
      p: ['The texts here are the curator’s own opinion, not legal, financial or other professional advice.'],
    },
    {
      h: 'If you own a listed site',
      p: [`Found a mistake in the description, want a new screenshot or the site removed? Write to ${AUTHOR.email} and we’ll fix or remove it.`],
    },
  ];
}

export interface Faq { q: string; a: string }

export function supportFaq(lang: Lang): Faq[] {
  if (lang === 'ru') {
    return [
      { q: 'Как найти сайт?', a: 'Нажмите на поиск в верхней панели или клавишу /. Пишите задачу своими словами («убрать фон», «шрифт с кириллицей») или выберите категорию, цену и платформу в фильтрах.' },
      { q: 'Как сохранить сайт?', a: `Нажмите на закладку на карточке. Сохранённые сайты встают в начало сетки, а кнопка с закладкой в панели показывает только их. Они хранятся в этом браузере.${has.backend ? ' Чтобы видеть их на других устройствах, войдите и соберите подборку.' : ''}` },
      { q: 'Что значит «Смотрели»?', a: 'Вы уже открывали страницу этого сайта в этом браузере. Отметку видите только вы.' },
      { q: 'Как предложить сайт?', a: 'Через форму «Предложить сайт»: ссылка, название и пара слов о том, чем он хорош. Каждым сайтом сначала пользуемся сами, поэтому добавление занимает время.' },
      { q: 'Ссылка не открывается или описание устарело', a: `Напишите на ${AUTHOR.email} или в Telegram ${AUTHOR.telegram.handle}: какой сайт и что не так. Поправим.` },
      { q: 'Я владелец сайта и хочу его убрать', a: `Напишите на ${AUTHOR.email}, какой это сайт, — уберём.` },
      { q: 'Это платно?', a: has.pro ? `Каталог бесплатный и без регистрации, места в списке не продаются. ${SITE.name} Pro — добровольная подписка: безлимитные и личные подборки и поддержка проекта.` : 'Нет. Регистрации нет, всё бесплатно, места в списке не продаются.' },
    ];
  }
  return [
    { q: 'How do I find a site?', a: 'Click the search in the top bar or press /. Describe the job in your own words (“remove background”, “Cyrillic font”) or pick a category, price and platform in the filters.' },
    { q: 'How do I save a site?', a: `Tap the bookmark on its card. Saved sites move to the front of the grid, and the bookmark button in the bar shows only them. They live in this browser.${has.backend ? ' To have them on other devices, sign in and make a collection.' : ''}` },
    { q: 'What does “Viewed” mean?', a: 'You have opened that site’s page in this browser before. Only you see the mark.' },
    { q: 'How do I suggest a site?', a: 'Use the “Submit a site” form: the link, the name and a few words on why it’s good. We use every site for a while first, so adding one takes time.' },
    { q: 'A link is broken or a description is out of date', a: `Write to ${AUTHOR.email} or on Telegram ${AUTHOR.telegram.handle}: which site and what’s wrong. We’ll fix it.` },
    { q: 'I own a listed site and want it removed', a: `Write to ${AUTHOR.email} and say which site, and we’ll remove it.` },
    { q: 'Does it cost anything?', a: has.pro ? `The index is free with no sign-up, and places on the list aren’t for sale. ${SITE.name} Pro is an optional subscription: unlimited and private collections, and support for the project.` : 'No. There’s no sign-up, everything is free, and places on the list aren’t for sale.' },
  ];
}
