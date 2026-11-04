import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import {
  blogStats,
  getPublishedPost,
  getTag,
  listDestinationHubs,
  listPostsByTag,
  listPublishedPosts,
  resetBlogCache,
} from "./loader.js";
import { renderArticlePage } from "./pages/article.js";
import { renderIndexPage } from "./pages/index.js";
import { renderHubPage } from "./pages/hub.js";
import { renderDestinationsPage } from "./pages/destinations.js";
import { renderTagPage } from "./pages/tag.js";
import { renderAuthorPage } from "./pages/author.js";
import { renderAboutPage } from "./pages/about.js";
import { renderSearchPage } from "./pages/search.js";
import { renderNotFoundPage } from "./pages/notFound.js";
import { renderRss } from "./pages/feed.js";
import { escapeHtml, jsonLdScript, plural, readingLabel } from "./html.js";

/** Strip tags so assertions describe what a reader actually sees. */
function text(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function jsonLd(html: string): unknown[] {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (match) => JSON.parse(match[1]),
  );
}

function attribute(html: string, selector: RegExp): string | null {
  return html.match(selector)?.[1] ?? null;
}

/** Contracts every page shares. */
function expectPageBasics(
  html: string,
  { canonical, robots }: { canonical: string; robots?: RegExp },
) {
  assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, "exactly one h1 per page");
  assert.equal(attribute(html, /<html lang="([^"]+)"/), "cs");
  const robotsValue = attribute(html, /<meta name="robots" content="([^"]+)"/);
  assert.ok(robotsValue);
  assert.match(robotsValue, robots ?? /^index, follow/);
  if ((robots ?? /^index/).source.startsWith("^index")) {
    assert.equal(attribute(html, /<link rel="canonical" href="([^"]+)"/), canonical);
  } else {
    assert.equal(
      html.includes('rel="canonical"'),
      false,
      "noindex pages must not declare a canonical",
    );
  }
  assert.match(
    attribute(html, /<meta name="viewport" content="([^"]+)"/) ?? "",
    /width=device-width/,
  );
  assert.ok(attribute(html, /<meta name="description" content="([^"]+)"/), "meta description");
  assert.match(html, /<link rel="alternate" type="application\/rss\+xml"/, "RSS alternate link");
  assert.match(html, /href="\/blog\/"/, "links back to the blog hub");
  assert.ok(!html.includes("undefined"), "no undefined leaked into the markup");
  assert.ok(!html.includes("[object Object]"), "no stringified object leaked into the markup");
}

let articleSlug: string;

before(() => {
  resetBlogCache();
  articleSlug = listPublishedPosts()[0].slug;
});

describe("blog hub", () => {
  it("lists the newest articles with pagination metadata", () => {
    const html = renderIndexPage(1);
    expectPageBasics(html, { canonical: "https://sky-travel.tours/blog/" });
    const posts = listPublishedPosts();
    assert.match(text(html), new RegExp(posts[0].title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(text(html), /člán/);
    assert.ok(jsonLd(html).length >= 2, "hub should publish blog and breadcrumb JSON-LD");
  });

  it("numbers pages past the first and keeps them self-canonical", () => {
    const html = renderIndexPage(2);
    expectPageBasics(html, { canonical: "https://sky-travel.tours/blog/page/2/" });
    assert.match(text(html), /Strana 2 z \d+/);
  });

  it("counts articles and destinations honestly", () => {
    const stats = blogStats();
    const html = text(renderIndexPage(1));
    assert.ok(html.includes(plural(stats.postCount, "článek", "články", "článků")));
  });
});

describe("article page", () => {
  it("renders the full editorial layout", () => {
    resetBlogCache();
    const post = getPublishedPost(articleSlug);
    assert.ok(post);
    const html = renderArticlePage(post);
    expectPageBasics(html, {
      canonical: `https://sky-travel.tours/blog/${post.slug}/`,
      robots: /^index, follow/,
    });

    const visible = text(html);
    assert.ok(visible.includes(post.title));
    assert.ok(visible.includes(post.description));
    assert.ok(visible.includes(post.author.name));
    assert.equal(visible.includes("undefined"), false);

    // Editorial furniture.
    assert.match(html, /class="facts"/, "key facts block");
    assert.equal((html.match(/class="facts__row"/g) ?? []).length, post.keyFacts.length);
    assert.match(html, /faq/, "FAQ section");
    for (const item of post.faq) assert.ok(visible.includes(item.question));
    assert.match(html, /class="toc/, "table of contents");
    assert.match(html, /related/, "related articles");
    assert.ok(attribute(html, /datetime="(\d{4}-\d{2}-\d{2})"/), "machine-readable date");
    assert.ok(visible.includes(readingLabel(post.readingMinutes)));

    // Imagery: explicit dimensions prevent layout shift, alt text is mandatory.
    const images = [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
    assert.ok(images.length >= 1);
    for (const tag of images) {
      assert.match(tag, /width="\d+"/, `missing width on ${tag}`);
      assert.match(tag, /height="\d+"/, `missing height on ${tag}`);
      assert.match(tag, /alt="[^"]+"/, `missing alt on ${tag}`);
      assert.match(tag, /decoding="async"/, `missing decoding hint on ${tag}`);
    }
    // The lead image is the LCP element: eager + high priority, everything else lazy.
    assert.match(images[0], /loading="eager"/);
    assert.match(images[0], /fetchpriority="high"/);
    for (const tag of images.slice(1)) assert.match(tag, /loading="lazy"/);
    assert.match(html, /<link rel="preload" as="image"/, "hero should be preloaded");

    // Structured data must parse and describe an Article.
    const data = jsonLd(html);
    assert.ok(data.length >= 2);
    const article = data.find(
      (entry): entry is Record<string, unknown> =>
        typeof entry === "object" &&
        entry !== null &&
        (entry as { "@type"?: string })["@type"] === "Article",
    );
    assert.ok(article, "Article JSON-LD");
    assert.equal(article.headline, post.title);
    assert.equal(article.datePublished, post.publishedAt);
    assert.equal(article.wordCount, post.wordCount);
    assert.ok(Array.isArray(article.image) && (article.image as string[]).length > 0);
    assert.ok(data.some((entry) => JSON.stringify(entry).includes("BreadcrumbList")));
    assert.ok(data.some((entry) => JSON.stringify(entry).includes("FAQPage")));
  });

  it("shows an update date only when the article was revised", () => {
    const updated = listPublishedPosts().find((post) => post.updatedAt);
    assert.ok(updated);
    const original = getPublishedPost(updated.slug);
    assert.ok(original);
    const withUpdate = renderArticlePage(original);
    const withoutUpdate = renderArticlePage({ ...original, updatedAt: null });
    assert.ok(text(withUpdate).includes("Aktualizováno"));
    assert.ok(!text(withoutUpdate).includes("Aktualizováno"));
  });

  it("escapes untrusted frontmatter in the markup", () => {
    const post = getPublishedPost(articleSlug);
    assert.ok(post);
    const hostile = renderArticlePage({ ...post, title: '<script>alert("x")</script>' });
    assert.ok(!hostile.includes('<script>alert("x")</script>'));
    assert.ok(hostile.includes("&lt;script&gt;"));
  });

  it("does not leak the raw markdown into the readme-visible text", () => {
    const post = getPublishedPost(articleSlug);
    assert.ok(post);
    const visible = text(renderArticlePage(post));
    assert.ok(!visible.includes("## "), "unrendered heading marker");
    assert.ok(!visible.includes("]("), "unrendered markdown link");
    assert.ok(!visible.includes("**"), "unrendered bold marker");
  });
});

describe("destination pages", () => {
  it("renders the destination index", () => {
    const html = renderDestinationsPage();
    expectPageBasics(html, { canonical: "https://sky-travel.tours/blog/destinace/" });
    const visible = text(html);
    for (const hub of listDestinationHubs()) {
      assert.ok(visible.includes(hub.czechName), `${hub.slug} missing from the index`);
      assert.ok(html.includes(`/blog/destinace/${hub.slug}/`));
    }
  });

  it("renders one hub per destination with its articles", () => {
    for (const hub of listDestinationHubs()) {
      const html = renderHubPage(hub, 1);
      expectPageBasics(html, { canonical: `https://sky-travel.tours/blog/destinace/${hub.slug}/` });
      const visible = text(html);
      assert.ok(visible.includes(hub.czechName));
      assert.ok(visible.includes(plural(hub.count, "článek", "články", "článků")));
    }
  });
});

describe("tag and author pages", () => {
  it("renders an indexable tag page", () => {
    const tag = getTag("plaze");
    assert.ok(tag);
    const html = renderTagPage(tag, 1);
    expectPageBasics(html, { canonical: "https://sky-travel.tours/blog/tema/plaze/" });
    assert.ok(text(html).includes(tag.name));
    assert.equal((html.match(/class="card"/g) ?? []).length > 0, true);
    assert.ok(html.includes(`/blog/${listPostsByTag("plaze")[0].slug}/`));
  });

  it("renders the editorial desk page", () => {
    const html = renderAuthorPage("redakce");
    assert.ok(html);
    expectPageBasics(html, { canonical: "https://sky-travel.tours/blog/autor/redakce/" });
    assert.ok(text(html).includes("Redakce SkyTravel"));
    assert.equal(renderAuthorPage("nikdo"), null);
  });
});

describe("about, search and 404", () => {
  it("explains the editorial policy and links the byline", () => {
    const html = renderAboutPage();
    expectPageBasics(html, { canonical: "https://sky-travel.tours/blog/o-blogu/" });
    const visible = text(html);
    assert.ok(visible.includes("Redakce"));
    assert.ok(html.includes("/blog/autor/redakce/"));
  });

  it("marks search results as non-indexable", () => {
    const empty = renderSearchPage("");
    expectPageBasics(empty, {
      canonical: "https://sky-travel.tours/blog/hledat/",
      robots: /^noindex/,
    });
    const found = renderSearchPage("chorvatsko");
    expectPageBasics(found, {
      canonical: "https://sky-travel.tours/blog/hledat/",
      robots: /^noindex/,
    });
    assert.ok(text(found).includes("Chorvatsko"));
    assert.match(text(found), /pro „chorvatsko“/);
    // Empty query is a landing state: suggestions, not an error.
    assert.ok(text(empty).includes("Zkuste některé z témat"));
    assert.ok(!text(empty).includes("Nic jsme nenašli"));
    // A single character is too broad to be useful — say so explicitly.
    assert.ok(text(renderSearchPage("a")).includes("Zadejte alespoň dva znaky"));
  });

  it("escapes the search query", () => {
    const html = renderSearchPage('"><script>alert(1)</script>');
    assert.ok(!html.includes("<script>alert(1)</script>"));
  });

  it("sends 404 pages back to the blog without indexing them", () => {
    const html = renderNotFoundPage();
    expectPageBasics(html, {
      canonical: "https://sky-travel.tours/blog/",
      robots: /^noindex/,
    });
    assert.ok(text(html).includes("nenalezen"));
    assert.ok(html.includes('href="/blog/"'));
  });
});

describe("RSS feed", () => {
  it("stays well-formed and limited", () => {
    const posts = listPublishedPosts();
    const xml = renderRss(posts, 5);
    assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.match(xml, /<rss version="2\.0"/);
    assert.equal((xml.match(/<item>/g) ?? []).length, Math.min(5, posts.length));
    assert.ok(xml.includes("<link>https://sky-travel.tours/blog/"), "absolute item links");
    assert.ok(!xml.includes("& "), "raw ampersand would break the XML");
    for (const match of xml.matchAll(/<link>([^<]+)<\/link>/g)) {
      assert.match(match[1], /^https:\/\/sky-travel\.tours\//);
    }
  });
});

describe("html helpers", () => {
  it("escapes markup, quotes and Czech characters safely", () => {
    assert.equal(
      escapeHtml('<a href="x">Řecko & Turecko</a>'),
      "&lt;a href=&quot;x&quot;&gt;Řecko &amp; Turecko&lt;/a&gt;",
    );
  });

  it("picks Czech plural forms", () => {
    assert.equal(plural(1, "článek", "články", "článků"), "1 článek");
    assert.equal(plural(3, "článek", "články", "článků"), "3 články");
    assert.equal(plural(12, "článek", "články", "článků"), "12 článků");
  });

  it("formats reading time", () => {
    assert.equal(readingLabel(1), "1 min čtení");
    assert.equal(readingLabel(6), "6 min čtení");
  });

  it("writes JSON-LD that cannot break out of its script tag", () => {
    const script = jsonLdScript({ name: "</script><script>alert(1)</script>" });
    assert.ok(!script.includes("</script><script>"));
    assert.equal((script.match(/<\/script>/g) ?? []).length, 1);
  });
});
