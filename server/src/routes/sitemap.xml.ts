import { Router } from "express";
import { config } from "../config.js";
import { INDEXNOW_KEY_PATH, SITE_URL } from "../lib/indexnow.js";
import { listLandingPages } from "../ssr/landingContent.js";
import { PUBLIC_LOCALES, type PublicLocale } from "../ssr/types.js";
import {
  listDestinationHubs,
  listIndexableTags,
  listPostsByAuthor,
  listPostsByTag,
  listPublishedPosts,
  paginatePosts,
} from "../blog/loader.js";
import { AUTHORS } from "../blog/authors.js";
import type { BlogPostMeta } from "../blog/types.js";

const router = Router();

export type SitemapEntry = {
  loc: string;
  priority: number;
  changefreq?: string;
  lastmod?: string;
  /** hreflang alternates (absolute URLs) incl. the page itself. */
  alternates?: Partial<Record<PublicLocale | "x-default", string>>;
};

/** Sitemap locs must be XML-escaped; slugs and destinations can contain `&`. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Newest `updatedAt`/`publishedAt` across the given posts, if any. */
function latestPostDate(posts: BlogPostMeta[]): string | undefined {
  let latest: string | undefined;
  for (const post of posts) {
    const date = post.updatedAt ?? post.publishedAt;
    if (!latest || date > latest) latest = date;
  }
  return latest;
}

function blogEntries(baseUrl: string): SitemapEntry[] {
  const posts = listPublishedPosts();
  if (posts.length === 0) return [];

  const latest = latestPostDate(posts);
  const entries: SitemapEntry[] = [
    { loc: `${baseUrl}/blog/`, priority: 0.9, changefreq: "weekly", lastmod: latest },
    { loc: `${baseUrl}/blog/destinace/`, priority: 0.8, changefreq: "weekly", lastmod: latest },
  ];

  // Pagination is indexable and self-canonical, so it belongs in the sitemap.
  const { totalPages } = paginatePosts(posts, 1);
  for (let page = 2; page <= totalPages; page += 1) {
    entries.push({
      loc: `${baseUrl}/blog/page/${page}/`,
      priority: 0.5,
      changefreq: "weekly",
      lastmod: latest,
    });
  }

  for (const hub of listDestinationHubs()) {
    const hubPosts = posts.filter((p) => p.destinationCzechName === hub.czechName);
    const hubLastmod = latestPostDate(hubPosts);
    const hubBase = `${baseUrl}/blog/destinace/${hub.slug}/`;
    entries.push({ loc: hubBase, priority: 0.8, changefreq: "weekly", lastmod: hubLastmod });
    const hubPages = paginatePosts(hubPosts, 1).totalPages;
    for (let page = 2; page <= hubPages; page += 1) {
      entries.push({
        loc: `${hubBase}page/${page}/`,
        priority: 0.5,
        changefreq: "weekly",
        lastmod: hubLastmod,
      });
    }
  }

  for (const post of posts) {
    entries.push({
      loc: `${baseUrl}/blog/${post.slug}/`,
      priority: 0.8,
      changefreq: "monthly",
      lastmod: post.updatedAt ?? post.publishedAt,
    });
  }

  // Topic pages are only listed once a tag has enough posts to be worth indexing.
  for (const tag of listIndexableTags()) {
    const tagLastmod = latestPostDate(listPostsByTag(tag.slug));
    entries.push({
      loc: `${baseUrl}/blog/tema/${tag.slug}/`,
      priority: 0.6,
      changefreq: "weekly",
      lastmod: tagLastmod,
    });
  }

  for (const author of AUTHORS) {
    const authorLastmod = latestPostDate(listPostsByAuthor(author.slug));
    entries.push({
      loc: `${baseUrl}/blog/autor/${author.slug}/`,
      priority: 0.5,
      changefreq: "monthly",
      lastmod: authorLastmod,
    });
  }

  entries.push({
    loc: `${baseUrl}/blog/o-blogu/`,
    priority: 0.5,
    changefreq: "monthly",
    lastmod: latest,
  });

  return entries;
}

function withXDefault(alternates: Partial<Record<PublicLocale, string>>) {
  const result: SitemapEntry["alternates"] = { ...alternates };
  const xDefault = alternates.cs ?? Object.values(alternates)[0];
  if (xDefault && Object.keys(alternates).length > 1) result["x-default"] = xDefault;
  return result;
}

/** Server-rendered pages: both language homes + landing pages, with hreflang. */
function localizedEntries(baseUrl: string): SitemapEntry[] {
  const homeAlternates = Object.fromEntries(
    PUBLIC_LOCALES.map((lang) => [lang, `${baseUrl}/${lang}/`]),
  ) as Record<PublicLocale, string>;

  const entries: SitemapEntry[] = PUBLIC_LOCALES.map((lang) => ({
    loc: `${baseUrl}/${lang}/`,
    priority: 1.0,
    changefreq: "daily",
    alternates: withXDefault(homeAlternates),
  }));

  for (const page of listLandingPages()) {
    const alternates = Object.fromEntries(
      Object.entries(page.alternates).map(([lang, path]) => [lang, `${baseUrl}${path}`]),
    ) as Partial<Record<PublicLocale, string>>;
    entries.push({
      loc: `${baseUrl}${page.path}`,
      lastmod: page.updatedAt || undefined,
      changefreq: "daily",
      priority: page.slug.includes("/") ? 0.7 : 0.9,
      alternates: Object.keys(alternates).length > 1 ? withXDefault(alternates) : undefined,
    });
  }
  return entries;
}

/** All indexable URLs. Used by /sitemap.xml and the IndexNow script. */
export function buildSitemapEntries(): SitemapEntry[] {
  // Blog content lives on disk; a missing directory must not break the sitemap.
  let blogUrls: SitemapEntry[] = [];
  try {
    blogUrls = blogEntries(SITE_URL);
  } catch {
    // ignore
  }
  return [...localizedEntries(SITE_URL), ...blogUrls];
}

export function renderSitemap(entries: SitemapEntry[]): string {
  const body = entries
    .map((u) => {
      const parts = [`<loc>${escapeXml(u.loc)}</loc>`];
      if (u.lastmod) parts.push(`<lastmod>${u.lastmod}</lastmod>`);
      if (u.changefreq) parts.push(`<changefreq>${u.changefreq}</changefreq>`);
      parts.push(`<priority>${u.priority.toFixed(1)}</priority>`);
      for (const [lang, href] of Object.entries(u.alternates ?? {})) {
        parts.push(`<xhtml:link rel="alternate" hreflang="${lang}" href="${escapeXml(href)}" />`);
      }
      return `  <url>${parts.join("")}</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>
`;
}

router.get("/sitemap.xml", (_req, res) => {
  res.header("Content-Type", "application/xml; charset=utf-8");
  res.header("Cache-Control", "public, max-age=3600");
  res.send(renderSitemap(buildSitemapEntries()));
});

router.get("/robots.txt", (_req, res) => {
  res.type("text/plain").header("Cache-Control", "public, max-age=3600").send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin-login
Disallow: /api/
Disallow: /favorites
Disallow: /*?*sort=

Sitemap: ${SITE_URL}/sitemap.xml
`);
});

// IndexNow ownership proof (keyLocation). 404 until INDEXNOW_KEY is set.
router.get(INDEXNOW_KEY_PATH, (_req, res) => {
  if (!config.indexNowKey) {
    res.status(404).type("text/plain").send("Not found");
    return;
  }
  res.type("text/plain").send(config.indexNowKey);
});

export default router;
