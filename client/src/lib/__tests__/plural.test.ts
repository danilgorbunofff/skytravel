import { describe, expect, it } from "vitest";
import { plural } from "../plural";
import cs from "../../data/translations/cs";
import en from "../../data/translations/en";
import ru from "../../data/translations/ru";
import uk from "../../data/translations/uk";

const tOf = (dict: Record<string, string>) => (key: string) => dict[key] ?? key;
const forms = (dict: Record<string, string>, locale: string, base: string) =>
  [0, 1, 2, 5, 21].map((n) => plural(n, base, tOf(dict), locale));

describe("plural", () => {
  it("Czech: 1 / 2-4 / 0 and 5+", () => {
    expect(forms(cs, "cs-CZ", "pNights")).toEqual(["nocí", "noc", "noci", "nocí", "nocí"]);
  });

  it("English: singular only for 1", () => {
    expect(forms(en, "en-US", "pNights")).toEqual([
      "nights",
      "night",
      "nights",
      "nights",
      "nights",
    ]);
  });

  it("Russian and Ukrainian: 21 takes the singular form", () => {
    expect(forms(ru, "ru-RU", "pNights")).toEqual(["ночей", "ночь", "ночи", "ночей", "ночь"]);
    expect(forms(uk, "uk-UA", "pNights")).toEqual(["ночей", "ніч", "ночі", "ночей", "ніч"]);
  });

  it("every plural base has an _other form in every language", () => {
    for (const dict of [cs, en, ru, uk] as Record<string, string>[]) {
      const bases = new Set(
        Object.keys(dict)
          .filter((k) => /^p[A-Z]\w*_(one|few|many|other)$/.test(k))
          .map((k) => k.replace(/_\w+$/, "")),
      );
      expect(bases.size).toBeGreaterThan(0);
      for (const base of bases) expect(dict[`${base}_other`]).toBeTruthy();
    }
  });
});
