import { destinationSlug } from "./slug.js";
import type { TocEntry } from "./toc.js";

/** Editorial author. Rendered on articles and on /blog/autor/:slug/. */
export type Author = {
  slug: string;
  name: string;
  /** Short role line, e.g. "Redakce · Středomoří". */
  role: string;
  /** 1–2 sentence bio for the author box and the author page. */
  bio: string;
  /** Destinations the author covers — used for internal links on the author page. */
  expertise: string[];
};

/** One scannable "at a glance" fact shown above the article body. */
export type KeyFact = {
  label: string;
  value: string;
};

/** FAQ entry, mirrored into FAQPage structured data. */
export type FaqItem = {
  question: string;
  answer: string;
};

/** Cover/hero source as it appears in frontmatter. */
export type ImageAsset = {
  /** Absolute URL, site-relative path or a path relative to the content dir. */
  src: string;
  alt: string;
  credit: string | null;
  creditUrl: string | null;
  /** Object-position hint for art-directed crops. */
  focalPoint?: string | null;
};

export type ImageVariant = {
  src: string;
  width: number;
  height: number;
};

/** Cover image resolved against the media manifest (dimensions + srcsets). */
export type ResolvedImage = {
  /** Largest raster fallback, used as the <img src>. */
  src: string;
  /** `image/webp` srcset, ascending widths. Empty when no variants exist. */
  webpSrcset: string;
  /** Raster srcset for the <picture> fallback. Empty when no variants exist. */
  jpgSrcset: string;
  width: number;
  height: number;
  /** 1200×630 social crop, when one exists. */
  og: string | null;
  alt: string;
  credit: string | null;
  creditUrl: string | null;
  focalPoint: string | null;
};

/** Parsed, validated frontmatter of a blog article. */
export type BlogPostMeta = {
  /** URL slug — equals the markdown filename without extension. */
  slug: string;
  title: string;
  /** Meta description, 120–160 characters. */
  description: string;
  /** Czech destination name from the known destination list, when applicable. */
  destinationCzechName: string | null;
  tags: string[];
  publishedAt: string;
  updatedAt: string | null;
  draft: boolean;
  cover: ResolvedImage | null;
  hero: ResolvedImage | null;
  author: Author;
  reviewedBy: Author | null;
  keyFacts: KeyFact[];
  faq: FaqItem[];
  /** Previous URLs of this article; the router 301s them to the canonical one. */
  aliases: string[];
  /** Overrides the default canonical path when set. */
  canonicalPath: string | null;
  noindex: boolean;
  /** Reading time in minutes, computed from the body word count. */
  readingMinutes: number;
  wordCount: number;
  /** Manual related articles; autocompletion fills the rest. */
  relatedSlugs: string[];
};

/** A fully loaded article with rendered HTML. */
export type BlogPost = BlogPostMeta & {
  html: string;
  toc: TocEntry[];
};

export type DestinationHub = {
  slug: string;
  czechName: string;
  count: number;
  intro: string;
};

export type TagSummary = {
  slug: string;
  name: string;
  count: number;
};

export const BLOG_PAGE_SIZE = 9;

/** Tags need at least this many posts before they get an indexable page. */
export const MIN_TAG_POSTS = 3;

export function buildHubSlug(czechName: string): string {
  return destinationSlug(czechName);
}
