import { Router } from "express";
import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  getDestinationHub,
  getPublishedPost,
  getTag,
  listPostsByDestination,
  listPostsByTag,
  listPublishedPosts,
  paginatePosts,
  resolveAlias,
} from "../blog/loader.js";
import { getAuthor } from "../blog/authors.js";
import { isValidSlug, slugifyCzechTitle } from "../blog/slug.js";
import { renderIndexPage } from "../blog/pages/index.js";
import { renderArticlePage } from "../blog/pages/article.js";
import { renderHubPage } from "../blog/pages/hub.js";
import { renderDestinationsPage } from "../blog/pages/destinations.js";
import { renderTagPage } from "../blog/pages/tag.js";
import { renderAuthorPage } from "../blog/pages/author.js";
import { renderAboutPage } from "../blog/pages/about.js";
import { renderSearchPage } from "../blog/pages/search.js";
import { renderNotFoundPage } from "../blog/pages/notFound.js";
import { renderRss } from "../blog/pages/feed.js";

const router = Router();

const HTML_CACHE = "public, max-age=300, stale-while-revalidate=600";
const FEED_CACHE = "public, max-age=600";

function sendHtml(res: Response, html: string, status = 200): void {
  res.status(status);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", HTML_CACHE);
  res.send(html);
}

function sendNotFound(res: Response): void {
  sendHtml(res, renderNotFoundPage(), 404);
}

/** Positive integer from a raw path segment, or null. */
function parsePage(raw: string | undefined): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const value = Number.parseInt(raw, 10);
  return value >= 1 ? value : null;
}

/**
 * `/blog/tema/pláže/` and `/blog/destinace/španělsko/` are what people type;
 * fold them to the ASCII slug and redirect instead of answering 404.
 */
function foldedSlugRedirect(
  res: Response,
  pathname: string,
  candidate: string | undefined,
): boolean {
  if (!candidate) return false;
  let decoded = candidate;
  try {
    decoded = decodeURIComponent(candidate);
  } catch {
    return false;
  }
  const folded = slugifyCzechTitle(decoded);
  if (!folded || folded === candidate) return false;
  res.redirect(301, `${pathname}/${folded}/`);
  return true;
}

/**
 * Only one URL should ever serve a listing: `/page/1/` redirects to the bare
 * path, and pages past the end redirect to the last real one.
 */
function redirectIfNotCanonical(
  res: Response,
  requested: number | null,
  totalPages: number,
  basePath: string,
): boolean {
  if (requested === null) {
    res.redirect(301, `${basePath}/page/1/`);
    return true;
  }
  if (requested === 1) {
    res.redirect(301, basePath);
    return true;
  }
  const clamped = Math.min(requested, totalPages);
  if (requested > totalPages) {
    res.redirect(301, `${basePath}/page/${clamped}/`);
    return true;
  }
  return false;
}

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    sendHtml(res, renderIndexPage(1));
  }),
);

router.get(
  "/page/:page",
  asyncHandler(async (req, res) => {
    const requested = parsePage(req.params.page);
    const { totalPages } = paginatePosts(listPublishedPosts(), requested ?? 1);
    if (redirectIfNotCanonical(res, requested, totalPages, "/blog")) return;
    sendHtml(res, renderIndexPage(requested as number));
  }),
);

router.get(
  "/rss.xml",
  asyncHandler(async (_req, res) => {
    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    res.setHeader("Cache-Control", FEED_CACHE);
    res.send(renderRss(listPublishedPosts()));
  }),
);

router.get(
  "/destinace",
  asyncHandler(async (_req, res) => {
    sendHtml(res, renderDestinationsPage());
  }),
);

router.get(
  "/destinace/:hubSlug",
  asyncHandler(async (req, res) => {
    const { hubSlug } = req.params;
    const hub = hubSlug && isValidSlug(hubSlug) ? getDestinationHub(hubSlug) : null;
    if (!hub) {
      if (foldedSlugRedirect(res, "/blog/destinace", hubSlug)) return;
      sendNotFound(res);
      return;
    }
    sendHtml(res, renderHubPage(hub, 1));
  }),
);

router.get(
  "/destinace/:hubSlug/page/:page",
  asyncHandler(async (req, res) => {
    const { hubSlug } = req.params;
    const hub = hubSlug && isValidSlug(hubSlug) ? getDestinationHub(hubSlug) : null;
    if (!hub) {
      if (foldedSlugRedirect(res, "/blog/destinace", hubSlug)) return;
      sendNotFound(res);
      return;
    }
    const requested = parsePage(req.params.page);
    const { totalPages } = paginatePosts(listPostsByDestination(hub.czechName), requested ?? 1);
    if (redirectIfNotCanonical(res, requested, totalPages, `/blog/destinace/${hub.slug}`)) return;
    sendHtml(res, renderHubPage(hub, requested as number));
  }),
);

router.get(
  "/tema/:tag",
  asyncHandler(async (req, res) => {
    const { tag: tagSlug } = req.params;
    const tag = tagSlug && isValidSlug(tagSlug) ? getTag(tagSlug) : null;
    if (!tag) {
      if (foldedSlugRedirect(res, "/blog/tema", tagSlug)) return;
      sendNotFound(res);
      return;
    }
    sendHtml(res, renderTagPage(tag, 1));
  }),
);

router.get(
  "/tema/:tag/page/:page",
  asyncHandler(async (req, res) => {
    const { tag: tagSlug } = req.params;
    const tag = tagSlug && isValidSlug(tagSlug) ? getTag(tagSlug) : null;
    if (!tag) {
      if (foldedSlugRedirect(res, "/blog/tema", tagSlug)) return;
      sendNotFound(res);
      return;
    }
    const requested = parsePage(req.params.page);
    const { totalPages } = paginatePosts(listPostsByTag(tag.slug), requested ?? 1);
    if (redirectIfNotCanonical(res, requested, totalPages, `/blog/tema/${tag.slug}`)) return;
    sendHtml(res, renderTagPage(tag, requested as number));
  }),
);

router.get(
  "/autor/:slug",
  asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const html = slug && isValidSlug(slug) && getAuthor(slug) ? renderAuthorPage(slug) : null;
    if (!html) {
      sendNotFound(res);
      return;
    }
    sendHtml(res, html);
  }),
);

router.get(
  "/o-blogu",
  asyncHandler(async (_req, res) => {
    sendHtml(res, renderAboutPage());
  }),
);

router.get(
  "/hledat",
  asyncHandler(async (req, res) => {
    const raw = req.query.q;
    sendHtml(res, renderSearchPage(typeof raw === "string" ? raw : ""));
  }),
);

/** Legacy paths registered through `aliases:` frontmatter. */
function aliasTarget(pathname: string): string | null {
  return resolveAlias(pathname) ?? resolveAlias(`${pathname}/`);
}

router.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const { slug } = req.params;
    if (!slug || !isValidSlug(slug)) {
      sendNotFound(res);
      return;
    }
    const post = getPublishedPost(slug);
    if (post) {
      sendHtml(res, renderArticlePage(post));
      return;
    }
    const target = aliasTarget(`/blog/${slug}`);
    if (target) {
      res.redirect(301, target);
      return;
    }
    sendNotFound(res);
  }),
);

/** Two-segment legacy paths, e.g. `/blog/chorvatsko/stare-jmeno`. */
router.get(
  "/:section/:slug",
  asyncHandler(async (req: Request, res: Response) => {
    const target = aliasTarget(`/blog/${req.params.section}/${req.params.slug}`);
    if (!target) {
      sendNotFound(res);
      return;
    }
    res.redirect(301, target);
  }),
);

export default router;
