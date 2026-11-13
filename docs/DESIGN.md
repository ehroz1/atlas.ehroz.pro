# Atlas design system

Everything visual lives in **`src/styles/atlas.css`**. This document explains the
rules behind it, so new pages look like they were made at the same time as the
first ones.

The reference is [deck.gallery](https://www.deck.gallery): a white page, a single
calm statement, pill-shaped controls, and a tight grid of grey tiles with
screenshots floating in them. When in doubt, do less.

---

## 1. Principles

1. **Content is the color.** The interface is black, white and grey. The
   screenshots of the sites are what people came to see, so the frame stays
   quiet.
2. **One statement per screen.** A page has one large sentence or title. No
   eyebrow labels, no subtitles stacked on subtitles.
3. **Space between sections, density inside them.** Big vertical gaps between
   the hero and the grid (`--section-gap`), a tight 8px gap between tiles
   (`--grid-gap`). That contrast is what makes the page feel calm.
4. **Flat.** Two shadows exist: `--shadow-shot` under screenshots and
   `--shadow-float` under the search panel. Cards, buttons, the bar pills and
   inputs have none.
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
| `--c-bg` | `#fff` | page |
| `--c-surface` | `#f5f5f5` | tiles |
| `--c-surface-hover` | `#efefef` | tile on hover |
| `--c-fill` | `#efefef` | search, inputs, pressed buttons |
| `--c-line` / `--c-line-strong` | `#e8e8e8` / `#dedede` | chip and button outlines, dividers |
| `--c-line-active` | `#2b2b2b` | current chip, focused input |
| `--c-text` | `#141414` | main text |
| `--c-text-2` | `#6b6b6b` | summaries, secondary text |
| `--c-text-3` | `#8a8a8a` | meta, counts, labels |
| `--c-chrome` | `#161616` | top-bar pills, search panel |
| `--c-chrome-hover` / `--c-chrome-active` | `#222` / `#2e2e2e` | pill hover, current segment, highlighted result |
| `--c-chrome-muted` | `#a8a8a8` | secondary text inside the bar |
| `--c-accent` | `#1268ff` | **the one primary button in the bar** ("Submit a site") |
| `--c-ink-blue` | `#2f5bea` | **illustrations only** |
| `--c-signal` | `#e5534b` | chip hover, errors |

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
- Tiles are almost square-cornered (`--r-tile`: 2px), like paper.
- Screenshots: `--r-xs` (3px). Form inputs: `--r-md` (10px).
- Never mix: a pill button inside a pill search is fine; a rounded-2xl card is not.

### Layout

- Main column: `--container` 960px + gutters. Text pages and forms:
  `.container--narrow` (576px).
- The grid is **two columns** from 640px up, one column below. Don't go to
  three or four; the screenshots need the width.

---

## 3. Components

All classes are in `atlas.css`; the Astro components in `src/components` just
put them together.

| Component | Classes | Notes |
|---|---|---|
| Top bar | `.site-header`, `.bar-group`, `.bar-logo`, `.segmented`, `.bar-search`, `.btn--bar.btn--accent` | fixed, transparent strip of separate dark pills: brand · Sites/Categories · search · Submit |
| Brand pill | `.bar-logo`, `.bar-logo__more` | globe + "Atlas°"; on hover unrolls to "Atlas.ehroz.pro°" |
| Search panel | `.search-panel`, `.search-hit`, `.search-panel__chip` | opens under the search pill; categories when empty, sites when typing (on pages without a grid) |
| Button | `.btn`, `.btn--solid`, `.btn--ghost`, `.btn--sm`, `.btn--lg` | at most one `--solid` per screen |
| Link in text | `.link` | grey underline, ink on hover |
| Back link | `.back` | `← Category` above a page title |
| Chips | `.chips`, `.chip`, `aria-current="page"` | current = ink outline; hover = signal red |
| Keyboard hint | `.kbd` | `/` focuses the search from anywhere |
| Hero | `.hero`, `.hero__drawing`, `.hero__statement` | drawing → sentence → small aside |
| Category index | `.category-list`, `.category-row` | one row per category with examples and count |
| Tile | `.tile`, `.tile__shot`, `.tile__fallback`, `.tile--large` | grey frame, shot at ~80% width |
| Card | `.card`, `.card__name`, `.card__category`, `.card__summary` | whole card is one link |
| Grid | `.cards`, `.toolbar` | chips + count above, cards below |
| Facts | `.meta` (a `<dl>`), `.tags`, `.tag` | label column 6rem, hairline between rows |
| Text | `.prose` | 34rem measure, 17px |
| Forms | `.form`, `.field`, `.input`, `.textarea`, `.select`, `.checkbox` | filled, no border until focus |
| Empty state | `.empty` | one line title, one line help, one button |

Layout helpers: `.container`, `.stack` (`--gap`), `.cluster` (`--gap`),
`.split`, `.section`, `.section--tight`.

### Adding a page

```astro
---
import Base from '~/layouts/Base.astro';
---
<Base title="Page title" description="One sentence for search engines.">
  <div class="container">
    <div class="section" style="padding-bottom: 0">
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

### The top bar and search

- The bar is `position: fixed` and transparent; only the pills catch clicks.
  `main` is padded by `--header-h`, so new pages need nothing extra.
- Everything in the bar is `--bar-h` (44px) tall and uses `--c-chrome`.
- Search lives only in the bar. On pages that render `Gallery`
  (home, category pages) typing filters the grid through the
  `atlas:query` event; on other pages it opens the panel with up to 8 hits.
  Enter opens the highlighted hit, or the home grid with `?q=`.
- Don't add a second search field to a page.

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
- [ ] No emoji or sparkles (✨) in UI text, headings or buttons.
- [ ] No eyebrow label above a heading ("FEATURES", "WHY ATLAS").
- [ ] No badges like "New" or "Popular" on every card.
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
