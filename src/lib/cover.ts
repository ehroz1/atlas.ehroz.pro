/**
 * Article covers, drawn at build time (satori → resvg → PNG).
 *
 * Used when an article has no cover of its own. Same look as the
 * illustrated covers: black field, cream "paper", one accent colour by
 * category, halftone dots, crosshairs, rulers and a globe mark; the title
 * sits on a tilted paper card, the number from the title (or its first
 * letter) is printed big and slightly out of register.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { SITE } from '~/site.config';

/** One accent per category, from the four the reference covers use. */
const GREEN = '#3dbb78', BLUE = '#2f5cff', CORAL = '#f06a5a', AMBER = '#f0a830';
const ACCENT: Record<string, string> = {
  ai: GREEN, development: GREEN, productivity: GREEN, utilities: GREEN, learning: GREEN, 'file-converters': GREEN,
  typography: BLUE, design: BLUE, '3d-motion': BLUE, 'web-galleries': BLUE, inspiration: BLUE,
  assets: CORAL, museums: CORAL, 'video-audio': CORAL, branding: CORAL, mockups: CORAL,
  'design-generators': AMBER, 'icons-illustrations': AMBER,
};
const INK = '#111111';
const PAPER = '#efe8d8';

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

const svg = (w: number, h: number, body: string) =>
  'data:image/svg+xml;base64,' + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">${body}</svg>`).toString('base64');
const globe = (c: string) => svg(96, 96, `<g stroke="${c}" stroke-width="3"><circle cx="48" cy="48" r="44"/><ellipse cx="48" cy="48" rx="20" ry="44"/><path d="M4 48h88M10 26h76M10 70h76M48 4v88"/></g>`);
const cross = (c: string) => svg(64, 64, `<g stroke="${c}" stroke-width="2.5"><circle cx="32" cy="32" r="16"/><path d="M32 4v56M4 32h56"/></g>`);
const ruler = (c: string, w: number) =>
  svg(w, 40, `<g stroke="${c}" stroke-width="2.5"><path d="M0 38h${w}"/>${Array.from({ length: Math.floor(w / 18) + 1 }, (_, i) => `<path d="M${i * 18 + 1} 38v${i % 5 === 0 ? -34 : -18}"/>`).join('')}</g>`);
const dots = (c: string, w: number, h: number, step = 14) => {
  // halftone: dots shrink from left to right
  let b = '';
  for (let y = step / 2; y < h; y += step) for (let x = step / 2; x < w; x += step) {
    const r = (step / 2) * (1 - x / w) * 0.95;
    if (r > 0.6) b += `<circle cx="${x}" cy="${y}" r="${r.toFixed(2)}" fill="${c}"/>`;
  }
  return svg(w, h, b);
};

export async function renderCover({ title, category, categoryName, section, minutes }: CoverInput, width = 1600, height = 900) {
  const accent = ACCENT[category] ?? GREEN;
  const k = width / 1600; // designed at 1600×900
  const glyph = title.match(/\d+/)?.[0] ?? title.trim().charAt(0).toUpperCase();
  const len = title.length;
  const titleSize = (len > 60 ? 58 : len > 40 ? 66 : 76) * k;
  const img = (src: string, style: Record<string, unknown>) => ({ type: 'img', props: { src, style: { position: 'absolute', ...style } } });
  const abs = (style: Record<string, unknown>, children?: unknown) => h('div', { position: 'absolute', display: 'flex', ...style }, children);

  const tree = h('div', { width, height, display: 'flex', position: 'relative', background: INK, fontFamily: 'Medeo Sans', overflow: 'hidden' }, [
    // marks: globe, crosshairs, rulers
    img(globe(PAPER), { left: 56 * k, top: 52 * k, width: 96 * k, height: 96 * k }),
    img(cross(PAPER), { left: 760 * k, top: 40 * k, width: 64 * k, height: 64 * k }),
    img(cross(accent), { left: 300 * k, top: 150 * k, width: 64 * k, height: 64 * k }),
    img(cross(PAPER), { left: 52 * k, top: 430 * k, width: 64 * k, height: 64 * k }),
    img(cross(PAPER), { right: 52 * k, top: 430 * k, width: 64 * k, height: 64 * k }),
    img(cross(PAPER), { left: 52 * k, bottom: 40 * k, width: 64 * k, height: 64 * k }),
    img(cross(PAPER), { right: 52 * k, bottom: 40 * k, width: 64 * k, height: 64 * k }),
    img(ruler(PAPER, 320), { right: 64 * k, top: 52 * k, width: 320 * k, height: 40 * k }),
    img(ruler(PAPER, 280), { left: 170 * k, bottom: 52 * k, width: 280 * k, height: 40 * k }),

    // halftone field in the accent colour, behind the glyph
    img(dots(accent, 560, 520), { right: 150 * k, top: 170 * k, width: 560 * k, height: 520 * k, opacity: 0.85 }),

    // big glyph, printed twice slightly out of register
    abs({ right: 200 * k, top: 120 * k, fontSize: (glyph.length > 1 ? 500 : 600) * k, fontWeight: 600, lineHeight: 1, letterSpacing: -20 * k, color: accent }, glyph),
    abs({ right: 216 * k, top: 108 * k, fontSize: (glyph.length > 1 ? 500 : 600) * k, fontWeight: 600, lineHeight: 1, letterSpacing: -20 * k, color: PAPER }, glyph),

    // the title on a paper card with an accent shadow
    abs({ left: 186 * k, top: 326 * k, width: 800 * k, height: 400 * k, background: accent, transform: 'rotate(-2.5deg)' }),
    abs({ left: 160 * k, top: 300 * k, width: 800 * k, minHeight: 400 * k, background: PAPER, transform: 'rotate(-1.5deg)', flexDirection: 'column', justifyContent: 'space-between', padding: 44 * k, color: INK }, [
      h('div', { display: 'flex', justifyContent: 'space-between', fontSize: 24 * k, letterSpacing: 1, textTransform: 'uppercase' }, [
        h('div', { display: 'flex' }, `${SITE.name} / ${section}`),
        h('div', { display: 'flex' }, categoryName),
      ]),
      h('div', { display: 'flex', fontSize: titleSize, fontWeight: 600, lineHeight: 1.04, letterSpacing: -1.5 * k, marginTop: 24 * k }, title),
      minutes ? h('div', { display: 'flex', fontSize: 24 * k, marginTop: 24 * k, opacity: 0.7 }, minutes) : h('div', { display: 'flex' }),
    ]),
  ]);

  const out = await satori(tree as any, { width, height, fonts: await loadFonts() });
  return new Resvg(out, { fitTo: { mode: 'width', value: width } }).render().asPng();
}
