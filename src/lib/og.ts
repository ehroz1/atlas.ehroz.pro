/**
 * Open Graph images (1200 × 630), drawn at build time.
 * Layout with satori (text becomes vector paths, so no fonts are needed
 * on the build machine), rasterised to JPEG with sharp.
 *
 * Fonts: static instances of Medeo Sans in src/assets/og/ (satori can't
 * read woff2 or variable fonts). Made from MedeoSansVariable.woff2 with
 * fontTools' instancer: Medium = wght 500 / opsz 32, Regular = wght 400 / opsz 18.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import satori from 'satori';
import sharp from 'sharp';

export const OG_W = 1200;
export const OG_H = 630;

// colors from the design tokens in atlas.css (--gray-1000, --gray-950, --gray-0, --gray-300, --gray-400)
const C = { bg: '#0d0d0d', surface: '#141414', line: '#222222', text: '#ffffff', text2: '#b0b0b0', text3: '#8c8c8c' };

const root = process.cwd();
let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 500; style: 'normal' }[]> | undefined;
const loadFonts = () =>
  (fonts ??= Promise.all([
    readFile(join(root, 'src/assets/og/MedeoSans-Regular.ttf')).then((data) => ({ name: 'Medeo Sans', data, weight: 400 as const, style: 'normal' as const })),
    readFile(join(root, 'src/assets/og/MedeoSans-Medium.ttf')).then((data) => ({ name: 'Medeo Sans', data, weight: 500 as const, style: 'normal' as const })),
  ]));

type Node = { type: string; props: Record<string, any> };
const h = (type: string, style: Record<string, any>, ...children: (Node | string | false | undefined)[]): Node => ({
  type,
  props: { style: { display: 'flex', ...style }, children: children.filter(Boolean) },
});
const img = (src: string, style: Record<string, any>): Node => ({ type: 'img', props: { src, style } });

/** A screenshot from src/assets/shots, cropped from the top to `w × h`, as a data URI. */
export async function shotData(id: string, w: number, hgt: number) {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    try {
      const buf = await readFile(join(root, 'src/assets/shots', `${id}.${ext}`));
      const out = await sharp(buf).resize(w, hgt, { fit: 'cover', position: 'top' }).jpeg({ quality: 82 }).toBuffer();
      return `data:image/jpeg;base64,${out.toString('base64')}`;
    } catch {
      /* try the next extension */
    }
  }
  return undefined;
}

const LOGO =
  'data:image/svg+xml;base64,' +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"><path d="M18.6 3.6c6 1.2 9.9 6.6 9.4 12.7-.5 6.6-6 11.6-12.7 11.3C8.7 27.3 3.8 21.7 4.1 15.1 4.5 8.7 9.8 3.7 16.2 3.5c.8 0 1.6 0 2.4.1"/><path d="M13.2 4.4c-2.8 4-3.7 9.1-2.4 13.9 1 3.7 3.2 6.9 6 9.1"/><path d="M4.8 14.2c4 2 8.9 3.1 13.9 2.6 3.4-.3 6.5-1.2 9.2-2.7"/><path d="M18.4 7.6c1.6-.5 3.3.1 3.9 1.3.5 1-.3 1.8 0 2.7.3.8 1.4 1.1 1.3 2-.1.8-1.4 1-2.4.6-1-.4-1.4-1.4-2.4-1.6-.9-.2-1.9.1-2.4-.6-.7-1.1-.1-3.6 2-4.4Z"/></svg>`,
  ).toString('base64');

const brand = () =>
  h('div', { alignItems: 'center', gap: 14, fontSize: 30, color: C.text },
    img(LOGO, { width: 40, height: 40 }),
    h('div', {}, 'Atlas', h('span', { color: C.text3 }, '.ehroz.pro')),
  );

async function render(tree: Node) {
  const svg = await satori(tree as any, { width: OG_W, height: OG_H, fonts: await loadFonts() });
  return sharp(Buffer.from(svg)).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
}

/** One site: name, summary and facts on the left, its screenshot running off the right edge. */
export async function toolImage(o: { id: string; name: string; summary: string; domain: string; facts: string[] }) {
  const SHOT_W = 680;
  const SHOT_H = 425; // 16:10
  const shot = await shotData(o.id, SHOT_W * 2, SHOT_H * 2);
  const nameSize = o.name.length > 18 ? 60 : o.name.length > 12 ? 72 : 84;
  return render(
    h('div', { width: OG_W, height: OG_H, background: C.bg, fontFamily: 'Medeo Sans', color: C.text, position: 'relative' },
      h('div', { position: 'absolute', left: 620, top: 102, width: SHOT_W, height: SHOT_H, borderRadius: 24, overflow: 'hidden', background: C.surface, border: `1px solid ${C.line}` },
        shot
          ? img(shot, { width: SHOT_W, height: SHOT_H, objectFit: 'cover' })
          : h('div', { width: SHOT_W, height: SHOT_H, alignItems: 'center', justifyContent: 'center', fontSize: 44, color: C.text2 }, o.domain),
      ),
      h('div', { position: 'absolute', left: 72, top: 64, bottom: 64, width: 500, flexDirection: 'column', justifyContent: 'space-between' },
        brand(),
        h('div', { flexDirection: 'column', gap: 22 },
          h('div', { fontSize: nameSize, fontWeight: 500, lineHeight: 1.02, letterSpacing: -2 }, o.name),
          h('div', { fontSize: 32, lineHeight: 1.3, color: C.text2 }, o.summary),
        ),
        h('div', { fontSize: 24, color: C.text3, gap: 14 }, [o.domain, ...o.facts].join('  ·  ')),
      ),
    ),
  );
}

/** Home and the other pages: a band of screenshots and one line. */
export async function siteImage(o: { title: string; sub: string; shots: string[] }) {
  const W = 360, H = 225, GAP = 20;
  const tiles = await Promise.all(o.shots.slice(0, 8).map((id) => shotData(id, W * 2, H * 2)));
  const row = (list: (string | undefined)[], offset: number) =>
    h('div', { gap: GAP, marginLeft: offset },
      ...list.map((src) =>
        h('div', { width: W, height: H, borderRadius: 18, overflow: 'hidden', background: C.surface, flex: 'none' },
          src ? img(src, { width: W, height: H, objectFit: 'cover' }) : undefined,
        ),
      ),
    );
  return render(
    h('div', { width: OG_W, height: OG_H, background: C.bg, fontFamily: 'Medeo Sans', color: C.text, flexDirection: 'column', position: 'relative', overflow: 'hidden' },
      h('div', { position: 'absolute', top: 40, left: 0, flexDirection: 'column', gap: GAP },
        row(tiles.slice(0, 4), -120),
        row(tiles.slice(4, 8), -300),
      ),
      h('div', { position: 'absolute', left: 0, right: 0, bottom: 0, height: 210, background: C.bg, borderTop: `1px solid ${C.line}`, padding: '0 72px', alignItems: 'center', justifyContent: 'space-between' },
        h('div', { flexDirection: 'column', gap: 10 },
          h('div', { fontSize: 56, fontWeight: 500, letterSpacing: -1.5 }, o.title),
          h('div', { fontSize: 28, color: C.text2 }, o.sub),
        ),
        brand(),
      ),
    ),
  );
}
