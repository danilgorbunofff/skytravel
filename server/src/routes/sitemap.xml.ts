import { Router } from "express";
import prisma from "../prisma.js";
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

type SitemapEntry = {
  loc: string;
  priority: number;
  changefreq?: string;
  lastmod?: string;
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

const DESTINATION_BUDGET_MS = 1500;

/** Reject after `ms` so a stalled database cannot stall the response. */
function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`sitemap: DB budget of ${ms}ms exceeded`)), ms);
    timer.unref?.();
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

router.get("/sitemap.xml", async (_req, res) => {
  const baseUrl = "https://sky-travel.tours";

  // Try to get destinations, but don't fail if DB unavailable. The query gets
  // a short budget: a hanging sitemap is worse than a sitemap without search
  // deep links, and Prisma's own connect timeout is far longer than a crawler
  // will wait.
  let destinationUrls: SitemapEntry[] = [];
  try {
    const destinations = await withDeadline(
      prisma.destination.findMany({ select: { czechName: true } }),
      DESTINATION_BUDGET_MS,
    );
    destinationUrls = destinations.map((d) => ({
      loc: `${baseUrl}/search?destination=${encodeURIComponent(d.czechName)}`,
      priority: 0.7,
    }));
  } catch {
    // DB may not be available
  }

  // Blog content lives on disk, so it still works when the DB is down.
  let blogUrls: SitemapEntry[] = [];
  try {
    blogUrls = blogEntries(baseUrl);
  } catch {
    // Missing/unreadable content directory should not break the sitemap.
  }

  const urls: SitemapEntry[] = [
    { loc: `${baseUrl}/`, priority: 1.0, changefreq: "weekly" },
    { loc: `${baseUrl}/search`, priority: 0.8, changefreq: "daily" },
    ...destinationUrls,
    ...blogUrls,
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => {
    const changefreq = u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : "";
    const lastmod = u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : "";
    return `  <url><loc>${escapeXml(u.loc)}</loc>${lastmod}${changefreq}<priority>${u.priority}</priority></url>`;
  })
  .join("\n")}
</urlset>`;

  res.header("Content-Type", "application/xml");
  res.send(xml);
});

export default router;
