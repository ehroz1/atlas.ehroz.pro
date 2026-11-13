import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

/** A string that has an English value and optionally other languages. */
const localized = z.object({ en: z.string(), ru: z.string().optional() });

const categories = defineCollection({
  loader: file('src/data/categories.json'),
  schema: z.object({
    order: z.number(),
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
    featured: z.boolean().default(false),
    /** one line for cards, ~60 characters */
    summary: localized,
    /** 1–3 sentences for the tool page */
    description: localized,
  }),
});

export const collections = { categories, tools };
