# Atlas design system

Everything visual lives in **`src/styles/atlas.css`**. This document explains the
rules behind it, so new pages look like they were made at the same time as the
first ones.

The reference is [deck.gallery](https://www.deck.gallery): a near-black page,
floating dark pills for navigation, a rounded hero panel with screenshots
scattered around its edges, and a grid of full-bleed screenshots. When in doubt,
do less.

---

## 1. Principles

1. **Content is the color.** The interface is near-black, white and grey
   (dark theme only). The screenshots of the sites are what people came to
   see, so the frame stays quiet.
2. **One statement per screen.** A page has one large sentence or title. No
   eyebrow labels, no subtitles stacked on subtitles.
3. **Space between sections, density inside them.** Big vertical gaps between
   the hero and the grid (`--section-gap`), a tight 8px gap between tiles
   (`--grid-gap`). That contrast is what makes the page feel calm.
4. **Flat.** Two shadows exist: `--shadow-shot` under screenshots and
   `--shadow-float` under things that float (search panel, menu, cookie
   banner, admin toast). Cards, buttons, the bar pills and inputs have none.
   No `backdrop-filter` blur: badges over screenshots sit on `--c-scrim`.
5. **Words are plain.** Write like you'd explain the site to a friend. No
   "supercharge", "unlock", "seamless", "revolutionary", "AI-powered" as an
   adjective, and no exclamation marks.

---

## 2. Tokens

Use semantic tokens (`--c-text`, `--c-surface`), never the raw scale
(`--gray-500`) and never hex values in components.

### Color

| Token | Value | Use |
|---|---|---|
| `--c-bg` | `#0d0d0d` | page, hero panel |
| `--c-surface` | `#141414` | screenshot placeholders, tool-page frame |
| `--c-fill` / `--c-fill-hover` | `#1c1c1c` / `#242424` | inputs |
| `--c-line` / `--c-line-strong` | `#222` / `#2a2a2a` | hairlines, page frame, chip outlines, hero panel border |
| `--c-line-active` | `#ededed` | current chip, focused input |
| `--c-text` | `#fff` | main text |
| `--c-text-2` | `#b0b0b0` | summaries, secondary text |
| `--c-text-3` | `#8c8c8c` | meta, counts, hero subline |
| `--c-chrome` | `#1c1c1c` | top-bar pills, search panel |
| `--c-chrome-hover` / `--c-chrome-active` | `#242424` / `#2c2c2c` | pill hover, current segment, highlighted result |
| `--c-accent` | `#1268ff` | **one primary button per screen** (hero "Submit a site") |
| `--c-ink-blue` | `#5b8cff` | **illustrations only** |
| `--c-signal` | `#ff6b5e` | hover on card/category names, errors |
| `--c-on-accent` | `#fff` | text on blue or red fills |
| `--c-scrim` / `--c-scrim-hover` | near-black, 88% / 96% | badges and buttons over screenshots |
| `--c-backdrop` | black, 62% | behind the finder dialog |
| `--c-accent-tint` | blue, 18% | the "most used" flag on About |

Three accents, one job each. Don't add a fourth, don't use blue for links or
other buttons, and don't use gradients.

### Type

One family: **Medeo Sans** (variable, `wght` 100–900, `opsz` 14–32). Optical
size is automatic, so large text gets the display cut by itself. **Medeo Mono**
is for keyboard keys, counts and code. Medeo Serif is loaded but reserved;
don't use it without a reason.

| Class | Size | Weight | Use |
|---|---|---|---|
| `.t-display` | 32→48px | 500 | tool name on its page |
| `.t-statement` | 22→28px | 500 | hero sentence, page titles |
| `.t-title` | 20px | 500 | section titles ("More in Design") |
| `.t-lead` | 17px | 400 | the first paragraph on a page |
| body | 15px | 400 | default |
| `.t-small` | 14px | 400 | secondary UI |
| `.t-meta` | 13px | 400, grey | dates, captions |
| `.t-mono` | 13px | mono | keys, numbers |

Weights in use are **400** and **500**. Bold (700) is not used anywhere.
Headings are never all-caps, and letter-spacing is only tightened, never
widened.

### Space

4px base: `--s-1` (4) … `--s-32` (128). Use the scale for every margin, padding
and gap. Common pairs:

- inside a component: `--s-2`–`--s-4`
- between components: `--s-6`–`--s-12`
- between page sections: `--section-gap` (64→128)

### Shape

- Pills (`--r-pill`) for anything you click: buttons, chips, search.
- Cards: `--r-card` (4px). Hero panel and tool-page frame: `--r-hero`.
- Screenshots: `--r-xs` (3px). Form inputs: `--r-md` (10px).
- Never mix: a pill button inside a pill search is fine; a rounded-2xl card is not.

### Layout

- Main column: `--container` 960px + gutters. Text pages and forms:
  `.container--narrow` (576px).
- A page frame (two full-height hairlines, `body::before`) sits `--frame-inset` from the window edges; content keeps `--frame-pad` inside it. Gallery pages use `.container--wide` (max `--container-wide`, 92rem).
  The grid is 1 column on phones, 2 from 640px, 3 from 1024px.

---

## 3. Components

All classes are in `atlas.css`; the Astro components in `src/components` just
put them together.

| Component | Classes | Notes |
|---|---|---|
| Top bar | `.site-header`, `.bar-group`, `.bar-logo`, `.segmented`, `.bar-search`, `.btn--bar.btn--accent` | fixed, transparent strip of separate dark pills: brand · Sites/Categories · search · Submit |
| Brand pill | `.bar-logo`, `.bar-logo__more` | globe + "Atlas°"; on hover unrolls to "Atlas.ehroz.pro°" |
| Search pill | `.bar-search__field`, `.bar-search__badge` | a button; shows the current query and a blue count of active filters |
| Finder | `.finder` (a `<dialog>`), `.finder__field`, `.finder__facet`, `.finder__option`, `.finder__hit`, `.finder__foot` | search & filter: white-ringed field, facets left (Category / Pricing / Platform), options with counts right, Clear all + Done; typing (debounced 300 ms) hides the facets and shows tabs Sites N / Categories N with thumbnail results; × clears |
| Sort & filter | `.sortbar`, `.sortbar__btn`, `.sort-panel`, `.sort-chip` | home toolbar: count left, button right; panel with Sort (Shuffled / Newest first / A–Z, `?sort=`) and Price / Category / Platform chips with counts. Filters are the finder's own state (events `atlas:facet`, `atlas:facets-clear`); bottom sheet on phones |
| Menu | `.bar-menu`, `.menu`, `.menu__item`, `.menu__sep`, `.menu__note` | opens from the round button at the right end of the bar |
| Wall | `.wall`, `.wall__plane`, `.wall__row`, `.wall__item`, `.wall__label`, `.wall__hint` | endless plane of screenshots moved by a script (no native scroll, no scrollbars, no axis-locking): wheel/trackpad, drag with inertia, swipe, arrows; the block is tiled 3×3 and drawn modulo one block; page uses `<Base flush bare>` |
| About / plans | `.page-stage`, `.edge-shots` (clipped to the frame column; left column rides up, right rides down), `.t-headline`, `.plans`, `.plan`, `.plan--raised`, `.plan__*` | big headline, screenshots peeking from the edges, three joined columns, middle one raised |
| Button | `.btn`, `.btn--solid`, `.btn--ghost`, `.btn--sm`, `.btn--lg` | at most one `--solid` per screen |
| Link in text | `.link` | grey underline, ink on hover |
| Back link | `.back` | `← Category` above a page title |
| Chips | `.chips`, `.chip`, `aria-current="page"` | current = ink outline; hover = signal red |
| Keyboard hint | `.kbd` | `/` focuses the search from anywhere |
| Home hero | `.hero-intro`, `.hero-intro__title/__sub/__actions/__btn--primary/__btn--secondary/__card/__shot/__meta` | uppercase statement left with two buttons (newsletter, submit); desktop only: random site from the `SHOWCASE` list on the right (screenshot, name, category), hidden on phones. Markup in `HeroIntro.astro` |
| Page hero | `.hero`, `.t-statement` | centered title + one line on category/other pages |
| Category index | `.category-list`, `.category-row` | one row per category with examples and count |
| Card | `.card`, `.card__media`, `.card__shot`, `.card__badge`, `.card__name`, `.card__category`, `.card__summary` | full-bleed 16:10 screenshot with a pricing badge, caption below; whole card is one link |
| Card actions | `.card-wrap`, `.card__actions`, `.card__act` | bookmark (save) and ↑ (move to top of saved) buttons, siblings of the card link; local only, `localStorage` `atlas:saved` = [ids] (script in `Base.astro`); saved cards are listed first in the grid |
| Card marks | `.card__badge--new`, `.card__badge--seen`, `.card-wrap.is-seen` | left corner: white "New" on the `NEW_MAX` newest sites only (`src/lib/related.ts`), or dark "Viewed" plus a greyed name for sites opened before in this browser (script at the end of `Base.astro`, `localStorage` `atlas:seen`) |
| Feeling lucky | `.finder__lucky`, `.finder__foot-end` | quiet pill left of Done; opens a random site from the current query/filters, unseen ones first; icon only on phones |
| Alternatives / Similar | `.section-head` + `.cards` on the tool page | alternatives come from `src/data/alternatives.json`; similar sites are scored by shared tags, category and pricing |
| Tile | `.tile`, `.tile__shot` | large framed screenshot on the tool page |
| No screenshot | `.shot-fallback` | the domain set large |
| Grid | `.cards`, `.toolbar` | 1 → 2 → 3 columns; chips + count above on category pages |
| Results bar | `.results-bar`, `.results-bar__text` | shown above the grid only while a query, filters or the Saved view narrow it: "4 sites for “fig”" + Clear |
| Facts | `.meta` (a `<dl>`), `.tags`, `.tag` | label column 6rem, hairline between rows |
| Text | `.prose` | 34rem measure, 17px |
| Forms | `.form` (`--gap`), `.form--md`, `.field`, `.field--short`, `.field__optional`, `.input`, `.input-row`, `.textarea`, `.textarea--short`, `.select`, `.checkbox` | filled, no border until focus; "(optional)" after a label is `.field__optional` |
| Empty state | `.empty`, `.empty--page` | one line title, one line help, one button; `--page` for the 404 |
| FAQ | `.faq`, `.faq__item` (`<details>`), `.faq__q`, `.faq__a` | Help page; hairline between rows, `+`/`−` on the right, first one open |
| Key table | `.keys` | legal pages: storage key (mono) → what and how long; hairline rows |
| Card rank | `.card__rank` | one grey line under the summary, e.g. "Place 1 · 120 views" on Popular |
| Footer | `.site-footer--cols`, `.foot-top`, `.foot-brand`, `.foot-cols`, `.foot-col`, `.foot-bottom`; home adds `.site-footer--scenic`, `.foot-scene`, `.foot-scene__img` | every page: brand + three link columns + legal row; home only (`<Base scenicFooter>`): `src/assets/footer/mountains.webp` (transparent sky) full width at the very bottom |
| Ranked grid | `<Gallery ordered notes>` | keeps the given order (no shuffle, saved sites not lifted); Popular only |

Layout helpers: `.container`, `.stack` (`--gap`), `.cluster` (`--gap`),
`.split`, `.section`, `.section--tight`, `.chips--center`, `.section-head--flush`.

Page spacing modifiers (instead of inline `padding`):

| Class | Padding | Use |
|---|---|---|
| `.section--top` | section gap above, 0 below | body of Account, API, Pro, Newsletter, Collection |
| `.section--page` | `--s-8` above | form and text pages under breadcrumbs (Submit, Contact) |
| `.hero--page` | `--s-10` above | page hero on Categories / Category |
| `.section--follow` | `--s-10` above | grid right under a page hero |
| `.section--list` | `--s-12` above | category index under its hero |
| `.section--more` | `--s-20` above | related block after main content (alternatives, similar, comments, other categories) |
| `.section--next` | `--s-16` above | second block on Newsletter |

The only inline `style` allowed in templates is a custom property such as
`style="--gap: var(--s-3)"` on `.stack`, `.cluster` or `.form`.

### Adding a page

```astro
---
import Base from '~/layouts/Base.astro';
---
<Base title="Page title" description="One sentence for search engines.">
  <div class="container">
    <div class="section section--top">
      <h1 class="t-statement">Page title</h1>
      <p class="t-secondary mt-2">One line about the page.</p>
      <!-- content -->
    </div>
  </div>
</Base>
```

If a page needs a new pattern, add it to `atlas.css` under a numbered section
with a short comment, and add a row to the table above. Don't write
component-scoped `<style>` blocks for things that could be reused.

---

### Pages

| Page | View | Notes |
|---|---|---|
| `/search/` | `Search.astro` | results grid for the bar's finder (`?q=&category=&pricing=&platform=`), tag chips under the title; no second search field |
| `/tags/` | `Tags.astro` | every tag as a `.chip` with `.chip__count`, most used first; links to `/search/?q=<tag>` |
| `/popular/` | `Popular.astro` | ranked by GoatCounter page views (`src/lib/popular.ts`); without data an `.empty` note and featured sites, never invented numbers |
| `/support/` | `Support.astro` | `.faq` + how to help; `FAQPage` in JSON-LD |
| `/privacy/`, `/cookies/`, `/disclaimer/` | `Legal.astro` | `.prose` + `.keys`; text in `src/lib/texts.ts` follows the build's real settings |

### The top bar and search

- The bar is `position: fixed` and transparent; only the pills catch clicks.
  `main` is padded by `--header-h`, so new pages need nothing extra.
- Everything in the bar is `--bar-h` (44px) tall and uses `--c-chrome`.
- Search lives only in the bar: the pill opens the finder dialog.
  State is `{ q, category[], pricing[], platform[] }`, mirrored in the URL
  (`?q=&category=&pricing=&platform=`). On pages that render `Gallery`
  the header fires `atlas:filter` with matching ids and the grid updates
  live; elsewhere Done opens `/search/` with the same params.
- Don't add a second search field to a page.
- Esc closes the finder and keeps the query (it doesn't wipe the field).
- On phones (≤34rem) the bar is logo · search · saved · menu; Submit lives in the menu and the hero.
- Keyboard hints (`.kbd`, `.only-keyboard`) are hidden on touch screens.
- Touch targets: on `pointer: coarse` card buttons are 44px and chips 40px.

---

## 4. Motion

Short and functional: `--dur-fast` (120ms) for color, `--dur` (200ms) for
small movement, `--dur-slow` (400ms) for the screenshot lift on hover. Easing
is always `--ease`. Nothing animates on page load, nothing loops, and
`prefers-reduced-motion` turns everything off.

---

## 5. Illustration

The hero drawing (`HeroDrawing.astro`) is a single-weight blue line, no fills,
slightly uneven on purpose. New illustrations follow the same rules: one
stroke color (`currentColor` + `--c-ink-blue`), `stroke-width` around 2.4 in a
~170px viewBox, round caps and joins, lines that don't quite close.
No emoji, no icon sets, no 3D blobs.

---

## 6. Checklist: does it look machine-made?

Run through this before shipping a new page. Each item is something generated
interfaces tend to do and this site doesn't.

- [ ] No gradients, glows, glassmorphism or blurred colored blobs.
- [ ] No purple/indigo accent; the blue accent appears on one button only.
- [ ] No row of three "feature cards" with an icon, title and two lines.
      (The About page's three plan columns are the one exception — they
      copy deck.gallery's pricing layout and every number is real.)
- [ ] No emoji or sparkles (✨) in UI text, headings or buttons.
- [ ] No eyebrow label above a heading ("FEATURES", "WHY ATLAS").
- [ ] No badges like "New" or "Popular" on every card. ("New" is capped
      at `NEW_MAX` sites, see `src/lib/related.ts`.)
- [ ] Copy has no "unlock / supercharge / seamless / elevate / game-changer"
      and doesn't stack em dashes. One sentence, said plainly.
- [ ] Cards aren't wrapped in borders *and* shadows *and* rounded 16px corners.
- [ ] Only 400 and 500 weights; no bold headings.
- [ ] Spacing comes from the scale, not from arbitrary pixel values.
- [ ] Hover states change one thing (color *or* position), not five.
- [ ] Every number on screen is true (counts come from data, not "10,000+ users").

---

## 7. Languages

English is the default. Interface strings live in `src/i18n/en.ts`; content
fields are `{ "en": "…" }` objects in `src/data/*.json`. To add Russian:

1. `astro.config.mjs` → `locales: ['en', 'ru']`
2. copy `src/i18n/en.ts` to `ru.ts`, translate, register it in `src/i18n/index.ts`
3. add `"ru": "…"` next to each `"en"` in `src/data/*.json`
4. add `src/pages/ru/…` routes (or move pages under `[lang]/`)

Medeo Sans includes Cyrillic, so no font changes are needed. Russian plural
forms need `few`/`many` keys (see `plural()` in `src/i18n/index.ts`).

---

## 8. Admin

`/admin/` is a plain static page in `public/admin/` (no Astro build, its own
strict CSP), so it can't import `atlas.css`. `public/admin/admin.css` copies
the semantic tokens under the same names and values and loads Medeo Sans
from `public/admin/MedeoSansVariable.woff2`. When a token changes in
`atlas.css`, change it there too. The same rules apply: 400/500 only, the
spacing scale, pills for buttons, `--r-card` for list boxes, `--r-md` for
inputs, one `.btn.primary` per tab, `--shadow-float` for the toast only.
