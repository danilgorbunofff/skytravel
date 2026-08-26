import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  escapeHtml,
  renderArticlePage,
  renderListPage,
  renderHubPage,
  renderDestinationsIndexPage,
  renderNotFoundPage,
  renderRss,
} from "./render.js";
import type { BlogPost, BlogPostMeta } from "./types.js";

const meta = (overrides: Partial<BlogPostMeta> = {}): BlogPostMeta => ({
  slug: "test-clanek",
  title: "Testovací článek",
  description: "Krátký popisek článku.",
  destinationCzechName: "Řecko",
  tags: ["Řecko"],
  publishedAt: "2026-03-01",
  updatedAt: null,
  draft: false,
  coverImage: null,
  readingMinutes: 4,
  ...overrides,
});

const fullPost = (html = "<p>Ahoj světe.</p>"): BlogPost => ({
  ...meta(),
  html,
});

describe("escapeHtml", () => {
  it("escapes HTML-special characters", () => {
    assert.equal(
      escapeHtml(`<script>"x" & '</script>`),
      "&lt;script&gt;&quot;x&quot; &amp; &#39;&lt;/script&gt;",
    );
  });
});

describe("renderArticlePage", () => {
  const page = renderArticlePage({ post: fullPost(), relatedPosts: [] });

  it("renders lang=cs document with title", () => {
    assert.ok(page.startsWith("<!DOCTYPE html>"));
    assert.ok(page.includes('<html lang="cs">'));
    assert.ok(page.includes("Testovací článek"));
  });

  it("emits canonical URL", () => {
    assert.ok(
      page.includes('<link rel="canonical" href="https://sky-travel.tours/blog/test-clanek/"'),
    );
  });

  it("escapes title in head and body", () => {
    const hostile = renderArticlePage({
      post: { ...fullPost("<p>x</p>"), title: `<img src=x onerror=alert(1)>` },
      relatedPosts: [],
    });
    assert.ok(!hostile.includes("<img src=x"));
    assert.ok(hostile.includes("&lt;img"));
  });

  it("includes BlogPosting JSON-LD without raw angle brackets in script", () => {
    assert.ok(page.includes("application/ld+json"));
    assert.ok(page.includes('"@type":"BlogPosting"'));
    const ldBlocks = page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? [];
    for (const block of ldBlocks) {
      const body = block.replace(/<[^>]+>/g, "");
      assert.ok(!/[<>]/.test(body), `raw < or > inside JSON-LD: ${body.slice(0, 80)}`);
    }
  });

  it("marks up article metadata with time elements", () => {
    assert.ok(page.includes('<time datetime="2026-03-01">'));
  });

  it("links the destination hub badge", () => {
    assert.ok(page.includes("/blog/destinace/recko/"));
  });

  it("shows search CTA with destination deep-link", () => {
    assert.ok(page.includes("/search?destinationSlug=recko"));
  });

  it("renders related posts when provided", () => {
    const withRelated = renderArticlePage({
      post: fullPost(),
      relatedPosts: [meta({ slug: "dalsi-clanek", title: "Další článek" })],
    });
    assert.ok(withRelated.includes("/blog/dalsi-clanek/"));
    assert.ok(withRelated.includes("Další článek"));
  });

  it("renders prev/next article navigation when provided", () => {
    const withNav = renderArticlePage({
      post: fullPost(),
      relatedPosts: [],
      prevPost: meta({ slug: "starsi-clanek", title: "Starší článek" }),
      nextPost: meta({ slug: "novejsi-clanek", title: "Novější článek" }),
    });
    assert.ok(withNav.includes("/blog/starsi-clanek/"));
    assert.ok(withNav.includes("/blog/novejsi-clanek/"));
    assert.ok(withNav.includes('aria-label="Navigace mezi články"'));
  });

  it("uses absolute URL for cover image in JSON-LD", () => {
    const withCover = renderArticlePage({
      post: fullPost(),
      relatedPosts: [],
    });
    // default og image (no cover): absolute site URL
    assert.ok(withCover.includes('"image":"https://sky-travel.tours/images/blog/og-default.jpg"'));
    const withLocalCover = renderArticlePage({
      post: { ...fullPost(), coverImage: "/assets/blog/hero-fallback.jpg" },
      relatedPosts: [],
    });
    assert.ok(
      withLocalCover.includes('"image":"https://sky-travel.tours/assets/blog/hero-fallback.jpg"'),
    );
  });

  it("adds heading ids and TOC for long articles", () => {
    const longHtml = [
      "<h2>První sekce</h2><p>Text.</p>",
      "<h2>Druhá sekce</h2><p>Text.</p>",
      "<h2>Třetí sekce</h2><p>Text.</p>",
    ].join("");
    const withToc = renderArticlePage({ post: fullPost(longHtml), relatedPosts: [] });
    assert.ok(withToc.includes('id="prvni-sekce"'));
    assert.ok(withToc.includes('aria-label="Obsah článku"'));
  });

  it("keeps rendered markdown html intact (trusted pipeline)", () => {
    const p = renderArticlePage({ post: fullPost("<h2>Nadpis</h2><p>Text</p>"), relatedPosts: [] });
    // heading gets an id injected, but inner text/markup is preserved
    assert.ok(p.includes('<h2 id="nadpis">Nadpis</h2>'));
    assert.ok(p.includes("<p>Text</p>"));
  });

  it("renders article lede and hero destination badge", () => {
    const p = renderArticlePage({ post: fullPost(), relatedPosts: [] });
    assert.ok(p.includes("blog-article__lede"));
    assert.ok(p.includes("Krátký popisek článku."));
    assert.ok(p.includes("dest-badge--hero"));
  });

  it("renders author sign-off at the end of the article", () => {
    const p = renderArticlePage({ post: fullPost(), relatedPosts: [] });
    assert.ok(p.includes("prose-end"));
    assert.ok(p.includes("Tým SkyTravel"));
  });
});

describe("renderListPage", () => {
  const page = renderListPage({
    heading: "SkyTravel Blog",
    intro: "Intro text.",
    canonicalPath: "/blog/",
    posts: [meta()],
    page: 1,
    totalPages: 2,
    hubs: [{ slug: "recko", czechName: "Řecko", count: 3 }],
  });

  it("renders heading, intro and cards", () => {
    assert.ok(page.includes("SkyTravel Blog"));
    assert.ok(page.includes("Intro text."));
    assert.ok(page.includes("/blog/test-clanek/"));
  });

  it("lists destination hubs with counts", () => {
    assert.ok(page.includes("/blog/destinace/recko/"));
    assert.ok(page.includes("(3)"));
  });

  it("adds pagination links for multi-page lists", () => {
    assert.ok(page.includes("/blog/page/2/"));
    assert.ok(page.includes('rel="next"'));
  });

  it("no pagination on single page", () => {
    const single = renderListPage({
      heading: "X",
      canonicalPath: "/blog/",
      posts: [meta()],
      page: 1,
      totalPages: 1,
    });
    assert.ok(!single.includes("pagination"));
  });

  it("renders featured strip and stats on home when >=3 posts", () => {
    const home = renderListPage({
      heading: "SkyTravel Blog",
      intro: "Intro.",
      canonicalPath: "/blog/",
      posts: [
        meta({ slug: "prvni", title: "První článek", description: "První popis." }),
        meta({ slug: "druhy", title: "Druhý článek", description: "Druhý popis." }),
        meta({ slug: "treti", title: "Třetí článek", description: "Třetí popis." }),
        meta({ slug: "ctvrty", title: "Čtvrtý článek", description: "Čtvrtý popis." }),
      ],
      page: 1,
      totalPages: 1,
      hubs: [{ slug: "recko", czechName: "Řecko", count: 3 }],
    });
    assert.ok(home.includes("blog-featured"));
    assert.ok(!home.includes("blog-stats"));
    assert.ok(home.includes("/blog/prvni/"));
    assert.ok(home.includes("Hlavní článek") || home.includes("Řecko"));
  });

  it("does not render featured strip on hub list pages", () => {
    const hub = renderListPage({
      heading: "Řecko",
      canonicalPath: "/blog/destinace/recko/",
      posts: [meta(), meta({ slug: "druhy" }), meta({ slug: "treti" })],
      page: 1,
      totalPages: 1,
    });
    assert.ok(!hub.includes("blog-featured"));
    assert.ok(!hub.includes("blog-stats"));
  });
});

describe("renderHubPage", () => {
  it("uses destination name as heading and canonical", () => {
    const page = renderHubPage({
      destinationName: "Černá Hora",
      intro: "Průvodce.",
      posts: [meta({ destinationCzechName: "Černá Hora" })],
      page: 1,
      totalPages: 1,
      otherHubs: [{ slug: "recko", czechName: "Řecko", count: 1 }],
    });
    assert.ok(page.includes("Černá Hora"));
    assert.ok(
      page.includes('canonical" href="https://sky-travel.tours/blog/destinace/cerna-hora/"'),
    );
    assert.ok(page.includes("/blog/destinace/recko/"));
  });

  it("uses paginated canonical on page > 1", () => {
    const page = renderHubPage({
      destinationName: "Černá Hora",
      intro: "Průvodce.",
      posts: [],
      page: 2,
      totalPages: 2,
      otherHubs: [],
    });
    assert.ok(
      page.includes('canonical" href="https://sky-travel.tours/blog/destinace/cerna-hora/page/2/"'),
    );
  });

  it("links the search funnel with destinationSlug", () => {
    const page = renderHubPage({
      destinationName: "Řecko",
      intro: "Průvodce.",
      posts: [meta()],
      page: 1,
      totalPages: 1,
      otherHubs: [],
    });
    assert.ok(page.includes("/search?destinationSlug=recko"));
  });

  it("renders empty state when hub has no posts", () => {
    const page = renderHubPage({
      destinationName: "Albánie",
      intro: "Průvodce.",
      posts: [],
      page: 1,
      totalPages: 1,
      otherHubs: [],
    });
    assert.ok(page.includes("empty-state"));
    assert.ok(page.includes("/search"));
  });

  it("emits hub-bar intro with post count and yellow accent", () => {
    const page = renderHubPage({
      destinationName: "Řecko",
      intro: "Průvodce.",
      posts: [
        meta(),
        meta({ slug: "druhy", title: "Druhý" }),
        meta({ slug: "treti", title: "Třetí" }),
      ],
      page: 1,
      totalPages: 1,
      otherHubs: [],
    });
    assert.ok(page.includes("hub-bar"));
    assert.ok(page.includes("hub-bar__title"));
    assert.ok(page.includes("hub-bar__count"));
    assert.ok(page.includes("Nejnovější články o Řecku"));
    assert.ok(page.includes("3 články"));
  });
});

describe("renderDestinationsIndexPage", () => {
  it("lists hubs with latest articles", () => {
    const page = renderDestinationsIndexPage({
      hubs: [
        {
          slug: "recko",
          czechName: "Řecko",
          count: 2,
          latest: [meta({ slug: "plaze-recko", title: "Pláže v Řecku" })],
        },
      ],
    });
    assert.ok(page.includes("/blog/destinace/recko/"));
    assert.ok(page.includes("/blog/plaze-recko/"));
    assert.ok(page.includes("Všechny destinace"));
  });

  it("uses editorial hub-index card with overlay and sand latest list", () => {
    const page = renderDestinationsIndexPage({
      hubs: [
        {
          slug: "bulharsko",
          czechName: "Bulharsko",
          count: 1,
          latest: [meta({ slug: "b1", title: "Článek" })],
        },
      ],
    });
    assert.ok(page.includes("hub-index__overlay"));
    assert.ok(page.includes("hub-index__body"));
    assert.ok(page.includes("hub-index__latest"));
  });
});

describe("renderNotFoundPage", () => {
  it("returns styled 404 shell", () => {
    const page = renderNotFoundPage();
    assert.ok(page.includes("nenalezen"));
    assert.ok(page.includes("/blog/"));
  });

  it("is noindex with no canonical", () => {
    const page = renderNotFoundPage();
    assert.ok(page.includes('<meta name="robots" content="noindex, follow" />'));
    assert.ok(!page.includes('rel="canonical"'));
  });

  it("renders illustration and dual CTA group", () => {
    const page = renderNotFoundPage();
    assert.ok(page.includes("not-found__art"));
    assert.ok(page.includes("not-found__ctas"));
    assert.ok(page.includes("cta-btn--ghost"));
  });
});

describe("renderRss", () => {
  it("produces valid RSS items with escaped entities", () => {
    const xml = renderRss([meta({ title: "Článek & spol." })]);
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(xml.includes('<rss version="2.0"'));
    assert.ok(xml.includes("Článek &amp; spol."));
    assert.ok(xml.includes("2026-03-01") === false); // pubDate is RFC822
    assert.ok(xml.includes("pubDate"));
  });
});
