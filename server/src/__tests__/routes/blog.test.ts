/**
 * Integration tests for the public blog router.
 *
 * The router is mounted on a bare Express app on purpose: blog pages are pure
 * SSR over files on disk, so these tests assert that no database, session store
 * or Prisma client is needed to serve them.
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import express, { type Express } from "express";
import request from "supertest";
import blogRouter from "../../routes/blog.js";
import sitemapRouter from "../../routes/sitemap.xml.js";
import { listIndexableTags, listPublishedPosts } from "../../blog/loader.js";
import { listDestinationHubs } from "../../blog/loader.js";
import { AUTHORS } from "../../blog/authors.js";

let app: Express;

before(() => {
  app = express();
  app.use("/blog", blogRouter);
  app.use(sitemapRouter);
});

const newest = () => {
  const [first] = listPublishedPosts();
  assert.ok(first, "no published posts");
  return first;
};
const legacyAliasPost = () => listPublishedPosts().find((post) => post.aliases.length > 0);

describe("blog routes — happy paths", () => {
  it("serves the hub with cache headers and a single h1", async () => {
    const res = await request(app).get("/blog/");
    assert.equal(res.status, 200);
    assert.match(res.headers["content-type"], /^text\/html; charset=utf-8/);
    assert.match(res.headers["cache-control"], /max-age=300/);
    assert.equal((res.text.match(/<h1[\s>]/g) ?? []).length, 1);
    assert.match(res.text, /<link rel="canonical" href="https:\/\/sky-travel\.tours\/blog\/"/);
  });

  it("serves every published article", async () => {
    for (const post of listPublishedPosts()) {
      const res = await request(app).get(`/blog/${post.slug}/`);
      assert.equal(res.status, 200, `GET /blog/${post.slug}/`);
      assert.match(res.text, /application\/ld\+json/);
      assert.match(res.text, /<link rel="preload" as="image"/);
      assert.match(
        res.text,
        new RegExp(`<link rel="canonical" href="https://sky-travel\\.tours/blog/${post.slug}/"`),
      );
      // JSON-LD must survive a JSON.parse on every block.
      for (const block of res.text.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      )) {
        assert.doesNotThrow(() => JSON.parse(block[1] ?? ""), `${post.slug}: invalid JSON-LD`);
      }
    }
  });

  it("serves destination hubs, tags, authors and the about page", async () => {
    for (const hub of listDestinationHubs()) {
      assert.equal((await request(app).get(`/blog/destinace/${hub.slug}/`)).status, 200, hub.slug);
    }
    for (const tag of listIndexableTags()) {
      assert.equal((await request(app).get(`/blog/tema/${tag.slug}/`)).status, 200, tag.slug);
    }
    for (const author of AUTHORS) {
      assert.equal(
        (await request(app).get(`/blog/autor/${author.slug}/`)).status,
        200,
        author.slug,
      );
    }
    assert.equal((await request(app).get("/blog/destinace")).status, 200);
    assert.equal((await request(app).get("/blog/o-blogu/")).status, 200);
  });

  it("serves search results without indexing them", async () => {
    const res = await request(app).get("/blog/hledat/?q=chorvatsko");
    assert.equal(res.status, 200);
    assert.match(res.text, /<meta name="robots" content="noindex, follow"\/>/);
    assert.equal(res.text.includes('rel="canonical"'), false);
  });

  it("serves a well-formed RSS feed", async () => {
    const res = await request(app).get("/blog/rss.xml");
    assert.equal(res.status, 200);
    assert.match(res.headers["content-type"], /^application\/rss\+xml/);
    assert.match(res.text, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.match(res.text, /<rss version="2\.0"/);
    assert.match(
      res.text,
      new RegExp(`<link>https://sky-travel\\.tours/blog/${newest().slug}/</link>`),
    );
    assert.ok((res.text.match(/<item>/g) ?? []).length >= 1);
  });
});

describe("blog routes — canonical redirects", () => {
  it("redirects a legacy alias to the canonical article URL", async () => {
    const post = legacyAliasPost();
    assert.ok(post, "no post declares a legacy alias");
    const [alias] = post.aliases;
    assert.ok(alias, "alias missing");
    const res = await request(app).get(alias);
    assert.equal(res.status, 301);
    assert.equal(res.headers.location, `/blog/${post.slug}/`);
  });

  it("redirects diacritic hub and tag slugs to their ASCII form", async () => {
    for (const [path, expected] of [
      ["/blog/tema/pl%C3%A1%C5%BEe/", "/blog/tema/plaze/"],
      ["/blog/destinace/%C5%A1pan%C4%9Blsko/", "/blog/destinace/spanelsko/"],
    ] as const) {
      const res = await request(app).get(path);
      assert.equal(res.status, 301, path);
      assert.equal(res.headers.location, expected, path);
    }
  });

  it("keeps pagination canonical", async () => {
    const pageOne = await request(app).get("/blog/page/1/");
    assert.equal(pageOne.status, 301);
    assert.equal(pageOne.headers.location, "/blog");

    const beyond = await request(app).get("/blog/page/999/");
    assert.equal(beyond.status, 301);
    assert.match(String(beyond.headers.location), /^\/blog\/page\/\d+\/$/);
  });
});

describe("blog routes — 404 handling", () => {
  it("answers unknown article slugs with 404 and noindex", async () => {
    const res = await request(app).get("/blog/this-post-does-not-exist/");
    assert.equal(res.status, 404);
    assert.match(res.text, /<meta name="robots" content="noindex, follow"\/>/);
    assert.equal(res.text.includes('rel="canonical"'), false);
    assert.match(res.text, /<h1[\s>]/);
  });

  it("answers junk path segments with 404 instead of an error page", async () => {
    for (const path of ["/blog/..%2f..%2fetc%2fpasswd/", "/blog/unknown/unknown/"]) {
      const res = await request(app).get(path);
      assert.equal(res.status, 404, path);
    }
  });
});

describe("sitemap", () => {
  it("includes blog URLs and stays valid XML without a database", async () => {
    const res = await request(app).get("/sitemap.xml");
    assert.equal(res.status, 200);
    assert.match(res.headers["content-type"], /xml/);
    assert.match(res.text, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.match(res.text, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);

    for (const post of listPublishedPosts()) {
      assert.ok(
        res.text.includes(`<loc>https://sky-travel.tours/blog/${post.slug}/</loc>`),
        post.slug,
      );
    }
    for (const tag of listIndexableTags()) {
      assert.ok(res.text.includes(`/blog/tema/${tag.slug}/`), tag.slug);
    }
    assert.ok(res.text.includes("/blog/o-blogu/"));
    for (const author of AUTHORS) {
      assert.ok(res.text.includes(`/blog/autor/${author.slug}/`), author.slug);
    }
    // Every loc must be absolute and escaped.
    for (const [, loc = ""] of res.text.matchAll(/<loc>([^<]*)<\/loc>/g)) {
      assert.match(loc, /^https:\/\/sky-travel\.tours\//, loc);
      assert.ok(!loc.includes("&"), `unescaped ampersand in ${loc}`);
    }
  });
});
