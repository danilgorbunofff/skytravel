import { describe, it, expect } from "vitest";
import { countLabel, fmtDate, pluralForm, starsDisplay } from "./formatters";

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

describe("pluralForm", () => {
  it("follows Czech grammar: 1 noc, 2–4 noci, 0 and 5+ nocí", () => {
    expect(pluralForm(1, "cs-CZ")).toBe("One");
    expect(pluralForm(3, "cs-CZ")).toBe("Few");
    expect(pluralForm(0, "cs-CZ")).toBe("Many");
    expect(pluralForm(5, "cs-CZ")).toBe("Many");
    expect(pluralForm(21, "cs-CZ")).toBe("Many");
  });

  it("follows Russian grammar for 21 and 22", () => {
    expect(pluralForm(21, "ru-RU")).toBe("One");
    expect(pluralForm(22, "ru-RU")).toBe("Few");
    expect(pluralForm(25, "ru-RU")).toBe("Many");
    expect(pluralForm(11, "ru-RU")).toBe("Many");
  });

  it("uses the plural for everything but 1 in English", () => {
    expect(pluralForm(1, "en-US")).toBe("One");
    expect(pluralForm(2, "en-US")).toBe("Many");
    expect(pluralForm(0, "en-US")).toBe("Many");
  });
});

describe("countLabel", () => {
  const dict: Record<string, string> = {
    zajezdOne: "zájezd",
    zajezdFew: "zájezdy",
    zajezdMany: "zájezdů",
  };
  const t = (key: string) => dict[key] ?? key;

  it("joins the number with the right noun form", () => {
    expect(countLabel(t, 0, "zajezd")).toBe("0 zájezdů");
    expect(countLabel(t, 2, "zajezd")).toBe("2 zájezdy");
    expect(countLabel(t, 1, "zajezd")).toBe("1 zájezd");
  });
});
