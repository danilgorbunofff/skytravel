import { describe, it, expect } from "vitest";
import { discountPercent, isPlausibleTourPrice, MIN_PUBLIC_TOUR_PRICE_CZK } from "./prices";

describe("isPlausibleTourPrice", () => {
  it("accepts prices at or above minimum", () => {
    expect(isPlausibleTourPrice(MIN_PUBLIC_TOUR_PRICE_CZK)).toBe(true);
    expect(isPlausibleTourPrice(25000)).toBe(true);
  });

  it("rejects prices below minimum", () => {
    expect(isPlausibleTourPrice(500)).toBe(false);
    expect(isPlausibleTourPrice(0)).toBe(false);
    expect(isPlausibleTourPrice(-1)).toBe(false);
    expect(isPlausibleTourPrice(1999)).toBe(false);
    expect(isPlausibleTourPrice(2000)).toBe(true);
  });

  it("rejects null and undefined", () => {
    expect(isPlausibleTourPrice(null)).toBe(false);
    expect(isPlausibleTourPrice(undefined)).toBe(false);
  });

  it("rejects NaN and Infinity", () => {
    expect(isPlausibleTourPrice(NaN)).toBe(false);
    expect(isPlausibleTourPrice(Infinity)).toBe(false);
  });
});

describe("MIN_PUBLIC_TOUR_PRICE_CZK", () => {
  it("equals 2000", () => {
    expect(MIN_PUBLIC_TOUR_PRICE_CZK).toBe(2000);
  });
});

describe("discountPercent", () => {
  it("returns the rounded saving when the original price is higher", () => {
    expect(discountPercent(18000, 24000)).toBe(25);
  });

  it("ignores missing, equal, lower or implausible original prices", () => {
    expect(discountPercent(18000, 0)).toBeNull();
    expect(discountPercent(18000, 18000)).toBeNull();
    expect(discountPercent(18000, 15000)).toBeNull();
    expect(discountPercent(500, 24000)).toBeNull();
  });

  it("hides rounding noise and absurd discounts", () => {
    expect(discountPercent(19800, 20000)).toBeNull();
    expect(discountPercent(2500, 90000)).toBeNull();
  });
});
