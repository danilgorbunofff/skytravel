/**
 * Pings IndexNow (Seznam, Bing…) with every URL from the sitemap.
 *
 *   npm --workspace server run indexnow            # all sitemap URLs
 *   npm --workspace server run indexnow -- /ru/egipet/ /cs/egypt/   # only these
 *
 * Needs INDEXNOW_KEY in server/.env and /indexnow-key.txt reachable on the live site.
 */
import "dotenv/config";
import { SITE_URL, submitToIndexNow } from "../lib/indexnow.js";
import { buildSitemapEntries } from "../routes/sitemap.xml.js";

const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const urls =
  args.length > 0
    ? args.map((a) => (a.startsWith("http") ? a : `${SITE_URL}${a.startsWith("/") ? a : `/${a}`}`))
    : buildSitemapEntries().map((e) => e.loc);

submitToIndexNow(urls)
  .then(({ ok, status }) => {
    console.warn(`IndexNow: HTTP ${status} for ${urls.length} URL(s)`);
    process.exit(ok ? 0 : 1);
  })
  .catch((err: unknown) => {
    console.error("IndexNow failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
