# Atlas

A hand-picked, searchable index of useful websites and tools for makers,
developers and the curious. Built with [Astro](https://astro.build) 7 as a
fully static site.

## Run it

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run preview
```

Node 22.23+ is required by Astro 7.

## Where things are

```
src/
  data/tools.json        ← the list of sites (edit this)
  data/categories.json   ← categories, in display order
  assets/shots/          ← homepage screenshots, <tool-id>.jpg
  styles/atlas.css       ← the whole design system (read docs/DESIGN.md)
  i18n/                  ← interface strings, English for now
  components/            ← Header, Footer, Gallery, ToolCard, SearchField…
  pages/
    index.astro          ← hero + search + grid
    category/[slug].astro
    tool/[slug].astro    ← page for each site
    about.astro, submit.astro, 404.astro
public/fonts/            ← Medeo Sans / Mono / Serif (OFL)
scripts/screenshots.mjs  ← captures screenshots with Playwright
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
     "summary": { "en": "One line for the card, about 60 characters." },
     "description": { "en": "One to three sentences for the site's own page." }
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

## Submit form

`/submit` posts to whatever URL is in `PUBLIC_SUBMIT_ENDPOINT` (Formspree,
Basin, a Worker…). Without it, the form tells visitors submissions aren't open
yet.

```
PUBLIC_SUBMIT_ENDPOINT=https://formspree.io/f/xxxxxx
```

## Fonts

Medeo by its authors, licensed under the SIL Open Font License
(`public/fonts/OFL.txt`).
