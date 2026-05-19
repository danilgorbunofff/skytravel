import assert from "node:assert/strict";
import test from "node:test";
import { extractOriginalPrice, extractPrice } from "./alexandria.js";
import { normalizeOrexPrice, parseSamoPrice } from "./orextravel.js";

test("parseSamoPrice handles supported SAMO price formats", () => {
  assert.equal(parseSamoPrice("3115.6000"), 3115.6);
  assert.equal(parseSamoPrice("31.000"), 31000);
  assert.equal(parseSamoPrice("1.250,50"), 1250.5);
  assert.equal(parseSamoPrice(93000), 93000);
  assert.equal(parseSamoPrice(undefined), 0);
});

test("normalizeOrexPrice converts implausibly low CZK-labelled values as EUR", () => {
  assert.equal(normalizeOrexPrice(65, 1, "Kč", { currencyId: 203 }), 1658);
});

test("normalizeOrexPrice keeps per-person EUR values plausible", () => {
  assert.equal(normalizeOrexPrice(65, 2, "EUR", { currencyId: 978, adults: 2 }), 1658);
});

test("normalizeOrexPrice ignores inflated peopleCount values", () => {
  assert.equal(normalizeOrexPrice(1600, 25, "EUR", { currencyId: 978 }), 40800);
});

test("normalizeOrexPrice respects plausible CZK totals", () => {
  assert.equal(normalizeOrexPrice(3000, 2, "CZK", { currencyId: 203, adults: 2 }), 1500);
});

test("Alexandria price extraction prefers adult/base prices over child prices", () => {
  const termin = {
    cena: [
      { "@_typ": "Dítě", "@_cena": "500", "@_cena_katalog": "900" },
      { "@_typ": "Dospělý základ", "@_cena": "15000", "@_cena_katalog": "18000" },
    ],
  };

  assert.equal(extractPrice(termin), 15000);
  assert.equal(extractOriginalPrice(termin), 18000);
});

test("Alexandria price extraction drops implausible prices", () => {
  const termin = {
    cena: [{ "@_typ": "Dospělý", "@_cena": "650", "@_cena_katalog": "800" }],
  };

  assert.equal(extractPrice(termin), 0);
  assert.equal(extractOriginalPrice(termin), 0);
});
