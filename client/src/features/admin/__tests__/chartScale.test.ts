import { describe, expect, it } from "vitest";
import { niceAxisMax, pickLabelIndices } from "../chartScale";

describe("pickLabelIndices", () => {
  it("shows every label when there are few points", () => {
    expect(pickLabelIndices(0)).toEqual([]);
    expect(pickLabelIndices(4)).toEqual([0, 1, 2, 3]);
  });

  it("thins long series to at most the limit, keeping first and last", () => {
    for (const count of [7, 12, 30, 31, 90]) {
      const picked = pickLabelIndices(count, 6);
      expect(picked.length).toBeLessThanOrEqual(6);
      expect(picked[0]).toBe(0);
      expect(picked[picked.length - 1]).toBe(count - 1);
      expect([...picked].sort((a, b) => a - b)).toEqual(picked);
    }
  });
});

describe("niceAxisMax", () => {
  it("rounds up to 1/2/5 × 10^n", () => {
    expect(niceAxisMax(0)).toBe(1);
    expect(niceAxisMax(1)).toBe(1);
    expect(niceAxisMax(3)).toBe(5);
    expect(niceAxisMax(17)).toBe(20);
    expect(niceAxisMax(51)).toBe(100);
  });
});
