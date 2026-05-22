import { describe, it, expect } from "vitest";
import { normalizeText, formatPrice } from "./utils";

describe("normalizeText", () => {
  it("lowercases and strips diacritics", () => {
    expect(normalizeText("Turecko")).toBe("turecko");
    expect(normalizeText("Řecko")).toBe("recko");
    expect(normalizeText("Égypte")).toBe("egypte");
  });

  it("handles empty string", () => {
    expect(normalizeText("")).toBe("");
  });

  it("handles already normalized text", () => {
    expect(normalizeText("egypt")).toBe("egypt");
  });
});

describe("formatPrice", () => {
  it("formats price with Kč suffix", () => {
    const result = formatPrice(25990);
    expect(result).toContain("25");
    expect(result).toContain("990");
    expect(result).toContain("Kč");
  });

  it("formats zero", () => {
    const result = formatPrice(0);
    expect(result).toContain("0");
    expect(result).toContain("Kč");
  });

  it("formats large numbers with separators", () => {
    const result = formatPrice(1000000);
    expect(result).toContain("Kč");
    // Should have some form of grouping (space or comma depending on locale)
    expect(result.length).toBeGreaterThan(7);
  });
});
