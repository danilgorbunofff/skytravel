import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isPlausibleProviderPriceCzk, MIN_PROVIDER_TOUR_PRICE_CZK } from "./providerPrice.js";

describe("isPlausibleProviderPriceCzk", () => {
  it("accepts prices above minimum", () => {
    assert.equal(isPlausibleProviderPriceCzk(5000), true);
    assert.equal(isPlausibleProviderPriceCzk(MIN_PROVIDER_TOUR_PRICE_CZK), true);
  });

  it("rejects prices below minimum", () => {
    assert.equal(isPlausibleProviderPriceCzk(500), false);
    assert.equal(isPlausibleProviderPriceCzk(0), false);
    assert.equal(isPlausibleProviderPriceCzk(-100), false);
  });

  it("rejects null and undefined", () => {
    assert.equal(isPlausibleProviderPriceCzk(null), false);
    assert.equal(isPlausibleProviderPriceCzk(undefined), false);
  });

  it("rejects NaN and Infinity", () => {
    assert.equal(isPlausibleProviderPriceCzk(NaN), false);
    assert.equal(isPlausibleProviderPriceCzk(Infinity), false);
    assert.equal(isPlausibleProviderPriceCzk(-Infinity), false);
  });
});

describe("MIN_PROVIDER_TOUR_PRICE_CZK", () => {
  it("defaults to 1000", () => {
    assert.equal(MIN_PROVIDER_TOUR_PRICE_CZK, 1000);
  });
});
