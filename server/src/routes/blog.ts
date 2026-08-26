import { Router } from "express";
import type { Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  listPublishedPosts,
  getPublishedPost,
  paginatePosts,
  listDestinationHubs,
} from "../blog/loader.js";
import { isValidSlug } from "../blog/slug.js";
import type { BlogPostMeta } from "../blog/types.js";
import {
  renderArticlePage,
  renderListPage,
  renderHubPage,
  renderNotFoundPage,
  renderDestinationsIndexPage,
  renderRss,
} from "../blog/render.js";

const router = Router();

const CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=600";
const BLOG_HOME_INTRO =
  "Praktické průvodce destinacemi, pláže, výlety a rady před dovolenou. Vše, co potřebujete vědět, než vyrazíte k moři.";

const HUB_INTROS: Record<string, string> = {
  Bulharsko:
    "Praktický průvodce Bulharskem — pláže Zlatých písků a Slunečného břehu, ceny, tipy na výlety a rady před dovolenou u moře.",
  Chorvatsko:
    "Průvodce chorvatským pobřežím — Istrie, Dalmácie, ostrovy, pláže. Co vědět před cestou do Chorvatska.",
  Itálie:
    "Itálie od Apulije po Toskánsko — pláže, města, gastronomie a praktické rady pro dovolenou v Itálii.",
  Albánie:
    "Albanian Riviera v rychlém rozvoji. Praktické průvodce, pláže, ceny a tipy pro dovolenou v Albánii.",
  "Černá Hora":
    "Záliv Boka Kotorská, dlouhé pláže u Ulcinje a hory nad mořem. Průvodce dovolenou v Černé Hoře.",
  Řecko:
    "Ostrovy i pevninské Řecko — Kréta, Rhodos, Chalkidiki. Pláže, antické památky a praktické rady před dovolenou.",
  Turecko:
    "Riviéra mezi Antalyí a Bodrumem — all inclusive resorty, památky a bazaary. Průvodce dovolenou v Turecku.",
  Španělsko:
    "Costa Brava, Costa del Sol, Baleáry. Průvodce plážemi, městy a praktickými radami pro dovolenou ve Španělsku.",
};

function sendHtml(res: Response, html: string): void {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", CACHE_CONTROL);
  res.send(html);
}

function hubIntro(name: string): string {
  return (
    HUB_INTROS[name] ??
    `Všechny články o destinaci ${name} — průvodce, tipy na výlety a rady před dovolenou.`
  );
}

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const posts = listPublishedPosts();
    const hubs = listDestinationHubs();
    const { items, totalPages } = paginatePosts(posts, 1);
    sendHtml(
      res,
      renderListPage({
        heading: "SkyTravel Blog",
        intro: BLOG_HOME_INTRO,
        canonicalPath: "/blog/",
        posts: items,
        page: 1,
        totalPages,
        hubs,
      }),
    );
  }),
);

router.get(
  "/page/:page/",
  asyncHandler(async (req, res) => {
    const parsed = Number.parseInt(req.params.page ?? "", 10);
    const posts = listPublishedPosts();
    const { items, totalPages, page: safePage } = paginatePosts(posts, parsed);
    if (Number.isNaN(parsed) || safePage !== parsed) {
      res.redirect(301, safePage === 1 ? "/blog/" : `/blog/page/${safePage}/`);
      return;
    }
    sendHtml(
      res,
      renderListPage({
        heading: "SkyTravel Blog",
        intro: BLOG_HOME_INTRO,
        canonicalPath: `/blog/page/${safePage}/`,
        posts: items,
        page: safePage,
        totalPages,
        hubs: safePage === 1 ? listDestinationHubs() : undefined,
      }),
    );
  }),
);

router.get(
  "/rss.xml",
  asyncHandler(async (_req, res) => {
    const xml = renderRss(listPublishedPosts());
    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    res.setHeader("Cache-Control", CACHE_CONTROL);
    res.send(xml);
  }),
);

router.get(
  "/destinace/",
  asyncHandler(async (_req, res) => {
    const posts = listPublishedPosts();
    const hubs = listDestinationHubs();
    const hubsWithLatest = hubs.map((hub) => ({
      ...hub,
      latest: posts.filter((p) => p.destinationCzechName === hub.czechName).slice(0, 3),
    }));
    sendHtml(
      res,
      renderDestinationsIndexPage({
        hubs: hubsWithLatest,
      }),
    );
  }),
);

/** Same-destination related posts, falling back to the newest articles. */
function relatedFor(slug: string, destinationCzechName: string | null) {
  const all = listPublishedPosts().filter((p) => p.slug !== slug);
  const sameDestination = destinationCzechName
    ? all.filter((p) => p.destinationCzechName === destinationCzechName)
    : [];
  const pool = sameDestination.length >= 3 ? sameDestination : all;
  return pool.slice(0, 5);
}

/** Chronological neighbours of a post in the global published list. */
function neighboursFor(slug: string): {
  prevPost: BlogPostMeta | null;
  nextPost: BlogPostMeta | null;
} {
  const posts = listPublishedPosts();
  const idx = posts.findIndex((p) => p.slug === slug);
  if (idx === -1) return { prevPost: null, nextPost: null };
  return {
    // Newest first: previous = older, next = newer.
    prevPost: idx < posts.length - 1 ? posts[idx + 1] : null,
    nextPost: idx > 0 ? posts[idx - 1] : null,
  };
}

router.get(
  "/destinace/:hubSlug",
  asyncHandler(async (req, res) => {
    const { hubSlug } = req.params;
    if (!isValidSlug(hubSlug)) {
      res.status(404);
      sendHtml(res, renderNotFoundPage());
      return;
    }
    const hubs = listDestinationHubs();
    const hub = hubs.find((h) => h.slug === hubSlug);
    if (!hub) {
      res.status(404);
      sendHtml(res, renderNotFoundPage());
      return;
    }
    const posts = listPublishedPosts().filter((p) => p.destinationCzechName === hub.czechName);
    const page = 1;
    const { items, totalPages } = paginatePosts(posts, page);
    sendHtml(
      res,
      renderHubPage({
        destinationName: hub.czechName,
        intro: hubIntro(hub.czechName),
        posts: items,
        page,
        totalPages,
        otherHubs: hubs.filter((h) => h.slug !== hub.slug),
      }),
    );
  }),
);

router.get(
  "/destinace/:hubSlug/page/:page",
  asyncHandler(async (req, res) => {
    const { hubSlug } = req.params;
    if (!isValidSlug(hubSlug)) {
      res.status(404);
      sendHtml(res, renderNotFoundPage());
      return;
    }
    const parsed = Number.parseInt(req.params.page ?? "", 10);
    const hubs = listDestinationHubs();
    const hub = hubs.find((h) => h.slug === hubSlug);
    if (!hub) {
      res.status(404);
      sendHtml(res, renderNotFoundPage());
      return;
    }
    const posts = listPublishedPosts().filter((p) => p.destinationCzechName === hub.czechName);
    const { items, totalPages, page: safePage } = paginatePosts(posts, parsed);
    if (Number.isNaN(parsed) || safePage !== parsed) {
      res.redirect(
        301,
        safePage === 1
          ? `/blog/destinace/${hub.slug}/`
          : `/blog/destinace/${hub.slug}/page/${safePage}/`,
      );
      return;
    }
    sendHtml(
      res,
      renderHubPage({
        destinationName: hub.czechName,
        intro: hubIntro(hub.czechName),
        posts: items,
        page: safePage,
        totalPages,
        otherHubs: hubs.filter((h) => h.slug !== hub.slug),
      }),
    );
  }),
);

router.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const { slug } = req.params;
    if (!isValidSlug(slug)) {
      res.status(404);
      sendHtml(res, renderNotFoundPage());
      return;
    }
    const post = getPublishedPost(slug);
    if (!post) {
      res.status(404);
      sendHtml(res, renderNotFoundPage());
      return;
    }
    sendHtml(
      res,
      renderArticlePage({
        post,
        relatedPosts: relatedFor(post.slug, post.destinationCzechName),
        ...neighboursFor(post.slug),
      }),
    );
  }),
);

export default router;
