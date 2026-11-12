import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { countWords, parseBlogMeta, parseBlogPostFile, readingMinutesFor } from "./frontmatter.js";

/** Minimal valid markdown document with the given frontmatter body. */
function md(frontmatter: string, body = "Tělo článku s několika slovy o cestování."): string {
  return `---\n${frontmatter}\n---\n\n${body}\n`;
}

describe("countWords", () => {
  it("ignores markdown syntax and counts prose words", () => {
    const body =
      "# Nadpis\n\n- první položka\n- druhá položka\n\n**tučné** [odkaz](https://example.com).";
    // "Nadpis první položka druhá položka tučné odkaz" — punctuation and markers dropped.
    assert.equal(countWords(body), 7);
  });

  it("returns 0 for an empty body", () => {
    assert.equal(countWords(""), 0);
    assert.equal(countWords("   \n\n  "), 0);
  });

  it("counts CJK-free Czech text the same as words split on whitespace", () => {
    assert.equal(countWords("Dobrý den, světe!"), 3);
  });
});

describe("readingMinutesFor", () => {
  it("never returns less than one minute", () => {
    assert.equal(readingMinutesFor(0), 1);
    assert.equal(readingMinutesFor(10), 1);
  });

  it("rounds up at the Czech long-form reading speed", () => {
    assert.equal(readingMinutesFor(190), 1);
    assert.equal(readingMinutesFor(191), 2);
    assert.equal(readingMinutesFor(1200), 7);
  });
});

describe("parseBlogPostFile", () => {
  it("parses a v2 article and derives reading time from the body", () => {
    const parsed = parseBlogPostFile(
      "test-clanek",
      md(
        [
          'title: "Testovací článek o cestování"',
          'description: "Popisek, který má dostatečnou délku na to, aby prošel bez varování do logu."',
          'destination: "Řecko"',
          "tags: [průvodce, pláže]",
          'publishedAt: "2026-03-01"',
          'updatedAt: "2026-04-02"',
          "keyFacts:",
          '  - "Moře: Egejské"',
          '  - label: "Sezona"',
          '    value: "květen–říjen"',
          "faq:",
          "  - question: Jak se dostanu na ostrov?",
          "    answer: Trajektem nebo letecky.",
          "related: [druhy-clanek]",
          'aliases: ["/blog/stary-slug/"]',
        ].join("\n"),
      ),
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;

    const { meta, body } = parsed.post;
    assert.equal(meta.slug, "test-clanek");
    assert.equal(meta.destinationCzechName, "Řecko");
    assert.deepEqual(meta.tags, ["průvodce", "pláže"]);
    assert.equal(meta.publishedAt, "2026-03-01");
    assert.equal(meta.updatedAt, "2026-04-02");
    assert.equal(meta.draft, false);
    assert.equal(meta.author.slug, "redakce");
    assert.deepEqual(meta.keyFacts, [
      { label: "Moře", value: "Egejské" },
      { label: "Sezona", value: "květen–říjen" },
    ]);
    assert.deepEqual(meta.faq, [
      { question: "Jak se dostanu na ostrov?", answer: "Trajektem nebo letecky." },
    ]);
    assert.deepEqual(meta.relatedSlugs, ["druhy-clanek"]);
    assert.deepEqual(meta.aliases, ["/blog/stary-slug/"]);
    assert.ok(meta.wordCount > 5);
    assert.ok(meta.readingMinutes >= 1);
    assert.match(body, /Tělo článku/);
  });

  it("prefixes aliases without a leading slash and drops the canonical one", () => {
    const meta = parseBlogMeta(
      "test-clanek",
      md(
        [
          'title: "Testovací článek o cestování"',
          "aliases: [blog/stary-slug, /blog/test-clanek/, /blog/jiny-slug/]",
        ].join("\n"),
      ),
    );
    assert.ok(meta);
    assert.deepEqual(meta.aliases, ["/blog/stary-slug/", "/blog/jiny-slug/"]);
  });

  it("derives a description when none is provided", () => {
    const meta = parseBlogMeta(
      "test-clanek",
      md('title: "Testovací článek o cestování"', "První odstavec s obsahem.\n\nDruhý odstavec."),
    );
    assert.ok(meta);
    assert.match(meta.description, /První odstavec/);
  });

  it("ignores unknown destinations instead of attaching the post to them", () => {
    const meta = parseBlogMeta(
      "test-clanek",
      md(['title: "Testovací článek o cestování"', 'destination: "Atlantida"'].join("\n")),
    );
    assert.ok(meta);
    assert.equal(meta.destinationCzechName, null);
  });

  it("folds destination names to the known list even with different casing", () => {
    const meta = parseBlogMeta(
      "test-clanek",
      md(['title: "Testovací článek o cestování"', 'destination: "recko"'].join("\n")),
    );
    assert.ok(meta);
    assert.equal(meta.destinationCzechName, "Řecko");
  });

  it("caps keyFacts at six and drops entries without a label separator", () => {
    const facts = Array.from({ length: 8 }, (_, index) => `  - "Klíč${index}: hodnota"`);
    const meta = parseBlogMeta(
      "test-clanek",
      md(
        [
          'title: "Testovací článek o cestování"',
          "keyFacts:",
          ...facts,
          '  - "bez dvojtečky"',
        ].join("\n"),
      ),
    );
    assert.ok(meta);
    assert.equal(meta.keyFacts.length, 6);
    assert.equal(meta.keyFacts[0].label, "Klíč0");
  });

  it("marks drafts from boolean and string frontmatter", () => {
    assert.equal(
      parseBlogMeta(
        "test-clanek",
        md(['title: "Testovací článek o cestování"', "draft: true"].join("\n")),
      )?.draft,
      true,
    );
    assert.equal(
      parseBlogMeta(
        "test-clanek",
        md(['title: "Testovací článek o cestování"', 'draft: "true"'].join("\n")),
      )?.draft,
      true,
    );
  });

  it("treats updatedAt equal to publishedAt as not updated", () => {
    const meta = parseBlogMeta(
      "test-clanek",
      md(
        [
          'title: "Testovací článek o cestování"',
          'publishedAt: "2026-03-01"',
          'updatedAt: "2026-03-01"',
        ].join("\n"),
      ),
    );
    assert.ok(meta);
    assert.equal(meta.updatedAt, null);
  });

  it("rejects an invalid slug", () => {
    const parsed = parseBlogPostFile("Špatný slug", md('title: "Testovací článek"'));
    assert.equal(parsed.ok, false);
  });

  it("rejects frontmatter without a title", () => {
    const parsed = parseBlogPostFile("test-clanek", md("tags: [průvodce]"));
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    assert.equal(parsed.reason, "frontmatter-invalid");
  });

  it("returns null from parseBlogMeta when parsing fails", () => {
    assert.equal(parseBlogMeta("test-clanek", md("tags: [průvodce]")), null);
  });

  it("keeps the noindex and canonical flags", () => {
    const meta = parseBlogMeta(
      "test-clanek",
      md(
        [
          'title: "Testovací článek o cestování"',
          "noindex: true",
          'canonical: "/blog/jiny-slug/"',
        ].join("\n"),
      ),
    );
    assert.ok(meta);
    assert.equal(meta.noindex, true);
    assert.equal(meta.canonicalPath, "/blog/jiny-slug/");
  });
});
