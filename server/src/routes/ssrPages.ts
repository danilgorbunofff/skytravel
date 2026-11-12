import { Router, type Request, type Response } from "express";
import { config } from "../config.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getLandingPage, homeLinks } from "../ssr/landingContent.js";
import { fetchHomeData, fetchLandingDeals } from "../ssr/pageData.js";
import { renderPage } from "../ssr/renderer.js";
import { isPublicLocale, type PublicLocale, type SsrInput } from "../ssr/types.js";

/**
 * Server-rendered public pages:
 *   /            → 301 /cs/ (query string kept, so UTM tags survive)
 *   /cs, /ru     → 301 /cs/, /ru/
 *   /cs/, /ru/   → home page
 *   /<lang>/<slug>/ → landing page from server/content/pages/<lang>/<slug>.md
 *   /api/pages/<lang>/<slug> → landing page JSON (client-side navigation / dev)
 *
 * nginx must proxy these paths to the API server — see docs/RUNBOOK.md.
 */
const router = Router();

const PAGE_CSP = [
  "default-src 'self'",
  "script-src 'self' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  `connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com ${config.allowedOrigins.join(" ")}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function queryString(req: Request): string {
  const index = req.originalUrl.indexOf("?");
  return index >= 0 ? req.originalUrl.slice(index) : "";
}

async function sendPage(res: Response, input: SsrInput, status = 200): Promise<void> {
  const html = await renderPage(input, { cache: status === 200 });
  if (!html) {
    res.status(503).type("text/plain").send("Service temporarily unavailable");
    return;
  }
  res.status(status);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Security-Policy", PAGE_CSP);
  res.setHeader(
    "Cache-Control",
    status === 200 ? "public, max-age=60, stale-while-revalidate=300" : "no-cache",
  );
  res.send(html);
}

router.get("/", (req, res) => {
  res.redirect(301, `/cs/${queryString(req)}`);
});

router.get(["/cs", "/ru"], (req, res, next) => {
  // Express routing is non-strict: "/cs" also matches "/cs/" — let that through.
  if (req.originalUrl.split("?")[0].endsWith("/")) {
    next();
    return;
  }
  res.redirect(301, `${req.path}/${queryString(req)}`);
});

router.get(
  /^\/(cs|ru)\/(.*)$/,
  asyncHandler(async (req, res) => {
    const lang = req.params[0] as PublicLocale;
    const rest = req.params[1] ?? "";

    // One URL per page: lowercase, trailing slash.
    if (rest && !rest.endsWith("/")) {
      if (/\.[a-z0-9]+$/i.test(rest)) {
        await sendPage(res, { path: req.path, lang, page: "notFound" }, 404);
        return;
      }
      res.redirect(301, `/${lang}/${rest}/${queryString(req)}`);
      return;
    }
    const slug = rest.replace(/\/+$/, "");

    if (!slug) {
      const home = await fetchHomeData();
      await sendPage(res, {
        path: `/${lang}/`,
        lang,
        page: "home",
        lastMinute: home.lastMinute,
        ownTours: home.ownTours,
        landingIndex: homeLinks(lang),
      });
      return;
    }

    const landing = getLandingPage(lang, slug);
    if (!landing) {
      await sendPage(res, { path: req.path, lang, page: "notFound" }, 404);
      return;
    }
    const deals = await fetchLandingDeals(landing);
    await sendPage(res, { path: landing.path, lang, page: "landing", landing, deals });
  }),
);

router.get(/^\/api\/pages\/([a-z]{2})\/(.+)$/, (req, res) => {
  const lang = req.params[0];
  const slug = (req.params[1] ?? "").replace(/\/+$/, "");
  const page = isPublicLocale(lang) ? getLandingPage(lang, slug) : null;
  if (!page) {
    res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Page not found" } });
    return;
  }
  res.setHeader("Cache-Control", "public, max-age=60");
  res.json({ ok: true, page });
});

export default router;
