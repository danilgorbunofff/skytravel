import { Router } from "express";
import { config } from "../config.js";
import { listDestinationHubs, listPublishedPosts } from "../blog/loader.js";
import { INDEXNOW_KEY_PATH, SITE_URL } from "../lib/indexnow.js";
import { listLandingPages } from "../ssr/landingContent.js";
import { PUBLIC_LOCALES, type PublicLocale } from "../ssr/types.js";

const router = Router();

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: "daily" | "weekly" | "monthly";
  priority?: number;
  /** hreflang alternates (absolute URLs) incl. the page itself. */
  alternates?: Partial<Record<PublicLocale | "x-default", string>>;
}

const xmlEscape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function withXDefault(alternates: Partial<Record<PublicLocale, string>>) {
  const result: SitemapEntry["alternates"] = { ...alternates };
  const xDefault = alternates.cs ?? Object.values(alternates)[0];
  if (xDefault && Object.keys(alternates).length > 1) result["x-default"] = xDefault;
  return result;
}

/** All indexable URLs: both language homes, landing pages, blog. */
export function buildSitemapEntries(): SitemapEntry[] {
  const homeAlternates = Object.fromEntries(
    PUBLIC_LOCALES.map((lang) => [lang, `${SITE_URL}/${lang}/`]),
  ) as Record<PublicLocale, string>;

  const entries: SitemapEntry[] = PUBLIC_LOCALES.map((lang) => ({
    loc: `${SITE_URL}/${lang}/`,
    changefreq: "daily",
    priority: 1.0,
    alternates: withXDefault(homeAlternates),
  }));

  for (const page of listLandingPages()) {
    const alternates = Object.fromEntries(
      Object.entries(page.alternates).map(([lang, path]) => [lang, `${SITE_URL}${path}`]),
    ) as Partial<Record<PublicLocale, string>>;
    entries.push({
      loc: `${SITE_URL}${page.path}`,
      lastmod: page.updatedAt || undefined,
      changefreq: "daily",
      priority: page.slug.includes("/") ? 0.7 : 0.8,
      alternates: Object.keys(alternates).length > 1 ? withXDefault(alternates) : undefined,
    });
  }

  entries.push({ loc: `${SITE_URL}/blog/`, changefreq: "weekly", priority: 0.6 });
  for (const hub of listDestinationHubs()) {
    entries.push({
      loc: `${SITE_URL}/blog/destinace/${hub.slug}/`,
      changefreq: "weekly",
      priority: 0.5,
    });
  }
  for (const post of listPublishedPosts()) {
    entries.push({
      loc: `${SITE_URL}/blog/${post.slug}/`,
      lastmod: post.updatedAt ?? post.publishedAt,
      changefreq: "monthly",
      priority: 0.6,
    });
  }
  return entries;
}

export function renderSitemap(entries: SitemapEntry[]): string {
  const body = entries
    .map((entry) => {
      const lines = [`    <loc>${xmlEscape(entry.loc)}</loc>`];
      if (entry.lastmod) lines.push(`    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>`);
      if (entry.changefreq) lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
      if (entry.priority !== undefined)
        lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
      for (const [lang, href] of Object.entries(entry.alternates ?? {})) {
        lines.push(
          `    <xhtml:link rel="alternate" hreflang="${lang}" href="${xmlEscape(href)}" />`,
        );
      }
      return `  <url>\n${lines.join("\n")}\n  </url>`;
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
