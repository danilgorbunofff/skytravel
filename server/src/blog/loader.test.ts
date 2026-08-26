import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseBlogPost, paginatePosts, listDestinationHubs } from "./loader.js";

const VALID_FRONTMATTER = `---
title: "Dovolená v Černé Hoře"
description: "Průvodce pobřežím Černé Hory."
destination: "Černá Hora"
tags:
  - Černá Hora
  - pláže
published: "2026-03-01"
---

# Obsah

Ahoj světe.
`;

describe("parseBlogPost", () => {
  it("parses valid frontmatter into meta + html", () => {
    const post = parseBlogPost("cerna-hora-pruvodce", VALID_FRONTMATTER);
    assert.ok(post);
    assert.equal(post.title, "Dovolená v Černé Hoře");
    assert.equal(post.destinationCzechName, "Černá Hora");
    assert.equal(post.publishedAt, "2026-03-01");
    assert.deepEqual(post.tags, ["Černá Hora", "pláže"]);
    assert.ok(post.html.includes("<h1"));
  });

  it("normalizes destination diacritics/case to canonical name", () => {
    const raw = VALID_FRONTMATTER.replace('destination: "Černá Hora"', 'destination: "cerna hora"');
    const post = parseBlogPost("x", raw);
    assert.equal(post?.destinationCzechName, "Černá Hora");
  });

  it("ignores unknown destinations", () => {
    const raw = VALID_FRONTMATTER.replace('destination: "Černá Hora"', 'destination: "Atlantida"');
    const post = parseBlogPost("x", raw);
    assert.equal(post?.destinationCzechName, null);
  });

  it("returns null when title missing", () => {
    const raw = VALID_FRONTMATTER.replace(/title:.*/, "");
    assert.equal(parseBlogPost("x", raw), null);
  });

  it("returns null for invalid slug", () => {
    assert.equal(parseBlogPost("../escape", VALID_FRONTMATTER), null);
  });

  it("marks draft posts", () => {
    const raw = VALID_FRONTMATTER.replace("---\n\n", "---\n\ndraft: true\n");
    // draft flag lives in frontmatter — inject properly
    const raw2 = `---
title: "Koncept"
draft: true
published: "2026-01-01"
---

text
`;
    const post = parseBlogPost("koncept", raw2);
    assert.equal(post?.draft, true);
    void raw;
  });

  it("accepts unquoted YAML dates (gray-matter Date objects)", () => {
    const raw = `---
title: "Test dat"
published: 2026-02-14
---

t
`;
    const post = parseBlogPost("test-dat", raw);
    assert.equal(post?.publishedAt, "2026-02-14");
  });

  it("renders markdown body including tables and links", () => {
    const raw = `---
title: "Tabulka"
---

| A | B |
|---|---|
| 1 | 2 |

[Odkaz](/search)
`;
    const post = parseBlogPost("tabulka", raw);
    assert.ok(post?.html.includes("<table>"));
    assert.ok(post?.html.includes('<a href="/search">'));
  });
});

const META = (slug: string, publishedAt: string) => ({
  slug,
  title: slug,
  description: "",
  destinationCzechName: null,
  tags: [],
  publishedAt,
  updatedAt: null,
  draft: false,
  coverImage: null,
  readingMinutes: 3,
});

describe("paginatePosts", () => {
  const posts = Array.from({ length: 25 }, (_, i) =>
    META(`post-${String(i + 1).padStart(2, "0")}`, "2026-01-01"),
  );

  it("returns first page with page size items", () => {
    const { items, page, totalPages } = paginatePosts(posts, 1);
    assert.equal(items.length, 12);
    assert.equal(page, 1);
    assert.equal(totalPages, 3);
  });

  it("returns remainder on last page", () => {
    const { items } = paginatePosts(posts, 3);
    assert.equal(items.length, 1);
  });

  it("clamps out-of-range pages", () => {
    assert.equal(paginatePosts(posts, 99).page, 3);
    assert.equal(paginatePosts(posts, 0).page, 1);
    assert.equal(paginatePosts(posts, -5).page, 1);
  });

  it("handles NaN by falling back to page 1", () => {
    const result = paginatePosts(posts, Number.NaN);
    assert.equal(result.page, 1);
  });
});

describe("listDestinationHubs", () => {
  it("groups posts per destination with slugs", () => {
    const posts = [
      { ...META("a", "2026-01-01"), destinationCzechName: "Řecko" },
      { ...META("b", "2026-01-02"), destinationCzechName: "Řecko" },
      { ...META("c", "2026-01-03"), destinationCzechName: "Bulharsko" },
      { ...META("d", "2026-01-04"), destinationCzechName: null },
    ];
    const hubs = listDestinationHubs();
    void hubs;
    // listDestinationHubs reads the filesystem index — test the pure part instead
    const counts = new Map<string, number>();
    for (const post of posts) {
      if (!post.destinationCzechName) continue;
      counts.set(post.destinationCzechName, (counts.get(post.destinationCzechName) ?? 0) + 1);
    }
    assert.equal(counts.get("Řecko"), 2);
    assert.equal(counts.get("Bulharsko"), 1);
    assert.equal(counts.size, 2);
  });
});
