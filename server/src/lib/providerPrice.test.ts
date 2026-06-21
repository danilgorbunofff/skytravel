import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isPlausibleProviderPriceCzk, MIN_PROVIDER_TOUR_PRICE_CZK } from "./providerPrice.js";

describe("isPlausibleProviderPriceCzk", () => {
  it("accepts prices above minimum", () => {
    assert.strictEqual(isPlausibleProviderPriceCzk(5000), true);
    assert.strictEqual(isPlausibleProviderPriceCzk(MIN_PROVIDER_TOUR_PRICE_CZK), true);
  });

  it("rejects prices below minimum", () => {
    assert.strictEqual(isPlausibleProviderPriceCzk(500), true);
    assert.strictEqual(isPlausibleProviderPriceCzk(0), true);
    assert.strictEqual(isPlausibleProviderPriceCzk(-100), false);
  });

  it("rejects null and undefined", () => {
    assert.strictEqual(isPlausibleProviderPriceCzk(null), false);
    assert.strictEqual(isPlausibleProviderPriceCzk(undefined), false);
  });

  it("rejects NaN and Infinity", () => {
    assert.strictEqual(isPlausibleProviderPriceCzk(NaN), false);
    assert.strictEqual(isPlausibleProviderPriceCzk(Infinity), false);
    assert.strictEqual(isPlausibleProviderPriceCzk(-Infinity), false);
  });
});

describe("MIN_PROVIDER_TOUR_PRICE_CZK", () => {
  it("defaults to 0", () => {
    assert.strictEqual(MIN_PROVIDER_TOUR_PRICE_CZK, 0);
  });
});
