import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getI18nField, setI18nField } from "./i18n.js";

describe("getI18nField", () => {
  it("reads existing field", () => {
    const i18n = { cs: { title: "Zájezd" } };
    assert.equal(getI18nField(i18n, "cs", "title"), "Zájezd");
  });

  it("returns null for missing locale", () => {
    const i18n = { cs: { title: "Zájezd" } };
    assert.equal(getI18nField(i18n, "en", "title"), null);
  });

  it("returns null for missing field", () => {
    const i18n = { cs: { title: "Zájezd" } };
    assert.equal(getI18nField(i18n, "cs", "description"), null);
  });

  it("returns null for null i18n", () => {
    assert.equal(getI18nField(null, "cs", "title"), null);
  });

  it("returns null for non-object i18n", () => {
    assert.equal(getI18nField("string", "cs", "title"), null);
  });

  it("returns null for non-object locale entry", () => {
    const i18n = { cs: "invalid" };
    assert.equal(getI18nField(i18n, "cs", "title"), null);
  });
});

describe("setI18nField", () => {
  it("sets field on empty i18n", () => {
    const result = setI18nField(null, "cs", "title", "Nový zájezd");
    assert.deepEqual(result, { cs: { title: "Nový zájezd" } });
  });

  it("preserves existing locales", () => {
    const i18n = { en: { title: "Trip" } };
    const result = setI18nField(i18n, "cs", "title", "Zájezd");
    assert.equal(result.en?.title, "Trip");
    assert.equal(result.cs?.title, "Zájezd");
  });

  it("overwrites existing field", () => {
    const i18n = { cs: { title: "Old", description: "Desc" } };
    const result = setI18nField(i18n, "cs", "title", "New");
    assert.equal(result.cs?.title, "New");
    assert.equal(result.cs?.description, "Desc");
  });

  it("does not mutate original", () => {
    const i18n = { cs: { title: "Original" } };
    setI18nField(i18n, "cs", "title", "Changed");
    assert.equal(i18n.cs.title, "Original");
  });
});
