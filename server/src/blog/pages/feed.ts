import { SITE_BASE_URL, absoluteUrl, escapeHtml } from "../html.js";
import type { BlogPostMeta } from "../types.js";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** RFC 822 date required by RSS 2.0. */
function rfc822(iso: string): string {
  const date = new Date(`${iso}T09:00:00Z`);
  return `${DAYS[date.getUTCDay()]}, ${String(date.getUTCDate()).padStart(2, "0")} ${
    MONTHS[date.getUTCMonth()]
  } ${date.getUTCFullYear()} ${String(date.getUTCHours()).padStart(2, "0")}:00:00 +0000`;
}

/** RSS 2.0 feed of the newest articles. */
export function renderRss(posts: BlogPostMeta[], limit = 20): string {
  const items = posts.slice(0, limit);
  const lastBuild = items[0]?.updatedAt ?? items[0]?.publishedAt ?? "2026-01-01";
  const entries = items
    .map((post) => {
      const link = absoluteUrl(`/blog/${post.slug}/`);
      return `    <item>
      <title>${escapeHtml(post.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${rfc822(post.publishedAt)}</pubDate>
      <description>${escapeHtml(post.description)}</description>
      ${post.destinationCzechName ? `<category>${escapeHtml(post.destinationCzechName)}</category>` : ""}
      ${post.tags.map((tag) => `<category>${escapeHtml(tag)}</category>`).join("")}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>SkyTravel Cestovní deník</title>
    <link>${SITE_BASE_URL}/blog/</link>
    <description>Průvodce destinacemi, pláže, ceny a rady před odletem.</description>
    <language>cs-CZ</language>
    <lastBuildDate>${rfc822(lastBuild)}</lastBuildDate>
    <atom:link href="${SITE_BASE_URL}/blog/rss.xml" rel="self" type="application/rss+xml"/>
${entries}
  </channel>
</rss>
`;
}
