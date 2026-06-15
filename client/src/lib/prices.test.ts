import { describe, it, expect } from "vitest";
import { isPlausibleTourPrice, MIN_PUBLIC_TOUR_PRICE_CZK } from "./prices";

describe("isPlausibleTourPrice", () => {
  it("accepts prices at or above minimum", () => {
    expect(isPlausibleTourPrice(MIN_PUBLIC_TOUR_PRICE_CZK)).toBe(true);
    expect(isPlausibleTourPrice(25000)).toBe(true);
  });

  it("rejects prices below minimum", () => {
    expect(isPlausibleTourPrice(500)).toBe(false);
    expect(isPlausibleTourPrice(0)).toBe(false);
    expect(isPlausibleTourPrice(-1)).toBe(false);
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
  it("equals 4990", () => {
    expect(MIN_PUBLIC_TOUR_PRICE_CZK).toBe(4990);
  });
});
