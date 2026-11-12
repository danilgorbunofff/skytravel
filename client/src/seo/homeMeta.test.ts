import { describe, expect, it } from "vitest";
import { HOME_META } from "./homeMeta";

describe("HOME_META", () => {
  it("uses the required Czech home title", () => {
    expect(HOME_META.cs.title).toBe("Zájezdy z Prahy, last minute od českých CK | SkyTravel");
  });

  it.each(Object.entries(HOME_META))(
    "%s title 50–60 and description 150–160 chars",
    (_lang, meta) => {
      expect(meta.title.length).toBeGreaterThanOrEqual(50);
      expect(meta.title.length).toBeLessThanOrEqual(60);
      expect(meta.description.length).toBeGreaterThanOrEqual(150);
      expect(meta.description.length).toBeLessThanOrEqual(160);
    },
  );
});
