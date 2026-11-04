import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import {
  blogStats,
  getDestinationHub,
  getPublishedPost,
  getTag,
  listDestinationHubs,
  listIndexableTags,
  listPostsByAuthor,
  listPostsByDestination,
  listPostsByTag,
  listPublishedPosts,
  listTags,
  neighbours,
  paginatePosts,
  relatedPosts,
  resetBlogCache,
  resolveAlias,
  searchPosts,
} from "./loader.js";
import { BLOG_PAGE_SIZE, MIN_TAG_POSTS, type BlogPostMeta } from "./types.js";

before(() => {
  resetBlogCache();
});

/** The content directory is the real one — the blog ships with its articles. */
describe("published content", () => {
  it("exposes the shipped articles newest first", () => {
    const posts = listPublishedPosts();
    assert.ok(posts.length >= 10, `expected at least 10 posts, got ${posts.length}`);
    for (let i = 1; i < posts.length; i += 1) {
      assert.ok(
        posts[i - 1].publishedAt >= posts[i].publishedAt,
        `${posts[i - 1].slug} should not be older than ${posts[i].slug}`,
      );
    }
    assert.ok(posts.every((post) => !post.draft));
    assert.equal(new Set(posts.map((post) => post.slug)).size, posts.length);
  });

  it("gives every article the metadata the templates depend on", () => {
    for (const post of listPublishedPosts()) {
      assert.match(post.slug, /^[a-z0-9-]+$/, `${post.slug} is not a clean slug`);
      assert.ok(post.title.length > 10, `${post.slug} has a short title`);
      assert.ok(post.description.length >= 70, `${post.slug} has a short description`);
      assert.ok(post.description.length <= 180, `${post.slug} has a long description`);
      assert.match(post.publishedAt, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(post.cover, `${post.slug} has no cover image`);
      assert.ok(post.cover?.alt, `${post.slug} cover has no alt text`);
      assert.ok(post.author?.slug, `${post.slug} has no author`);
      assert.ok(post.keyFacts.length >= 3, `${post.slug} has fewer than 3 key facts`);
      assert.ok(post.faq.length >= 3, `${post.slug} has fewer than 3 FAQ items`);
      assert.ok(post.wordCount >= 700, `${post.slug} is thin at ${post.wordCount} words`);
      assert.ok(post.readingMinutes >= 1);
    }
  });

  it("keeps Czech full-text and FAQ content free of unrendered markdown noise", () => {
    for (const post of listPublishedPosts()) {
      for (const fact of post.keyFacts) {
        assert.ok(fact.label && fact.value, `${post.slug} has an empty key fact`);
        assert.ok(!fact.value.includes("**"), `${post.slug} key fact has raw markdown`);
      }
      for (const item of post.faq) {
        assert.ok(item.question.endsWith("?") || item.question.length > 10);
        assert.ok(item.answer.length > 20, `${post.slug} has a stub FAQ answer`);
      }
    }
  });
});

describe("article loading", () => {
  it("renders markdown into html with a table of contents", () => {
    const slug = listPublishedPosts()[0].slug;
    resetBlogCache();
    const post = getPublishedPost(slug);
    assert.ok(post);
    assert.ok(post.html.includes("<h2"), "article body should have level-2 headings");
    assert.ok(post.html.includes('id="'), "headings should carry ids for anchors");
    assert.ok(post.toc.length >= 2, "article should expose a table of contents");
    assert.ok(!post.html.includes("](#"), "no unresolved markdown links");
  });

  it("returns null for unknown, invalid and draft slugs", () => {
    assert.equal(getPublishedPost("neexistuje"), null);
    assert.equal(getPublishedPost("Špatný slug"), null);
    assert.equal(getPublishedPost(""), null);
  });

  it("external links open safely", () => {
    const post = getPublishedPost(listPublishedPosts()[0].slug);
    assert.ok(post);
    for (const match of post.html.matchAll(/<a [^>]*href="(https?:\/\/[^"]+)"[^>]*>/g)) {
      const tag = match[0];
      assert.match(tag, /target="_blank"/, `${match[1]} should open in a new tab`);
      assert.match(tag, /rel="[^"]*noopener/, `${match[1]} needs rel=noopener`);
    }
  });
});

describe("destinations", () => {
  it("builds a hub for every destination that has articles", () => {
    const hubs = listDestinationHubs();
    assert.ok(hubs.length >= 8, `expected at least 8 hubs, got ${hubs.length}`);
    for (const hub of hubs) {
      assert.match(hub.slug, /^[a-z0-9-]+$/);
      assert.ok(hub.count > 0);
      assert.ok(hub.intro.length > 40, `${hub.slug} has a stub intro`);
      assert.equal(listPostsByDestination(hub.czechName).length, hub.count);
    }
    assert.equal(getDestinationHub("chorvatsko")?.czechName, "Chorvatsko");
    assert.equal(getDestinationHub("atlantida"), null);
    assert.equal(getDestinationHub(""), null);
  });
});

describe("tags", () => {
  it("only offers indexable tag pages once a tag has enough posts", () => {
    const indexable = listIndexableTags();
    assert.ok(indexable.length >= 3);
    for (const tag of listTags()) {
      assert.equal(
        indexable.some((entry) => entry.slug === tag.slug),
        tag.count >= MIN_TAG_POSTS,
        `${tag.slug} (${tag.count} posts) indexability`,
      );
    }
  });

  it("resolves posts by tag slug and folds diacritics", () => {
    const tag = getTag("plaze");
    assert.ok(tag);
    assert.equal(tag.name, "pláže");
    const posts = listPostsByTag("plaze");
    assert.equal(posts.length, tag.count);
    assert.ok(posts.every((post) => post.tags.some((value) => /^pláže$/i.test(value))));
  });
});

describe("authors", () => {
  it("lists the editorial desk's articles", () => {
    const posts = listPostsByAuthor("redakce");
    assert.equal(posts.length, listPublishedPosts().length);
    assert.deepEqual(listPostsByAuthor("nikdo"), []);
  });
});

describe("aliases", () => {
  it("maps legacy URLs to the canonical article path", () => {
    assert.equal(resolveAlias("/blog/chorvatsko-kam-v-roce-2026/"), "/blog/chorvatsko/");
    assert.equal(resolveAlias("/blog/recko-nejkrasnejsi-plaze"), "/blog/recko/");
    assert.equal(resolveAlias("/blog/neexistuje/"), null);
  });

  it("never aliases an article to a path that no longer exists", () => {
    const slugs = new Set(listPublishedPosts().map((post) => post.slug));
    for (const post of listPublishedPosts()) {
      for (const alias of post.aliases) {
        assert.match(alias, /^\/blog\/[a-z0-9-]+\/$/, `${alias} is not a canonical alias path`);
        const target = resolveAlias(alias);
        assert.ok(target, `${alias} does not resolve`);
        assert.ok(slugs.has(target.slice("/blog/".length, -1)), `${alias} → missing post`);
        assert.notEqual(
          alias,
          `/blog/${post.slug}/`,
          `${alias} is the canonical path, not an alias`,
        );
      }
    }
  });
});

describe("pagination", () => {
  const post = (slug: string, publishedAt: string): BlogPostMeta =>
    ({ slug, publishedAt }) as BlogPostMeta;

  it("clamps the page into range", () => {
    const posts = Array.from({ length: BLOG_PAGE_SIZE * 2 + 1 }, (_, i) =>
      post(`p${i}`, "2026-01-01"),
    );
    assert.equal(paginatePosts(posts, 1).totalPages, 3);
    assert.equal(paginatePosts(posts, 99).page, 3);
    assert.equal(paginatePosts(posts, 99).items.length, 1);
    assert.equal(paginatePosts(posts, 0).page, 1);
    assert.equal(paginatePosts(posts, Number.NaN).page, 1);
  });

  it("always reports at least one page", () => {
    const { totalPages, items } = paginatePosts([], 1);
    assert.equal(totalPages, 1);
    assert.deepEqual(items, []);
  });
});

describe("related posts", () => {
  it("never repeats the current article and fills up to the limit", () => {
    for (const post of listPublishedPosts()) {
      const related = relatedPosts(post.slug, { limit: 3 });
      assert.equal(related.length, 3, `${post.slug} should have 3 related posts`);
      assert.equal(new Set(related.map((entry) => entry.slug)).size, 3);
      assert.ok(!related.some((entry) => entry.slug === post.slug));
    }
  });

  it("honours manual related slugs first", () => {
    const post = listPublishedPosts().find((entry) => entry.relatedSlugs.length > 0);
    assert.ok(post);
    const related = relatedPosts(post.slug, { limit: 4 });
    assert.ok(related.some((entry) => entry.slug === post.relatedSlugs[0]));
  });
});

describe("neighbours", () => {
  it("links each article to the ones before and after it", () => {
    const posts = listPublishedPosts();
    const middle = posts[Math.floor(posts.length / 2)];
    const { prevPost, nextPost } = neighbours(middle.slug);
    assert.ok(prevPost && nextPost);
    assert.equal(neighbours(posts[0].slug).nextPost, null);
    assert.equal(neighbours(posts[posts.length - 1].slug).prevPost, null);
    assert.deepEqual(neighbours("neexistuje"), { prevPost: null, nextPost: null });
  });
});

describe("search", () => {
  it("finds articles by destination and folds diacritics", () => {
    assert.ok(searchPosts("chorvatsko").length > 0);
    assert.ok(searchPosts("recko").some((post) => post.destinationCzechName === "Řecko"));
    assert.ok(searchPosts("Řecko").length > 0);
  });

  it("ignores queries shorter than two characters", () => {
    assert.deepEqual(searchPosts(""), []);
    assert.deepEqual(searchPosts("a"), []);
    assert.deepEqual(searchPosts("   "), []);
  });

  it("returns nothing for a query that matches no article", () => {
    assert.deepEqual(searchPosts("xyzzy"), []);
  });
});

describe("blog stats", () => {
  it("summarises the published set", () => {
    const stats = blogStats();
    assert.equal(stats.postCount, listPublishedPosts().length);
    assert.equal(stats.destinationCount, listDestinationHubs().length);
    assert.match(stats.latestPublishedAt ?? "", /^\d{4}-\d{2}-\d{2}$/);
  });
});
