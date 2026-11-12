import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getLandingPage,
  listLandingPages,
  parseLandingPage,
  seoWarnings,
} from "./landingContent.js";

const RAW = `---
title: "Туры в Египет из Праги — цены всех чешских CK | SkyTravel"
description: "Туры в Египет из Праги от всех чешских туроператоров по их ценам: Хургада, Шарм-эль-Шейх, Марса-Алам, all inclusive. Подбор тура на русском языке, без наценки."
h1: "Туры в Египет из Праги"
alternates:
  cs: egypt
  xx: nope
deals:
  destinationSlug: turecko
faq:
  - q: "Нужна ли виза?"
    a: "Да, **по прилёте**."
---

# Body heading

Text with a [link](/ru/).
`;

describe("parseLandingPage", () => {
  it("maps front-matter to page data", () => {
    const { page } = parseLandingPage("ru", "egipet", RAW);
    assert.equal(page.path, "/ru/egipet/");
    assert.equal(page.h1, "Туры в Египет из Праги");
    assert.deepEqual(page.alternates, { ru: "/ru/egipet/", cs: "/cs/egypt/" });
    assert.equal(page.deals.searchHref, "/search?destinationSlug=turecko");
    assert.equal(page.deals.lastMinute, false);
    assert.match(page.faq[0].a, /<strong>по прилёте<\/strong>/);
  });

  it("demotes markdown H1 so the page keeps exactly one H1", () => {
    const { page } = parseLandingPage("ru", "egipet", RAW);
    assert.doesNotMatch(page.bodyHtml, /<h1/);
    assert.match(page.bodyHtml, /<h2[^>]*>Body heading<\/h2>/);
  });

  it("rejects front-matter without required fields", () => {
    assert.throws(() => parseLandingPage("cs", "x", "---\ntitle: Hi\n---\nbody"));
  });
});

describe("content/pages", () => {
  it("ships the example pages with breadcrumbs and reciprocal hreflang", () => {
    const egyptRu = getLandingPage("ru", "egipet");
    const egyptCs = getLandingPage("cs", "egypt");
    const hotRu = getLandingPage("ru", "goryashchie-tury");
    assert.ok(egyptRu && egyptCs && hotRu);
    assert.equal(egyptRu.alternates.cs, "/cs/egypt/");
    assert.equal(egyptCs.alternates.ru, "/ru/egipet/");
    assert.deepEqual(
      egyptRu.breadcrumbs.map((b) => b.href),
      ["/ru/", "/ru/egipet/"],
    );
    assert.equal(hotRu.deals.lastMinute, true);
  });

  it("every page meets the title/description length targets and has a FAQ", () => {
    for (const page of listLandingPages()) {
      assert.deepEqual(seoWarnings(page), [], page.path);
      assert.ok(page.faq.length > 0, `${page.path} has no FAQ`);
    }
  });

  it("returns null for unknown or unsafe slugs", () => {
    assert.equal(getLandingPage("ru", "does-not-exist"), null);
    assert.equal(getLandingPage("ru", "../../etc/passwd"), null);
    assert.equal(getLandingPage("ru", "Egipet"), null);
  });
});
