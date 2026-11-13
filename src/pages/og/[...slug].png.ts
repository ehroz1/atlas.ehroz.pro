/**
 * Open Graph covers, 1200×630, rendered at build time with satori + resvg.
 * Tools: name, summary, domain and the screenshot.
 * Other pages: heading, description and three screenshots. One image per language.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { getPages, type PageEntry } from '~/lib/routes';
import { getTools, domainOf } from '~/lib/data';
import { cutByWord } from '~/lib/seo';
import { SITE } from '~/site.config';
import { langs, loc, type Lang } from '~/i18n';

type Item = { kind: 'tool' | 'page'; page: PageEntry; lang: Lang };

export const getStaticPaths: GetStaticPaths = async () => {
  const pages = await getPages();
  const seen = new Set<string>();
  const out: { params: { slug: string }; props: Item }[] = [];
  for (const page of pages)
    for (const lang of langs) {
      const slug = page.og[lang].replace(/^og\//, '');
      if (seen.has(slug)) continue;
      seen.add(slug);
      out.push({ params: { slug }, props: { kind: page.kind === 'tool' ? 'tool' : 'page', page, lang } });
    }
  return out;
};

const root = process.cwd();
let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 600; style: 'normal' }[]> | undefined;
const loadFonts = () =>
  (fonts ??= Promise.all(
    ([['Regular', 400], ['SemiBold', 600]] as const).map(async ([file, weight]) => ({
      name: 'Medeo Sans',
      data: await fs.readFile(path.join(root, `src/assets/og/MedeoSans-${file}.ttf`)),
      weight,
      style: 'normal' as const,
    })),
  ));

const shotCache = new Map<string, Promise<string | null>>();
function shot(id: string, width: number) {
  const key = `${id}@${width}`;
  if (!shotCache.has(key))
    shotCache.set(
      key,
      fs
        .readFile(path.join(root, `src/assets/shots/${id}.jpg`))
        .then(async (buf) => 'data:image/jpeg;base64,' + (await sharp(buf).resize(width).jpeg({ quality: 80 }).toBuffer()).toString('base64'))
        .catch(() => null),
    );
  return shotCache.get(key)!;
}

const h = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}) => ({
  type,
  props: { style, children, ...extra },
});

const BG = '#0d0d0d';
const INK = '#ffffff';
const MUTED = '#a3a3a3';
const BLUE = '#2f5bea';

const brandRow = () =>
  h('div', { display: 'flex', alignItems: 'center', gap: 14, fontSize: 30, color: INK, fontWeight: 600 }, [
    h('div', { width: 22, height: 22, borderRadius: 11, border: `4px solid ${BLUE}` }),
    h('div', { display: 'flex' }, SITE.name),
    h('div', { display: 'flex', color: MUTED, fontWeight: 400 }, SITE.host.slice(SITE.name.length)),
  ]);

async function toolCard(page: PageEntry, lang: Lang) {
  const tool = page.tool!;
  const img = await shot(tool.id, 640);
  return h('div', { width: 1072, height: 502, display: 'flex', background: BG, fontFamily: 'Medeo Sans', padding: 64, gap: 48 }, [
    h('div', { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 460 }, [
      brandRow(),
      h('div', { display: 'flex', flexDirection: 'column', gap: 20 }, [
        h('div', { display: 'flex', fontSize: tool.data.name.length > 14 ? 60 : 76, fontWeight: 600, color: INK, lineHeight: 1.05 }, tool.data.name),
        h('div', { display: 'flex', fontSize: 30, color: MUTED, lineHeight: 1.3 }, cutByWord(loc(tool.data.summary, lang), 90)),
      ]),
      h('div', { display: 'flex', fontSize: 28, color: BLUE }, domainOf(tool.data.url) + ' ↗'),
    ]),
    img
      ? h('div', { display: 'flex', flex: 1, alignItems: 'center' }, [
          h('img', { width: 564, height: 352, borderRadius: 16, objectFit: 'cover', border: '1px solid #333' }, undefined, { src: img, width: 564, height: 352 }),
        ])
      : h('div', { display: 'flex', width: 564, height: 352, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: MUTED, border: '1px solid #333', borderRadius: 16 }, domainOf(tool.data.url)),
  ]);
}

async function pageCard(page: PageEntry, lang: Lang) {
  const tools = await getTools();
  const pool = page.category ? tools.filter((x) => x.data.category === page.category!.id) : tools;
  const imgs = (await Promise.all(pool.slice(0, 6).map((x) => shot(x.id, 400)))).filter(Boolean).slice(0, 3) as string[];
  return h('div', { width: 1072, height: 502, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: BG, fontFamily: 'Medeo Sans', padding: 64 }, [
    brandRow(),
    h('div', { display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1000 }, [
      h('div', { display: 'flex', fontSize: 64, fontWeight: 600, color: INK, lineHeight: 1.08 }, cutByWord(page.heading[lang], 60)),
      h('div', { display: 'flex', fontSize: 28, color: MUTED, lineHeight: 1.35 }, cutByWord(page.description[lang], 120)),
    ]),
    h('div', { display: 'flex', gap: 24 }, imgs.map((src) => h('img', { width: 336, height: 180, borderRadius: 12, objectFit: 'cover', objectPosition: 'top', border: '1px solid #333' }, undefined, { src, width: 336, height: 180 }))),
  ]);
}

export const GET: APIRoute = async ({ props }) => {
  const { kind, page, lang } = props as Item;
  const tree = kind === 'tool' ? await toolCard(page, lang) : await pageCard(page, lang);
  // satori boxes are content-box: 1072×502 + 64px padding = 1200×630
  const svg = await satori(tree as any, { width: 1200, height: 630, fonts: await loadFonts() });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
