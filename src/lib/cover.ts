/**
 * Article covers, drawn at build time (satori → resvg → PNG).
 *
 * One style for every article: a solid colour field chosen by the
 * article's first category, fine hairline grid like the site's frame,
 * the brand line on top, a large numeral (the number from the title,
 * e.g. "8 сайтов" → 8, or the first letter) and the title set big at
 * the bottom. Same picture for the page cover, list cards and og:image.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { SITE } from '~/site.config';

/** Category → [background, numeral tint]. Deep, muted, readable with white text. */
const PALETTE: Record<string, [string, string]> = {
  ai: ['#23224a', '#4b47a8'],
  design: ['#3b1f2b', '#8a3b5a'],
  'design-generators': ['#3d2a14', '#9a6a2c'],
  development: ['#102a33', '#2b6c80'],
  productivity: ['#1d2f22', '#4a7a55'],
  'video-audio': ['#341a1a', '#8a3a33'],
  '3d-motion': ['#1b2440', '#3f5aa6'],
  typography: ['#2a2418', '#8a7442'],
  inspiration: ['#33203a', '#7d4a8c'],
  'web-galleries': ['#1a2b3a', '#3d6f96'],
  branding: ['#3a1e14', '#a34a2a'],
  assets: ['#16302c', '#2f7a6c'],
  'icons-illustrations': ['#2c2a14', '#7f7a2c'],
  mockups: ['#24242a', '#5a5a6e'],
  museums: ['#2e2419', '#86643c'],
  utilities: ['#1c2a2a', '#467070'],
  'file-converters': ['#202436', '#4c5788'],
  learning: ['#1f2d1a', '#5b7d3c'],
};
const FALLBACK: [string, string] = ['#1a1f2e', '#3a4670'];

let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 600; style: 'normal' }[]> | undefined;
const loadFonts = () =>
  (fonts ??= Promise.all(
    ([['Regular', 400], ['SemiBold', 600]] as const).map(async ([file, weight]) => ({
      name: 'Medeo Sans',
      data: await fs.readFile(path.join(process.cwd(), `src/assets/og/MedeoSans-${file}.ttf`)),
      weight,
      style: 'normal' as const,
    })),
  ));

const h = (type: string, style: Record<string, unknown>, children?: unknown) => ({ type, props: { style, children } });

export interface CoverInput {
  title: string;
  category: string;
  categoryName: string;
  section: string; // "Статьи" / "Articles"
  minutes?: string; // "3 мин чтения"
}

export async function renderCover({ title, category, categoryName, section, minutes }: CoverInput, width = 1600, height = 900) {
  const [bg, tint] = PALETTE[category] ?? FALLBACK;
  const k = width / 1600; // everything is designed at 1600 wide
  const pad = 88 * k;
  const numeral = title.match(/\d+/)?.[0] ?? title.trim().charAt(0).toUpperCase();
  const len = title.length;
  const titleSize = (len > 60 ? 76 : len > 40 ? 88 : 100) * k;

  // hairline grid: vertical lines every 1/6 of the width
  const lines = Array.from({ length: 5 }, (_, i) =>
    h('div', { position: 'absolute', top: 0, bottom: 0, left: ((i + 1) * width) / 6, width: 1, background: 'rgba(255,255,255,0.07)' }),
  );

  const tree = h('div', { width, height, display: 'flex', position: 'relative', background: bg, fontFamily: 'Medeo Sans', color: '#fff', overflow: 'hidden' }, [
    ...lines,
    // big numeral, bleeding off the right edge
    h('div', {
      position: 'absolute', right: -30 * k, bottom: -210 * k, display: 'flex',
      fontSize: (numeral.length > 1 ? 620 : 760) * k, fontWeight: 600, lineHeight: 1, letterSpacing: -30 * k, color: tint,
    }, numeral),
    h('div', { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: pad }, [
      h('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 30 * k }, [
        h('div', { display: 'flex', alignItems: 'center', gap: 16 * k }, [
          h('div', { width: 26 * k, height: 26 * k, borderRadius: '50%', border: `${5 * k}px solid #1268ff`, background: '#fff' }),
          h('div', { display: 'flex', fontWeight: 600 }, SITE.name),
          h('div', { display: 'flex', opacity: 0.6 }, `/ ${section}`),
        ]),
        h('div', { display: 'flex', padding: `${10 * k}px ${22 * k}px`, border: '2px solid rgba(255,255,255,0.35)', borderRadius: 999, fontSize: 26 * k }, categoryName),
      ]),
      h('div', { display: 'flex', flexDirection: 'column', gap: 28 * k, maxWidth: 1080 * k }, [
        h('div', { display: 'flex', fontSize: titleSize, fontWeight: 600, lineHeight: 1.04, letterSpacing: -2.5 * k }, title),
        minutes ? h('div', { display: 'flex', fontSize: 28 * k, opacity: 0.65 }, minutes) : null,
      ].filter(Boolean)),
    ]),
  ]);

  const svg = await satori(tree as any, { width, height, fonts: await loadFonts() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
}
