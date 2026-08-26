import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { marked } from "marked";
import { logger } from "../lib/logger.js";
import { destinationSlug, isValidSlug } from "./slug.js";
import { BLOG_PAGE_SIZE, buildHubSlug, type BlogPost, type BlogPostMeta } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BLOG_CONTENT_DIR = path.resolve(__dirname, "../../content/blog");

// Mirrors KNOWN_DESTINATIONS in providers/destinationStore.ts — kept as a plain
// list so the blog layer stays free of Prisma/DB dependencies.
const KNOWN_DESTINATION_NAMES = [
  "Bulharsko",
  "Chorvatsko",
  "Itálie",
  "Albánie",
  "Černá Hora",
  "Řecko",
  "Turecko",
  "Španělsko",
];

const MAX_TITLE_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 160;
const MAX_CACHED_BODIES = 200;

type RawFrontmatter = {
  title?: unknown;
  description?: unknown;
  destination?: unknown;
  tags?: unknown;
  published?: unknown;
  updated?: unknown;
  draft?: unknown;
  cover?: unknown;
};

/** Minimal bounded LRU used for parsed markdown bodies. */
class LruMap<K, V> {
  private map = new Map<K, V>();
  constructor(private readonly max: number) {}
  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    if (value === undefined) return undefined;
    this.map.delete(key);
    this.map.set(key, value); // refresh recency
    return value;
  }
  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, value);
  }
}

const bodyCache = new LruMap<string, string>(MAX_CACHED_BODIES);
const bodyMtime = new Map<string, number>();

function asTrimmedString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** gray-matter parses unquoted YAML dates into Date objects — accept both forms. */
function parseIsoDate(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  const raw = asTrimmedString(value);
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((tag): tag is string => typeof tag === "string")
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Parse and validate one markdown document; returns null when the file is unusable. */
export function parseBlogPost(slug: string, raw: string): BlogPost | null {
  if (!isValidSlug(slug)) {
    logger.warn({ slug }, "[blog] invalid slug in filename — skipping");
    return null;
  }

  let parsed: ReturnType<typeof matter>;
  try {
    parsed = matter(raw);
  } catch (err) {
    logger.warn({ err, slug }, "[blog] frontmatter parse failed");
    return null;
  }
  const data = (parsed.data ?? {}) as RawFrontmatter;

  const title = asTrimmedString(data.title);
  if (!title) {
    logger.warn({ slug }, "[blog] missing title — skipping");
    return null;
  }
  if (title.length > MAX_TITLE_LENGTH) {
    logger.warn(
      { slug, length: title.length },
      `[blog] title longer than ${MAX_TITLE_LENGTH} chars`,
    );
  }
  const description = asTrimmedString(data.description) ?? "";
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    logger.warn(
      { slug, length: description.length },
      `[blog] description longer than ${MAX_DESCRIPTION_LENGTH} chars`,
    );
  }

  let destinationCzechName: string | null = null;
  const destination = asTrimmedString(data.destination);
  if (destination) {
    // Slug-level comparison makes this case- and diacritic-insensitive ("Recko" == "Řecko").
    const hubSlug = destinationSlug(destination);
    const match = KNOWN_DESTINATION_NAMES.find((name) => destinationSlug(name) === hubSlug);
    if (!match) {
      logger.warn({ slug, destination }, "[blog] unknown destination — ignoring field");
    } else {
      destinationCzechName = match;
    }
  }

  const publishedAt = parseIsoDate(data.published) ?? new Date().toISOString().slice(0, 10);
  const updatedAt = parseIsoDate(data.updated);
  const draft =
    data.draft === true || (typeof data.draft === "string" && data.draft.toLowerCase() === "true");

  const html = marked.parse(parsed.content.trim(), { async: false }) as string;
  const readingMinutes = Math.max(
    1,
    Math.round(
      html
        .replace(/<[^>]+>/g, " ")
        .split(/\s+/)
        .filter(Boolean).length / 200,
    ),
  );

  return {
    slug,
    title,
    description,
    destinationCzechName,
    tags: parseTags(data.tags),
    publishedAt,
    updatedAt,
    draft,
    coverImage: asTrimmedString(data.cover),
    readingMinutes,
    html,
  };
}

function readWithCache(slug: string, mtimeMs: number): string | null {
  const cached = bodyCache.get(slug);
  if (cached !== undefined && bodyMtime.get(slug) === mtimeMs) return cached;
  try {
    const raw = fs.readFileSync(path.join(BLOG_CONTENT_DIR, `${slug}.md`), "utf8");
    bodyCache.set(slug, raw);
    bodyMtime.set(slug, mtimeMs);
    return raw;
  } catch {
    bodyMtime.delete(slug);
    return null;
  }
}

type FileEntry = { slug: string; mtimeMs: number };

function listMarkdownFiles(): FileEntry[] {
  try {
    return fs
      .readdirSync(BLOG_CONTENT_DIR)
      .filter((name) => name.endsWith(".md"))
      .map((name) => ({
        slug: name.slice(0, -3),
        mtimeMs: fs.statSync(path.join(BLOG_CONTENT_DIR, name)).mtimeMs,
      }));
  } catch {
    return [];
  }
}

function sortPosts<T extends BlogPostMeta>(posts: T[]): T[] {
  return [...posts].sort(
    (a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug),
  );
}

function directoryFingerprint(files: FileEntry[]): string {
  return files.map((f) => `${f.slug}:${Math.round(f.mtimeMs)}`).join("|");
}

function loadSinglePost(slug: string, mtimeMs: number): BlogPost | null {
  const raw = readWithCache(slug, mtimeMs);
  return raw === null ? null : parseBlogPost(slug, raw);
}

let indexFingerprint = "";
let indexCache: BlogPostMeta[] | null = null;

/**
 * All published posts, newest first. Rebuilds the metadata index whenever any
 * markdown file's mtime changes (cheap stat scan; bodies stay LRU-cached).
 */
export function listPublishedPosts(): BlogPostMeta[] {
  const files = listMarkdownFiles();
  const fingerprint = directoryFingerprint(files);
  if (indexCache && fingerprint === indexFingerprint) return indexCache;

  const seen = new Set<string>();
  const posts: BlogPostMeta[] = [];
  for (const file of files) {
    const post = loadSinglePost(file.slug, file.mtimeMs);
    if (!post || post.draft) continue;
    if (seen.has(post.slug)) {
      logger.warn({ slug: post.slug }, "[blog] duplicate slug across filenames — keeping first");
      continue;
    }
    seen.add(post.slug);
    const { html: _html, ...meta } = post;
    posts.push(meta);
  }
  indexCache = sortPosts(posts);
  indexFingerprint = fingerprint;
  return indexCache;
}

/** One published post with rendered HTML, or null when missing/draft. */
export function getPublishedPost(slug: string): BlogPost | null {
  if (!isValidSlug(slug)) return null;
  const file = listMarkdownFiles().find((f) => f.slug === slug);
  if (!file) return null;
  const post = loadSinglePost(slug, file.mtimeMs);
  return post && !post.draft ? post : null;
}

export function listPostsByDestination(czechName: string): BlogPostMeta[] {
  return listPublishedPosts().filter((post) => post.destinationCzechName === czechName);
}

export type DestinationHubSummary = {
  czechName: string;
  slug: string;
  count: number;
};

/** Destinations that have at least one published article, alphabetical by Czech name. */
export function listDestinationHubs(): DestinationHubSummary[] {
  const counts = new Map<string, number>();
  for (const post of listPublishedPosts()) {
    if (!post.destinationCzechName) continue;
    counts.set(post.destinationCzechName, (counts.get(post.destinationCzechName) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([czechName, count]) => ({ czechName, count, slug: buildHubSlug(czechName) }))
    .sort((a, b) => a.czechName.localeCompare(b.czechName, "cs"));
}

/** Paginated listing slice. `page` is 1-based and clamped into range. */
export function paginatePosts(
  posts: BlogPostMeta[],
  page: number,
): { items: BlogPostMeta[]; page: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(posts.length / BLOG_PAGE_SIZE));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (current - 1) * BLOG_PAGE_SIZE;
  return { items: posts.slice(start, start + BLOG_PAGE_SIZE), page: current, totalPages };
}
