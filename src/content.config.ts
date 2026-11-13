import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

/** A string that has an English value and optionally other languages. */
const localized = z.object({ en: z.string(), ru: z.string().optional() });

const categories = defineCollection({
  loader: file('src/data/categories.json'),
  schema: z.object({
    order: z.number(),
    /** date the category text last changed (sitemap lastmod) */
    updated: z.coerce.date(),
    name: localized,
    description: localized,
  }),
});

const tools = defineCollection({
  loader: file('src/data/tools.json'),
  schema: z.object({
    name: z.string(),
    url: z.url(),
    category: z.string(),
    pricing: z.enum(['free', 'freemium', 'paid']),
    openSource: z.boolean().default(false),
    platforms: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    added: z.coerce.date(),
    /** date the page text last changed (sitemap lastmod, og:updated_time); defaults to `added` */
    updated: z.coerce.date().optional(),
    featured: z.boolean().default(false),
    /** the owner's own sites: placed near the top of the home grid, see Gallery.astro */
    own: z.boolean().default(false),
    /** one line for cards, ~60 characters */
    summary: localized,
    /** 1–3 sentences for the tool page */
    description: localized,
  }),
});

export const collections = { categories, tools };
