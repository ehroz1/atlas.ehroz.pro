import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
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
    /** partner (affiliate) link. When set, "Open site" goes here, with
        rel="sponsored" and a visible "Partner link" mark on the card and page */
    affiliateUrl: z.url().optional(),
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
    /** the author's own short remark, shown on the card and the page; your voice, 1–2 sentences */
    note: localized.optional(),
  }),
});

/**
 * Articles: src/content/articles/<slug>/<lang>.md, one file per language.
 * Both languages are required (src/lib/articles.ts checks it). Written by
 * the pipeline in scripts/articles/ and reviewed by a person in a PR.
 */
const articles = defineCollection({
  loader: glob({ pattern: '*/*.md', base: 'src/content/articles' }),
  schema: z.object({
    /** H1 and the base of <title>; the brand is added when it fits */
    title: z.string().max(70),
    /** meta description, 50–160 characters */
    description: z.string().min(50).max(160),
    type: z.enum(['listicle', 'comparison', 'alternatives', 'howto', 'news']),
    primaryKeyword: z.string(),
    secondaryKeywords: z.array(z.string()).default([]),
    /** tool ids from tools.json, shown as cards after the text (at least 3) */
    tools: z.array(z.string()).min(3),
    categories: z.array(z.string()).min(1),
    published: z.coerce.date(),
    /** date the text last changed (sitemap lastmod) */
    updated: z.coerce.date(),
    /** why this topic was picked: the trend signal */
    trendSource: z.string().optional(),
    /** pages used for fact-checking */
    sources: z.array(z.url()).default([]),
    /** set by the person who reviewed and merged it */
    reviewedBy: z.string().optional(),
    /** drafts are not built */
    draft: z.boolean().default(false),
  }),
});

export const collections = { categories, tools, articles };
