import matter from "gray-matter";
import { z } from "zod";
import { logger } from "../lib/logger.js";
import { DEFAULT_AUTHOR, getAuthor } from "./authors.js";
import { resolveImage } from "./media.js";
import { destinationSlug, isValidSlug } from "./slug.js";
import type { BlogPostMeta, FaqItem, ImageAsset, KeyFact } from "./types.js";

/** Destination names the blog may attach an article to (mirrors the provider list). */
export const KNOWN_DESTINATION_NAMES = [
  "Albánie",
  "Bulharsko",
  "Černá Hora",
  "Chorvatsko",
  "Itálie",
  "Řecko",
  "Španělsko",
  "Turecko",
];

const MAX_TITLE = 65;
const MIN_DESCRIPTION = 70;
const MAX_DESCRIPTION = 180;
/** Czech long-form reading speed, words per minute. */
const WORDS_PER_MINUTE = 190;

const dateish = z
  .union([z.string(), z.date()])
  .optional()
  .transform((value) => {
    if (!value) return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
    }
    const raw = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
  });

const nullableString = z
  .string()
  .nullish()
  .transform((value) => value?.trim() || null);

const imageSchema = z.object({
  src: z.string().min(1),
  alt: z.string().default(""),
  credit: nullableString,
  creditUrl: nullableString,
  focalPoint: nullableString,
});

const keyFactSchema = z.union([
  z.object({ label: z.string().min(1), value: z.string().min(1) }),
  z.string().min(3),
]);

const faqSchema = z.union([
  z.object({ question: z.string().min(3), answer: z.string().min(3) }),
  z.object({ q: z.string().min(3), a: z.string().min(3) }),
]);

const frontmatterSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  /** Legacy key kept for posts written before the v2 content model. */
  perex: z.string().optional(),
  destination: z.string().nullish(),
  tags: z.array(z.string()).default([]),
  publishedAt: dateish,
  /** Legacy alias of publishedAt. */
  published: dateish,
  updatedAt: dateish,
  updated: dateish,
  draft: z.union([z.boolean(), z.string()]).optional(),
  coverImage: imageSchema.optional(),
  /** Legacy string cover. */
  cover: z.string().optional(),
  hero: imageSchema.optional(),
  author: z.string().optional(),
  reviewedBy: z.string().optional(),
  keyFacts: z.array(keyFactSchema).default([]),
  faq: z.array(faqSchema).default([]),
  related: z.array(z.string()).default([]),
  aliases: z.array(z.string()).default([]),
  canonical: z.string().optional(),
  noindex: z.boolean().optional(),
});

export type ParsedPost = {
  meta: BlogPostMeta;
  /** Raw markdown body, still unrendered. */
  body: string;
};

export type ParseFailure = { ok: false; reason: string };
export type ParseSuccess = { ok: true; post: ParsedPost };

function normalizeKeyFacts(items: unknown[]): KeyFact[] {
  const out: KeyFact[] = [];
  for (const item of items) {
    const parsed = keyFactSchema.safeParse(item);
    if (!parsed.success) continue;
    if (typeof parsed.data === "string") {
      const idx = parsed.data.indexOf(":");
      if (idx < 1) continue;
      out.push({
        label: parsed.data.slice(0, idx).trim(),
        value: parsed.data.slice(idx + 1).trim(),
      });
    } else {
      out.push({ label: parsed.data.label.trim(), value: parsed.data.value.trim() });
    }
  }
  return out.slice(0, 6);
}

function normalizeFaq(items: unknown[]): FaqItem[] {
  const out: FaqItem[] = [];
  for (const item of items) {
    const parsed = faqSchema.safeParse(item);
    if (!parsed.success) continue;
    const data = parsed.data;
    out.push(
      "question" in data
        ? { question: data.question.trim(), answer: data.answer.trim() }
        : { question: data.q.trim(), answer: data.a.trim() },
    );
  }
  return out.slice(0, 8);
}

function canonicalDestination(name: string | null | undefined): string | null {
  if (!name) return null;
  const slug = destinationSlug(name);
  return KNOWN_DESTINATION_NAMES.find((known) => destinationSlug(known) === slug) ?? null;
}

/** Count words in the markdown source, ignoring syntax noise. */
export function countWords(markdown: string): number {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`|-]/g, " ");
  return plain.split(/\s+/).filter(Boolean).length;
}

export function readingMinutesFor(wordCount: number): number {
  // Round up: understating reading time is a worse error than overstating it.
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

/** First paragraph of the body, used when frontmatter has no description. */
function deriveDescription(body: string): string {
  const paragraph = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .find((block) => block.length > 0 && !block.startsWith("#") && !block.startsWith("---"));
  const plain = (paragraph ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= MAX_DESCRIPTION) return plain;
  const cut = plain.slice(0, MAX_DESCRIPTION - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > MIN_DESCRIPTION ? lastSpace : cut.length).trimEnd()}…`;
}

function toImageAsset(value: unknown): ImageAsset | null {
  if (typeof value === "string" && value.trim()) {
    return { src: value.trim(), alt: "", credit: null, creditUrl: null };
  }
  return null;
}

/**
 * Parse one markdown document into a validated post. Returns a failure instead
 * of throwing so a single broken file cannot take the blog down.
 */
export function parseBlogPostFile(slug: string, raw: string): ParseSuccess | ParseFailure {
  if (!isValidSlug(slug)) return { ok: false, reason: "invalid-slug" };

  let parsed: ReturnType<typeof matter>;
  try {
    parsed = matter(raw);
  } catch (err) {
    logger.warn({ err, slug }, "[blog] frontmatter parse failed");
    return { ok: false, reason: "frontmatter-parse" };
  }

  const result = frontmatterSchema.safeParse(parsed.data ?? {});
  if (!result.success) {
    logger.warn(
      { slug, issues: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
      "[blog] invalid frontmatter — skipping",
    );
    return { ok: false, reason: "frontmatter-invalid" };
  }
  const data = result.data;
  const body = parsed.content.trim();

  const title = data.title.trim();
  if (title.length > MAX_TITLE) {
    logger.warn({ slug, length: title.length }, `[blog] title longer than ${MAX_TITLE} chars`);
  }

  const description = (data.description ?? data.perex ?? "").trim() || deriveDescription(body);
  if (description.length > MAX_DESCRIPTION) {
    logger.warn(
      { slug, length: description.length },
      `[blog] description longer than ${MAX_DESCRIPTION} chars`,
    );
  } else if (description.length < MIN_DESCRIPTION) {
    logger.warn(
      { slug, length: description.length },
      `[blog] description shorter than ${MIN_DESCRIPTION} chars`,
    );
  }

  let destinationCzechName: string | null = null;
  if (data.destination) {
    destinationCzechName = canonicalDestination(data.destination);
    if (!destinationCzechName) {
      logger.warn({ slug, destination: data.destination }, "[blog] unknown destination — ignoring");
    }
  }

  const publishedAt = data.publishedAt ?? data.published ?? new Date().toISOString().slice(0, 10);
  const updatedAt = data.updatedAt ?? data.updated ?? null;
  const draft =
    data.draft === true || (typeof data.draft === "string" && data.draft.toLowerCase() === "true");

  const coverAsset = data.coverImage ?? toImageAsset(data.cover) ?? null;
  const cover = resolveImage(coverAsset, title);
  const hero = resolveImage(data.hero, title);

  const author = getAuthor(data.author) ?? DEFAULT_AUTHOR;
  const reviewedBy = getAuthor(data.reviewedBy);

  const wordCount = countWords(body);

  const meta: BlogPostMeta = {
    slug,
    title,
    description,
    destinationCzechName,
    tags: [...new Set(data.tags.map((tag) => tag.trim()).filter(Boolean))],
    publishedAt,
    updatedAt: updatedAt && updatedAt !== publishedAt ? updatedAt : null,
    draft,
    cover,
    hero,
    author,
    reviewedBy,
    keyFacts: normalizeKeyFacts(data.keyFacts),
    faq: normalizeFaq(data.faq),
    // Aliases are stored in the canonical trailing-slash form the router looks up.
    aliases: [
      ...new Set(
        data.aliases
          .map((alias) => alias.trim())
          .filter(Boolean)
          .map((alias) => {
            const path = alias.startsWith("/") ? alias : `/${alias}`;
            return path.endsWith("/") ? path : `${path}/`;
          })
          .filter((alias) => alias !== `/blog/${slug}/`),
      ),
    ],
    canonicalPath: data.canonical?.trim() || null,
    noindex: data.noindex === true,
    readingMinutes: readingMinutesFor(wordCount),
    wordCount,
    relatedSlugs: data.related.map((value) => value.trim()).filter(Boolean),
  };

  return { ok: true, post: { meta, body } };
}

/** Backwards-compatible helper: parse and return only the meta when possible. */
export function parseBlogMeta(slug: string, raw: string): BlogPostMeta | null {
  const parsed = parseBlogPostFile(slug, raw);
  return parsed.ok ? parsed.post.meta : null;
}
