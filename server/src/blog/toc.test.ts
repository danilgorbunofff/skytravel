import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { addHeadingIdsAndToc, renderTocNav } from "./toc.js";

describe("addHeadingIdsAndToc", () => {
  it("adds Czech-aware ids to h2/h3 and leaves other tags untouched", () => {
    const { html, entries } = addHeadingIdsAndToc(
      "<h2>Pláže v Řecku</h2><p>Text.</p><h3>Časování</h3>",
    );
    assert.ok(html.includes('<h2 id="plaze-v-recku">'));
    assert.ok(html.includes('<h3 id="casovani">'));
    assert.ok(html.includes("<p>Text.</p>"));
    assert.deepEqual(entries, [
      { id: "plaze-v-recku", text: "Pláže v Řecku", level: 2 },
      { id: "casovani", text: "Časování", level: 3 },
    ]);
  });

  it("folds diacritics into ASCII slugs", () => {
    const { html } = addHeadingIdsAndToc("<h2>Čeština &amp; diakritika</h2>");
    assert.ok(html.includes('id="cestina-diakritika"'));
  });

  it("deduplicates identical headings with numeric suffixes", () => {
    const { html, entries } = addHeadingIdsAndToc("<h2>Sekce</h2><h2>Sekce</h2><h2>Sekce</h2>");
    assert.deepEqual(
      entries.map((e) => e.id),
      ["sekce", "sekce-2", "sekce-3"],
    );
    assert.ok(html.includes('<h2 id="sekce-2">'));
    assert.ok(html.includes('<h2 id="sekce-3">'));
  });

  it("keeps existing ids untouched and registers them as taken", () => {
    const { html, entries } = addHeadingIdsAndToc('<h2 id="vlastni">Vlastní</h2><h2>Vlastní</h2>');
    assert.ok(html.includes('<h2 id="vlastni">'));
    // second heading must not reuse the explicit id
    assert.deepEqual(
      entries.map((e) => e.id),
      ["vlastni", "vlastni-2"],
    );
  });

  it("falls back to a generic id for headings with only symbols", () => {
    const { entries } = addHeadingIdsAndToc("<h2>??? ***</h2>");
    assert.equal(entries[0]?.id, "sekce");
  });

  it("strips inline markup from TOC text", () => {
    const { entries } = addHeadingIdsAndToc("<h2>Jak <em>nejlépe</em> cestovat</h2>");
    assert.equal(entries[0]?.text, "Jak nejlépe cestovat");
  });
});

describe("renderTocNav", () => {
  it("returns empty string for fewer than 3 entries", () => {
    assert.equal(renderTocNav([]), "");
    assert.equal(
      renderTocNav([
        { id: "a", text: "A", level: 2 },
        { id: "b", text: "B", level: 2 },
      ]),
      "",
    );
  });

  it("renders nav with aria-label and anchors for 3+ entries", () => {
    const nav = renderTocNav([
      { id: "prvni", text: "První", level: 2 },
      { id: "druha", text: "Druhá", level: 2 },
      { id: "podsekce", text: "Podsekce", level: 3 },
    ]);
    assert.ok(nav.includes('aria-label="Obsah článku"'));
    assert.ok(nav.includes('href="#prvni"'));
    assert.ok(nav.includes('href="#podsekce"'));
    assert.ok(nav.includes("toc__item--l3"));
  });
});
