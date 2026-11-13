import type { ImageMetadata } from 'astro';

/** Screenshots captured by `npm run shots`, keyed by tool id. */
const files = import.meta.glob<{ default: ImageMetadata }>('../assets/shots/*.{jpg,jpeg,png,webp}', { eager: true });

const byId = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(files)) {
  const id = path.split('/').pop()!.replace(/\.\w+$/, '');
  byId.set(id, mod.default);
}

export function shotFor(id: string): ImageMetadata | undefined {
  return byId.get(id);
}
