import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { foldCzech, slugifyCzechTitle, destinationSlug, isValidSlug } from "./slug.js";

describe("foldCzech", () => {
  it("folds all lowercase Czech diacritics", () => {
    assert.equal(foldCzech("áčďéěíňóřšťúůýž"), "acdeeinorstuuyz");
  });

  it("folds uppercase Czech diacritics to base letters", () => {
    assert.equal(foldCzech("ÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ"), "acdeeinorstuuyz");
  });

  it("leaves ASCII text unchanged", () => {
    assert.equal(foldCzech("pruvodce-2026"), "pruvodce-2026");
  });

  it("falls back to NFD for non-Czech accents", () => {
    assert.equal(foldCzech("ö"), "o");
    assert.equal(foldCzech("é"), "e");
  });
});

describe("slugifyCzechTitle", () => {
  it("creates slugs from Czech titles", () => {
    assert.equal(
      slugifyCzechTitle("Dovolená v Černé Hoře: průvodce"),
      "dovolena-v-cerne-hore-pruvodce",
    );
  });

  it("collapses non-alphanumerics into single dashes", () => {
    assert.equal(slugifyCzechTitle("Pláže &  tipy!"), "plaze-tipy");
  });

  it("trims leading/trailing dashes", () => {
    assert.equal(slugifyCzechTitle("--Řecko--"), "recko");
  });

  it("keeps digits", () => {
    assert.equal(slugifyCzechTitle("Chorvatsko 2026"), "chorvatsko-2026");
  });
});

describe("destinationSlug", () => {
  it("matches known destinations", () => {
    assert.equal(destinationSlug("Černá Hora"), "cerna-hora");
    assert.equal(destinationSlug("Řecko"), "recko");
    assert.equal(destinationSlug("Španělsko"), "spanelsko");
  });

  it("is case-insensitive", () => {
    assert.equal(destinationSlug("BULHARSKO"), destinationSlug("Bulharsko"));
  });
});

describe("isValidSlug", () => {
  it("accepts simple and hyphenated slugs", () => {
    assert.equal(isValidSlug("blog"), true);
    assert.equal(isValidSlug("dovolena-v-bulharsku-2026"), true);
  });

  it("rejects traversal and invalid characters", () => {
    assert.equal(isValidSlug("..%2F..%2Fetc"), false);
    assert.equal(isValidSlug("has space"), false);
    assert.equal(isValidSlug("-leading-dash"), false);
    assert.equal(isValidSlug("trailing-dash-"), false);
    assert.equal(isValidSlug(""), false);
    assert.equal(isValidSlug("double--dash"), false);
  });
});
