# Atlas

A hand-picked, searchable index of useful websites and tools for makers,
developers and the curious. Built with [Astro](https://astro.build) 7 as a
fully static site.

## Run it

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run check:seo  # SEO checks on dist/ (run after build)
npm run check:a11y # axe accessibility checks (needs Playwright + Chromium)
npm run preview
```

## Docs

- [DEPLOY.md](DEPLOY.md) — deploy process, rollback, Search Console / Yandex Webmaster / Bing / GA4 / Metrica setup
- [SEO.md](SEO.md) — SEO checklist: what is done in code, what is manual
- [PAGE-STANDARD.md](PAGE-STANDARD.md) — rules and checklist for every new page
- [DECISIONS.md](DECISIONS.md) — decisions taken without asking
- [docs/DESIGN.md](docs/DESIGN.md) — design rules

Node 22.23+ is required by Astro 7.

## Where things are

```
src/
  site.config.ts         ← brand, domain, author (one source for names)
  analytics.config.ts    ← GA4 / Metrica IDs, search-engine verification codes, IndexNow key
  data/tools.json        ← the list of sites, ru + en (edit this)
  data/categories.json   ← categories, in display order
  assets/shots/          ← homepage screenshots, <tool-id>.jpg
  styles/atlas.css       ← the whole design system (read docs/DESIGN.md)
  i18n/                  ← interface strings: ru.ts (root) and en.ts (/en/)
  lib/routes.ts          ← every page: title, description, lastmod → pages, sitemap, llms.txt, OG
  lib/schema.ts          ← schema.org JSON-LD builders
  components/            ← Header, Footer, Gallery, ToolCard, Analytics (consent)…
  views/                 ← page bodies, one per page type, take `lang`
  pages/
    [...lang]/…          ← routes: / and /en/ for every page
    og/[...slug].png.ts  ← OG covers, 1200×630, rendered at build
    robots.txt.ts, sitemap-*.xml.ts, llms*.txt.ts, 404.astro
integrations/csp.mjs     ← CSP meta with script hashes, added after the build
public/fonts/            ← Medeo Sans / Mono / Serif (OFL)
scripts/screenshots.mjs  ← captures screenshots with Playwright
scripts/check-seo.mjs    ← npm run check:seo
scripts/monitor-seo.mjs  ← weekly live-site check (GitHub Actions)
scripts/indexnow.mjs     ← pings IndexNow after a deploy
docs/DESIGN.md           ← design rules and the "does it look generated?" checklist
```

## Adding a site

1. Add an entry to `src/data/tools.json`:

   ```json
   {
     "id": "excalidraw",
     "name": "Excalidraw",
     "url": "https://excalidraw.com",
     "category": "productivity",
     "pricing": "free",
     "openSource": true,
     "platforms": ["Web"],
     "tags": ["whiteboard", "diagrams"],
     "added": "2026-11-04",
     "updated": "2026-11-04",
     "summary": { "en": "One line for the card, about 60 characters.", "ru": "Одна строка для карточки." },
     "description": { "en": "One to three sentences for the site's own page.", "ru": "Одно-три предложения." }
   }
   ```

   `pricing` is `free`, `freemium` or `paid`. `category` must be an `id` from
   `categories.json`; the build fails otherwise.

2. Capture its screenshot:

   ```bash
   npm i -D playwright && npx playwright install chromium   # once
   npm run shots              # only sites without a screenshot
   npm run shots -- figma     # specific ids
   npm run shots -- --all     # redo everything
   ```

   Sites behind bot checks (Claude, Perplexity) are skipped and the card shows
   the domain instead. You can also drop any 16:10 image into
   `src/assets/shots/<id>.jpg` by hand.

## Alternatives, similar sites, "New"

- `src/data/alternatives.json` lists groups of sites that do the same job;
  each site's page shows the others in its groups as "Alternatives to …".
  Unknown ids fail the build.
- "Similar sites" is computed from shared tags, category and pricing
  (`src/lib/related.ts`), so good tags matter.
- "New" goes on the `NEW_MAX` (6) most recent sites added in the last
  `NEW_DAYS` (14) days, by `added` and then by position in `tools.json`.
- "Viewed" marks and the "Feeling lucky" button in search work per browser
  (`localStorage`), no server needed.

## Feeds and sharing

Built with the site, no extra setup:

- `/rss.xml` — the 50 newest sites
- `/sitemap-index.xml` (→ `/sitemap-0.xml`, with hreflang) and `/robots.txt` — use the deploy URL automatically
- `/llms.txt`, `/llms-full.txt` — the site for AI search
- `/og/<lang>/<page>.png` — 1200×630 share image for every page in both
  languages, drawn by `src/pages/og/[...slug].png.ts` (satori + resvg) from
  the screenshots and the fonts in `src/assets/og/`.

## Submit form

`/submit` posts to whatever URL is in `PUBLIC_SUBMIT_ENDPOINT` (Formspree,
Basin, a Worker…). Without it, the form tells visitors submissions aren't open
yet.

```
PUBLIC_SUBMIT_ENDPOINT=https://formspree.io/f/xxxxxx
```

## Deploy

GitHub Pages today (`.github/workflows/deploy.yml`, on push to `main`), ready for Vercel
(`vercel.json`). Process, rollback and the move to Vercel: [DEPLOY.md](DEPLOY.md).

The workflow passes the Pages address to Astro (`SITE_URL`, `BASE_PATH`), so the same code
works at `https://ehroz1.github.io/atlas.ehroz.pro/` (noindex) and at the domain root.
In code, always build internal links with `u('/path', lang)` from `src/lib/url.ts`, never a bare `"/path"`.

## Fonts

Medeo by its authors, licensed under the SIL Open Font License
(`public/fonts/OFL.txt`).
