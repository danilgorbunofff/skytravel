import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { manifestImageKeys, resetMediaCache, resolveImage } from "./media.js";
import type { ImageAsset } from "./types.js";

/** Content frontmatter always carries credits; tests skip them. */
function asset(src: string, alt = ""): ImageAsset {
  return { src, alt, credit: null, creditUrl: null };
}

describe("resolveImage", () => {
  it("returns null when there is no image", () => {
    assert.equal(resolveImage(null), null);
    assert.equal(resolveImage(undefined), null);
    assert.equal(resolveImage(asset("")), null);
  });

  it("resolves a manifest entry into responsive sources", () => {
    resetMediaCache();
    const image = resolveImage(asset("/assets/hub/chorvatsko.jpg", "Pobřeží"));
    assert.ok(image);
    // The raster fallback stops at 800 — WebP carries the larger sizes.
    assert.match(image.src, /-800\.jpg$/);
    assert.equal(image.width, 800);
    assert.ok(image.height > 0);
    assert.equal(image.webpSrcset.split(", ").length, 3);
    assert.match(image.webpSrcset, /-480\.webp 480w/);
    assert.match(image.jpgSrcset, /-800\.jpg 800w/);
    assert.match(image.og ?? "", /og\/chorvatsko\.jpg$/);
    assert.equal(image.alt, "Pobřeží");
  });

  it("keeps the source path and falls back to fixed dimensions for unknown images", () => {
    resetMediaCache();
    const image = resolveImage(asset("/assets/neexistuje.jpg"), "Záložní popisek");
    assert.ok(image);
    assert.equal(image.src, "/assets/neexistuje.jpg");
    assert.equal(image.width, 1200);
    assert.equal(image.height, 750);
    assert.equal(image.webpSrcset, "");
    assert.equal(image.og, null);
    assert.equal(image.alt, "Záložní popisek");
  });

  it("prefers an explicit alt over the fallback", () => {
    resetMediaCache();
    const image = resolveImage(asset("/assets/hub/recko.jpg", "Ostrov"), "Záložní");
    assert.equal(image?.alt, "Ostrov");
  });
});

describe("media manifest", () => {
  it("covers every destination hub image the content uses", () => {
    resetMediaCache();
    const keys = manifestImageKeys();
    assert.ok(keys.length >= 9);
    assert.ok(keys.includes("/assets/blog/hero-fallback.jpg"));
  });

  it("gives portrait sources landscape variants that are wide enough for the hero", () => {
    resetMediaCache();
    for (const src of ["/assets/hub/recko.jpg", "/assets/hub/turecko.jpg"]) {
      const image = resolveImage(asset(src));
      assert.ok(image, `${src} should resolve`);
      const entries = image.webpSrcset.split(", ").map((entry) => {
        const [url = "", descriptor = ""] = entry.split(" ");
        const widthFromUrl = Number(url.match(/-(\d+)\.webp$/)?.[1]);
        return { url, width: Number(descriptor.replace("w", "")), widthFromUrl };
      });
      assert.equal(entries.length, 3);
      // Each descriptor must match the file it points at...
      for (const entry of entries) assert.equal(entry.width, entry.widthFromUrl, entry.url);
      // ...and the widest variant must fill a 1160px hero on a 2x display.
      assert.equal(Math.max(...entries.map((entry) => entry.width)), 1200, src);
    }
  });

  it("is stable across cache resets", () => {
    resetMediaCache();
    const first = manifestImageKeys().length;
    resetMediaCache();
    assert.equal(manifestImageKeys().length, first);
  });
});
