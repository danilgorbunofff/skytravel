import { blogCssUrl, blogJsUrl } from "../assets.js";
import { SITE_BASE_URL, absoluteUrl, escapeHtml } from "../html.js";
import { jsonLdScript } from "../html.js";
import type { ResolvedImage } from "../types.js";

export type SeoPage = {
  title: string;
  description: string;
  /** Site-relative canonical path, e.g. "/blog/recko-plaze/". */
  canonicalPath: string;
  noindex?: boolean;
  ogType?: "website" | "article";
  image?: ResolvedImage | null;
  publishedTime?: string | null;
  modifiedTime?: string | null;
  authorName?: string | null;
  section?: string | null;
  tags?: string[];
  prevPath?: string | null;
  nextPath?: string | null;
  /** Hero image preload — keeps LCP discovery out of the HTML body. */
  preloadImage?: { src: string; srcset: string; sizes: string } | null;
  jsonLd?: unknown[];
};

export const DEFAULT_OG_IMAGE = "/images/blog/og-default.jpg";
const FONT_PRELOADS = [
  "/assets/fonts/manrope-400-latin.woff2",
  "/assets/fonts/barlow-condensed-800-latin.woff2",
];

function ogImageUrl(page: SeoPage): { url: string; width: number; height: number; alt: string } {
  if (page.image?.og) {
    return {
      url: absoluteUrl(page.image.og),
      width: 1200,
      height: 630,
      alt: page.image.alt,
    };
  }
  return {
    url: absoluteUrl(DEFAULT_OG_IMAGE),
    width: 1200,
    height: 630,
    alt: "SkyTravel — cestovní deník",
  };
}

/** Everything that belongs in <head>. All interpolations are escaped. */
export function renderHead(page: SeoPage): string {
  const canonical = `${SITE_BASE_URL}${page.canonicalPath}`;
  const ogImage = ogImageUrl(page);
  const jsUrl = blogJsUrl();

  const articleMeta =
    page.ogType === "article"
      ? [
          page.publishedTime
            ? `<meta property="article:published_time" content="${escapeHtml(page.publishedTime)}"/>`
            : "",
          page.modifiedTime
            ? `<meta property="article:modified_time" content="${escapeHtml(page.modifiedTime)}"/>`
            : "",
          page.authorName
            ? `<meta property="article:author" content="${escapeHtml(page.authorName)}"/>`
            : "",
          page.section
            ? `<meta property="article:section" content="${escapeHtml(page.section)}"/>`
            : "",
          ...(page.tags ?? [])
            .slice(0, 6)
            .map((tag) => `<meta property="article:tag" content="${escapeHtml(tag)}"/>`),
        ].join("\n  ")
      : "";

  const preload = page.preloadImage
    ? `<link rel="preload" as="image" href="${escapeHtml(page.preloadImage.src)}"${
        page.preloadImage.srcset
          ? ` imagesrcset="${escapeHtml(page.preloadImage.srcset)}" imagesizes="${escapeHtml(page.preloadImage.sizes)}"`
          : ""
      } fetchpriority="high"/>`
    : "";

  const robots = page.noindex
    ? `<meta name="robots" content="noindex, follow"/>`
    : `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1"/>`;
  // A canonical on a noindex page contradicts the robots directive, so it is
  // omitted there (the 404 page points at /blog/ only through its links).
  const canonicalTag = page.noindex
    ? ""
    : `<link rel="canonical" href="${escapeHtml(canonical)}"/>`;

  return `<meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(page.title)}</title>
  <meta name="description" content="${escapeHtml(page.description)}"/>
  ${robots}
  ${canonicalTag}
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"/>
  <link rel="alternate" type="application/rss+xml" title="SkyTravel Cestovní deník" href="${SITE_BASE_URL}/blog/rss.xml"/>
  ${page.prevPath ? `<link rel="prev" href="${SITE_BASE_URL}${escapeHtml(page.prevPath)}"/>` : ""}
  ${page.nextPath ? `<link rel="next" href="${SITE_BASE_URL}${escapeHtml(page.nextPath)}"/>` : ""}
  <meta property="og:type" content="${page.ogType === "article" ? "article" : "website"}"/>
  <meta property="og:site_name" content="SkyTravel"/>
  <meta property="og:locale" content="cs_CZ"/>
  <meta property="og:title" content="${escapeHtml(page.title)}"/>
  <meta property="og:description" content="${escapeHtml(page.description)}"/>
  <meta property="og:url" content="${escapeHtml(canonical)}"/>
  <meta property="og:image" content="${escapeHtml(ogImage.url)}"/>
  <meta property="og:image:width" content="${ogImage.width}"/>
  <meta property="og:image:height" content="${ogImage.height}"/>
  <meta property="og:image:alt" content="${escapeHtml(ogImage.alt)}"/>
  ${articleMeta}
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${escapeHtml(page.title)}"/>
  <meta name="twitter:description" content="${escapeHtml(page.description)}"/>
  <meta name="twitter:image" content="${escapeHtml(ogImage.url)}"/>
  <meta name="theme-color" content="#123d8c"/>
  ${FONT_PRELOADS.map(
    (href) =>
      `<link rel="preload" href="${href}" as="font" type="font/woff2" crossorigin="anonymous"/>`,
  ).join("\n  ")}
  ${preload}
  <link rel="stylesheet" href="${escapeHtml(blogCssUrl())}"/>
  ${jsUrl ? `<script src="${escapeHtml(jsUrl)}" defer></script>` : ""}
  ${(page.jsonLd ?? []).map((block) => jsonLdScript(block)).join("\n  ")}`;
}
