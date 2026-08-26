import { destinationSlug } from "./slug.js";

/** Parsed + validated frontmatter of a blog article. */
export type BlogPostMeta = {
  /** URL slug — equals the markdown filename without extension. */
  slug: string;
  title: string;
  description: string;
  /** Czech destination name from KNOWN_DESTINATIONS when the post targets a country. */
  destinationCzechName: string | null;
  tags: string[];
  publishedAt: string; // ISO date (YYYY-MM-DD)
  updatedAt: string | null;
  draft: boolean;
  coverImage: string | null;
  /** Read-time estimate in minutes, computed once when the post is parsed. */
  readingMinutes: number;
};

/** A fully loaded blog article with its rendered HTML body. */
export type BlogPost = BlogPostMeta & {
  html: string;
};

export type DestinationHub = {
  slug: string;
  czechName: string;
  posts: BlogPostMeta[];
};

export const BLOG_PAGE_SIZE = 12;

export function buildHubSlug(czechName: string): string {
  return destinationSlug(czechName);
}
