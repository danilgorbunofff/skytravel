import { describe, it, expect } from "vitest";
import { fmtDate, starsDisplay } from "./formatters";

describe("fmtDate", () => {
  it("formats a valid ISO date to cs-CZ locale", () => {
    const result = fmtDate("2026-07-15");
    // cs-CZ format: 15. 7. 2026
    expect(result).toMatch(/15/);
    expect(result).toMatch(/7/);
    expect(result).toMatch(/2026/);
  });

  it("returns original string for invalid date", () => {
    expect(fmtDate("not-a-date")).toBe("not-a-date");
  });

  it("handles empty string gracefully", () => {
    expect(fmtDate("")).toBe("");
  });
});

describe("starsDisplay", () => {
  it("shows 5 stars for value 5", () => {
    expect(starsDisplay(5)).toBe("★★★★★");
  });

  it("shows 3 filled + 2 empty for value 3", () => {
    expect(starsDisplay(3)).toBe("★★★☆☆");
  });

  it("shows 1 filled + 4 empty for value 1", () => {
    expect(starsDisplay(1)).toBe("★☆☆☆☆");
  });

  it("handles string numbers", () => {
    expect(starsDisplay("4")).toBe("★★★★☆");
  });

  it("returns empty string for null/undefined", () => {
    expect(starsDisplay(null)).toBe("");
    expect(starsDisplay(undefined)).toBe("");
  });

  it("returns empty string for out-of-range", () => {
    expect(starsDisplay(0)).toBe("");
    expect(starsDisplay(6)).toBe("");
    expect(starsDisplay(-1)).toBe("");
  });

  it("returns empty string for non-numeric string", () => {
    expect(starsDisplay("abc")).toBe("");
  });
});
