import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../lib/logger.js";
import { HUB_INTROS } from "./content.js";
import { parseBlogPostFile } from "./frontmatter.js";
import { renderMarkdown } from "./markdown.js";
import { destinationSlug, isValidSlug, slugifyCzechTitle } from "./slug.js";
import {
  BLOG_PAGE_SIZE,
  MIN_TAG_POSTS,
  type BlogPost,
  type BlogPostMeta,
  type DestinationHub,
  type TagSummary,
} from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BLOG_CONTENT_DIR = path.resolve(__dirname, "../../content/blog");

const MAX_CACHED_BODIES = 64;

type FileEntry = { slug: string; mtimeMs: number };

/** Minimal bounded LRU for fully rendered posts. */
class LruMap<K, V> {
  private map = new Map<K, V>();
  constructor(private readonly max: number) {}
  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value === undefined) return undefined;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }
  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, value);
  }
  clear(): void {
    this.map.clear();
  }
}

const postCache = new LruMap<string, { post: BlogPost; mtimeMs: number }>(MAX_CACHED_BODIES);

function listMarkdownFiles(): FileEntry[] {
  try {
    return fs
      .readdirSync(BLOG_CONTENT_DIR)
      .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
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

function loadPost(file: FileEntry): BlogPost | null {
  const cached = postCache.get(file.slug);
  if (cached && cached.mtimeMs === file.mtimeMs) return cached.post;
  let raw: string;
  try {
    raw = fs.readFileSync(path.join(BLOG_CONTENT_DIR, `${file.slug}.md`), "utf8");
  } catch (err) {
    logger.warn({ err, slug: file.slug }, "[blog] cannot read markdown file");
    return null;
  }
  const parsed = parseBlogPostFile(file.slug, raw);
  if (!parsed.ok) return null;
  const rendered = renderMarkdown(parsed.post.body);
  const post: BlogPost = {
    ...parsed.post.meta,
    html: rendered.html,
    toc: rendered.toc,
  };
  postCache.set(file.slug, { post, mtimeMs: file.mtimeMs });
  return post;
}

type BlogIndex = {
  fingerprint: string;
  published: BlogPostMeta[];
  aliases: Map<string, string>;
  tags: TagSummary[];
  hubs: DestinationHub[];
};

let indexCache: BlogIndex | null = null;

function fingerprintFor(files: FileEntry[]): string {
  return files.map((f) => `${f.slug}:${Math.round(f.mtimeMs)}`).join("|");
}

function buildTagIndex(posts: BlogPostMeta[]): TagSummary[] {
  const counts = new Map<string, { name: string; count: number }>();
  for (const post of posts) {
    for (const tag of post.tags) {
      const slug = slugifyCzechTitle(tag);
      if (!slug) continue;
      const existing = counts.get(slug);
      if (existing) existing.count += 1;
      else counts.set(slug, { name: tag, count: 1 });
    }
  }
  return [...counts.entries()]
    .map(([slug, value]) => ({ slug, name: value.name, count: value.count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "cs"));
}

function buildHubIndex(posts: BlogPostMeta[]): DestinationHub[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    if (!post.destinationCzechName) continue;
    counts.set(post.destinationCzechName, (counts.get(post.destinationCzechName) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([czechName, count]) => ({
      czechName,
      count,
      slug: destinationSlug(czechName),
      intro:
        HUB_INTROS[czechName] ??
        `Všechny články o destinaci ${czechName} — průvodce, tipy na výlety a rady před dovolenou.`,
    }))
    .sort((a, b) => a.czechName.localeCompare(b.czechName, "cs"));
}

function buildIndex(): BlogIndex {
  const files = listMarkdownFiles();
  const fingerprint = fingerprintFor(files);
  if (indexCache && indexCache.fingerprint === fingerprint) return indexCache;

  const seen = new Set<string>();
  const published: BlogPostMeta[] = [];
  const aliases = new Map<string, string>();

  for (const file of files) {
    const post = loadPost(file);
    if (!post) continue;
    if (post.draft) continue;
    if (seen.has(post.slug)) {
      logger.warn({ slug: post.slug }, "[blog] duplicate slug — keeping first");
      continue;
    }
    seen.add(post.slug);
    const { html: _html, toc: _toc, ...meta } = post;
    published.push(meta);
    for (const alias of meta.aliases) {
      if (aliases.has(alias)) {
        logger.warn({ alias, slug: meta.slug }, "[blog] duplicate alias — keeping first");
        continue;
      }
      aliases.set(alias, `/blog/${meta.slug}/`);
    }
  }

  const sorted = sortPosts(published);
  indexCache = {
    fingerprint,
    published: sorted,
    aliases,
    tags: buildTagIndex(sorted),
    hubs: buildHubIndex(sorted),
  };
  return indexCache;
}

/** All published posts, newest first. */
export function listPublishedPosts(): BlogPostMeta[] {
  return buildIndex().published;
}

/** One published post with rendered HTML and TOC. */
export function getPublishedPost(slug: string): BlogPost | null {
  if (!isValidSlug(slug)) return null;
  const file = listMarkdownFiles().find((entry) => entry.slug === slug);
  if (!file) return null;
  const post = loadPost(file);
  return post && !post.draft ? post : null;
}

export function listPostsByDestination(czechName: string): BlogPostMeta[] {
  return listPublishedPosts().filter((post) => post.destinationCzechName === czechName);
}

export function listDestinationHubs(): DestinationHub[] {
  return buildIndex().hubs;
}

export function getDestinationHub(slug: string): DestinationHub | null {
  if (!isValidSlug(slug)) return null;
  return listDestinationHubs().find((hub) => hub.slug === slug) ?? null;
}

/** Every tag, most used first. */
export function listTags(): TagSummary[] {
  return buildIndex().tags;
}

/** Tags that deserve their own indexable page. */
export function listIndexableTags(): TagSummary[] {
  return listTags().filter((tag) => tag.count >= MIN_TAG_POSTS);
}

export function getTag(slug: string): TagSummary | null {
  if (!isValidSlug(slug)) return null;
  return listTags().find((tag) => tag.slug === slug) ?? null;
}

export function listPostsByTag(slug: string): BlogPostMeta[] {
  return listPublishedPosts().filter((post) =>
    post.tags.some((tag) => slugifyCzechTitle(tag) === slug),
  );
}

export function listPostsByAuthor(slug: string): BlogPostMeta[] {
  return listPublishedPosts().filter((post) => post.author.slug === slug);
}

/** Redirect target for a legacy path, if the path was registered as an alias. */
export function resolveAlias(pathname: string): string | null {
  const normalized = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return buildIndex().aliases.get(normalized) ?? null;
}

export type RelatedOptions = { limit?: number };

/**
 * Related posts: manual `related:` frontmatter wins, then same destination,
 * then shared tags, then recency. Never returns the post itself.
 */
export function relatedPosts(slug: string, options: RelatedOptions = {}): BlogPostMeta[] {
  const limit = options.limit ?? 3;
  const all = listPublishedPosts();
  const current = all.find((post) => post.slug === slug);
  if (!current) return all.slice(0, limit);

  const currentTags = new Set(current.tags.map((tag) => slugifyCzechTitle(tag)));
  const scored = all
    .filter((post) => post.slug !== slug)
    .map((post) => {
      let score = 0;
      if (current.relatedSlugs.includes(post.slug)) score += 100;
      if (post.relatedSlugs.includes(slug)) score += 100;
      if (
        current.destinationCzechName &&
        post.destinationCzechName === current.destinationCzechName
      )
        score += 10;
      for (const tag of post.tags) {
        if (currentTags.has(slugifyCzechTitle(tag))) score += 3;
      }
      return { post, score };
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.post.publishedAt.localeCompare(a.post.publishedAt) ||
        a.post.slug.localeCompare(b.post.slug),
    );

  const picked = scored.slice(0, limit).map((entry) => entry.post);
  if (picked.length < limit) {
    for (const post of all) {
      if (picked.length >= limit) break;
      if (post.slug === slug || picked.some((item) => item.slug === post.slug)) continue;
      picked.push(post);
    }
  }
  return picked;
}

/** Chronological neighbours in the global published list (newest first). */
export function neighbours(slug: string): {
  prevPost: BlogPostMeta | null;
  nextPost: BlogPostMeta | null;
} {
  const posts = listPublishedPosts();
  const index = posts.findIndex((post) => post.slug === slug);
  if (index === -1) return { prevPost: null, nextPost: null };
  return {
    prevPost: index < posts.length - 1 ? posts[index + 1] : null,
    nextPost: index > 0 ? posts[index - 1] : null,
  };
}

/** Paginated listing slice. `page` is 1-based and clamped into range. */
export function paginatePosts(
  posts: BlogPostMeta[],
  page: number,
  pageSize: number = BLOG_PAGE_SIZE,
): { items: BlogPostMeta[]; page: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(posts.length / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (current - 1) * pageSize;
  return { items: posts.slice(start, start + pageSize), page: current, totalPages };
}

/** Posts matching a free-text query (title, description, tags, destination). */
export function searchPosts(query: string, limit = 12): BlogPostMeta[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  const folded = slugifyCzechTitle(needle).replace(/-/g, " ");
  return listPublishedPosts()
    .map((post) => {
      const haystack = [post.title, post.description, post.destinationCzechName ?? "", ...post.tags]
        .join(" ")
        .toLowerCase();
      const foldedHaystack = slugifyCzechTitle(haystack).replace(/-/g, " ");
      let score = 0;
      if (haystack.includes(needle)) score += 5;
      if (foldedHaystack.includes(folded)) score += 3;
      if (post.title.toLowerCase().includes(needle)) score += 5;
      return { post, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.post.publishedAt.localeCompare(a.post.publishedAt))
    .slice(0, limit)
    .map((entry) => entry.post);
}

/** Small numbers the blog chrome shows ("12 článků · 8 destinací"). */
export function blogStats(): {
  postCount: number;
  destinationCount: number;
  latestPublishedAt: string | null;
} {
  const posts = listPublishedPosts();
  return {
    postCount: posts.length,
    destinationCount: listDestinationHubs().length,
    latestPublishedAt: posts[0]?.updatedAt ?? posts[0]?.publishedAt ?? null,
  };
}

/** Test helper: drop every cache. */
export function resetBlogCache(): void {
  indexCache = null;
  postCache.clear();
}
