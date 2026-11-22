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
import { AUTHOR, SITE } from '~/site.config';
import type { Lang } from '~/i18n';

/** A section: an H2 and paragraphs or a list. `**x**` is not parsed: plain text only. */
export interface Section {
  h: string;
  p?: string[];
  list?: string[];
  /** rows for a key/value table (storage keys, cookies) */
  rows?: { k: string; v: string }[];
}

const has = {
  goat: !!analytics.goatcounter,
  ga4: !!analytics.ga4,
  metrika: !!analytics.metrika,
};
const host = ON_VERCEL ? 'Vercel' : 'GitHub Pages';
const hostPolicy = ON_VERCEL ? 'vercel.com/legal/privacy-policy' : 'docs.github.com/site-policy/privacy-policies';

/** What the site keeps in the browser. Keys are the real ones used in the code. */
function storage(lang: Lang): { k: string; v: string }[] {
  const ru = lang === 'ru';
  return [
    { k: 'atlas:saved', v: ru ? 'Сохранённые вами сайты (закладка на карточке). Пока вы их не удалите.' : 'Sites you saved with the bookmark on a card. Until you remove them.' },
    { k: 'atlas:seen', v: ru ? 'Сайты, которые вы уже открывали, — для отметки «Смотрели». Пока вы не очистите данные сайта.' : 'Sites you have opened, for the “Viewed” mark. Until you clear site data.' },
    { k: 'atlas:lang', v: ru ? 'Язык, который вы выбрали вручную. Пока вы не очистите данные сайта.' : 'The language you picked by hand. Until you clear site data.' },
    { k: 'atlas:visits', v: ru ? 'Номер вашего визита: от него зависит порядок карточек на главной. Пока вы не очистите данные сайта.' : 'Your visit number; it shapes the card order on the home page. Until you clear site data.' },
    { k: 'atlas:visit', v: ru ? 'То же для текущей вкладки (sessionStorage). До закрытия вкладки.' : 'The same for the current tab (sessionStorage). Until the tab closes.' },
    ...(has.ga4 || has.metrika
      ? [{ k: 'atlas:consent', v: ru ? 'Ваш ответ на вопрос о cookies: разрешили или отказались. Пока вы его не измените.' : 'Your answer to the cookie question: allowed or declined. Until you change it.' }]
      : []),
  ];
}

export function privacy(lang: Lang): Section[] {
  if (lang === 'ru') {
    return [
      {
        h: 'Кто отвечает за сайт',
        p: [
          `${SITE.name} (${SITE.host}) ведёт один человек — ${AUTHOR.name}, ${AUTHOR.city.ru}. По любым вопросам о данных пишите на ${AUTHOR.email}.`,
          'На сайте нет регистрации, аккаунтов, комментариев и оплаты. Мы не просим у вас имя, почту или телефон, чтобы пользоваться каталогом.',
        ],
      },
      {
        h: 'Что видит хостинг',
        p: [
          `Сайт размещён на ${host}. Как любой веб-сервер, он записывает технические журналы: IP-адрес, браузер, адрес страницы и время запроса. Эти журналы ведёт ${host} по своим правилам (${hostPolicy}); у нас к ним доступа нет.`,
        ],
      },
      {
        h: 'Счётчик посещений',
        p: has.goat
          ? [
              'Чтобы знать, какие страницы открывают чаще (по этим данным собрана страница «Популярное»), мы используем GoatCounter. Он не ставит cookies и не хранит IP-адреса.',
              'При открытии страницы в GoatCounter уходят: адрес и заголовок страницы, адрес, с которого вы пришли, размер экрана, а также браузер, система и страна, которые GoatCounter определяет по запросу. Данные обезличены: по ним нельзя узнать, кто вы.',
            ]
          : ['Сейчас счётчик посещений выключен: при открытии страниц никуда ничего не отправляется.'],
      },
      {
        h: 'Google Analytics и Яндекс Метрика',
        p:
          has.ga4 || has.metrika
            ? [
                `${[has.ga4 && 'Google Analytics', has.metrika && 'Яндекс Метрика'].filter(Boolean).join(' и ')} загружаются только после того, как вы нажмёте «Разрешить» в плашке внизу экрана. Они ставят cookies и собирают данные о посещении по своим правилам. Если вы отказались, ничего не загружается. Передумать можно в любой момент: ссылка «Настройки cookies» в подвале.`,
              ]
            : ['Сейчас не подключены. Если мы их включим, они будут загружаться только после вашего согласия, и эта страница изменится.'],
      },
      ...(ON_VERCEL
        ? [{ h: 'Vercel Web Analytics', p: ['Считает просмотры страниц без cookies и без сохранения IP-адресов. Работает только на основном домене.'] }]
        : []),
      {
        h: 'Что хранится в вашем браузере',
        p: ['Несколько настроек сайт держит в localStorage вашего браузера. Они никуда не отправляются, и мы их не видим. Удалить их можно, очистив данные сайта в браузере.'],
        rows: storage('ru'),
      },
      {
        h: 'Форма «Предложить сайт»',
        p: [
          'Форма ничего не отправляет на наш сервер. Она собирает текст письма и открывает ваше почтовое приложение, Telegram или WhatsApp — отправляете вы сами, и сообщение идёт через выбранный сервис по его правилам.',
          'Полученные письма и сообщения мы храним, чтобы ответить и проверить предложенный сайт. Попросите — удалим переписку.',
        ],
      },
      {
        h: 'Ссылки на другие сайты',
        p: [`К внешним ссылкам из каталога добавляется только метка ?ref=${SITE.ref}, чтобы сайт знал, откуда пришёл посетитель. После перехода действуют правила того сайта.`],
      },
      {
        h: 'Ваши права',
        p: [`Вы можете спросить, какие данные о вас у нас есть, и попросить их удалить. Пишите на ${AUTHOR.email} или в Telegram ${AUTHOR.telegram.handle}.`],
      },
    ];
  }
  return [
    {
      h: 'Who runs the site',
      p: [
        `${SITE.name} (${SITE.host}) is run by one person, ${AUTHOR.name}, in ${AUTHOR.city.en}. For anything about your data, write to ${AUTHOR.email}.`,
        'There are no sign-ups, accounts, comments or payments here. We never ask for your name, email or phone to use the index.',
      ],
    },
    {
      h: 'What the host sees',
      p: [
        `The site is hosted on ${host}. Like any web server it keeps technical logs: IP address, browser, page and time of the request. ${host} keeps these logs under its own policy (${hostPolicy}); we have no access to them.`,
      ],
    },
    {
      h: 'Visit counter',
      p: has.goat
        ? [
            'To know which pages people open most (the Popular page is built from this), we use GoatCounter. It sets no cookies and does not store IP addresses.',
            'When a page opens, GoatCounter receives: the page address and title, the page you came from, your screen size, and the browser, system and country it reads from the request. The data is anonymous: it can’t tell who you are.',
          ]
        : ['The visit counter is off right now: opening a page sends nothing anywhere.'],
    },
    {
      h: 'Google Analytics and Yandex Metrica',
      p:
        has.ga4 || has.metrika
          ? [
              `${[has.ga4 && 'Google Analytics', has.metrika && 'Yandex Metrica'].filter(Boolean).join(' and ')} load only after you press “Allow” in the banner at the bottom of the screen. They set cookies and collect visit data under their own policies. If you decline, nothing loads. You can change your mind any time with “Cookie settings” in the footer.`,
            ]
          : ['Not connected right now. If we turn them on, they will load only after you agree, and this page will change.'],
    },
    ...(ON_VERCEL
      ? [{ h: 'Vercel Web Analytics', p: ['Counts page views with no cookies and without storing IP addresses. Runs on the main domain only.'] }]
      : []),
    {
      h: 'What stays in your browser',
      p: ['The site keeps a few settings in your browser’s localStorage. They are never sent anywhere and we can’t see them. Clear the site’s data in your browser to remove them.'],
      rows: storage('en'),
    },
    {
      h: 'The “Submit a site” form',
      p: [
        'The form sends nothing to our server. It writes the message and opens your mail app, Telegram or WhatsApp; you send it yourself, and it travels through that service under its rules.',
        'We keep the emails and messages we receive so we can reply and review the site. Ask and we’ll delete the conversation.',
      ],
    },
    {
      h: 'Links to other sites',
      p: [`Outbound links from the index carry only a ?ref=${SITE.ref} tag, so the site knows where the visitor came from. Once you leave, that site’s policy applies.`],
    },
    {
      h: 'Your rights',
      p: [`You can ask what data we have about you and ask us to delete it. Write to ${AUTHOR.email} or on Telegram ${AUTHOR.telegram.handle}.`],
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
            { h: 'Как отозвать согласие', p: ['Нажмите «Настройки cookies» в подвале — плашка появится снова. Можно также удалить cookies сайта в настройках браузера.'] },
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
          { h: 'Withdrawing consent', p: ['Press “Cookie settings” in the footer and the banner comes back. You can also delete the site’s cookies in your browser settings.'] },
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
          'Ни один сайт не платил за место в списке, и у нас нет партнёрских ссылок. К внешним ссылкам добавляется только метка ref, и денег она не приносит.',
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
        'No site paid to be listed and there are no affiliate links. Outbound links carry only a ref tag, and it earns nothing.',
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
      { q: 'Как сохранить сайт?', a: 'Нажмите на закладку на карточке. Сохранённые сайты встают в начало сетки, а кнопка с закладкой в панели показывает только их. Они хранятся в этом браузере: на другом устройстве их не будет.' },
      { q: 'Что значит «Смотрели»?', a: 'Вы уже открывали страницу этого сайта в этом браузере. Отметку видите только вы.' },
      { q: 'Как предложить сайт?', a: 'Через форму «Предложить сайт»: ссылка, название и пара слов о том, чем он хорош. Каждым сайтом сначала пользуемся сами, поэтому добавление занимает время.' },
      { q: 'Ссылка не открывается или описание устарело', a: `Напишите на ${AUTHOR.email} или в Telegram ${AUTHOR.telegram.handle}: какой сайт и что не так. Поправим.` },
      { q: 'Я владелец сайта и хочу его убрать', a: `Напишите на ${AUTHOR.email}, какой это сайт, — уберём.` },
      { q: 'Сайт платный?', a: 'Нет. Регистрации нет, всё бесплатно, места в списке не продаются.' },
    ];
  }
  return [
    { q: 'How do I find a site?', a: 'Click the search in the top bar or press /. Describe the job in your own words (“remove background”, “Cyrillic font”) or pick a category, price and platform in the filters.' },
    { q: 'How do I save a site?', a: 'Tap the bookmark on its card. Saved sites move to the front of the grid, and the bookmark button in the bar shows only them. They live in this browser, so another device won’t have them.' },
    { q: 'What does “Viewed” mean?', a: 'You have opened that site’s page in this browser before. Only you see the mark.' },
    { q: 'How do I suggest a site?', a: 'Use the “Submit a site” form: the link, the name and a few words on why it’s good. We use every site for a while first, so adding one takes time.' },
    { q: 'A link is broken or a description is out of date', a: `Write to ${AUTHOR.email} or on Telegram ${AUTHOR.telegram.handle}: which site and what’s wrong. We’ll fix it.` },
    { q: 'I own a listed site and want it removed', a: `Write to ${AUTHOR.email} and say which site, and we’ll remove it.` },
    { q: 'Does it cost anything?', a: 'No. There’s no sign-up, everything is free, and places on the list aren’t for sale.' },
  ];
}
