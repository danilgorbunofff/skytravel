import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeOfferText,
  buildOfferGroupKey,
  groupOfferRows,
  countOfferGroupsBy,
  sortOfferGroups,
  sortOfferRows,
} from "./offerGrouping.js";

describe("normalizeOfferText", () => {
  it("strips diacritics and lowercases", () => {
    assert.equal(normalizeOfferText("Hôtel Étoile"), "hotel etoile");
  });

  it("collapses whitespace", () => {
    assert.equal(normalizeOfferText("  hello   world  "), "hello world");
  });

  it("handles Czech characters", () => {
    assert.equal(normalizeOfferText("Turecko Křídla"), "turecko kridla");
  });

  it("handles empty string", () => {
    assert.equal(normalizeOfferText(""), "");
  });
});

describe("buildOfferGroupKey", () => {
  it("joins normalized source|title|destination", () => {
    const key = buildOfferGroupKey({
      source: "Alexandria",
      title: "Hotel Águila",
      destination: "Egypt",
    });
    assert.equal(key, "alexandria|hotel aguila|egypt");
  });

  it("produces same key for equivalent inputs with different casing", () => {
    const key1 = buildOfferGroupKey({ source: "orex", title: "ABC", destination: "Turkey" });
    const key2 = buildOfferGroupKey({ source: "OREX", title: "abc", destination: "TURKEY" });
    assert.equal(key1, key2);
  });
});

describe("groupOfferRows", () => {
  const rows = [
    {
      source: "alex",
      title: "Beach Resort",
      destination: "Egypt",
      price: 15000,
      startDate: "2026-07-01",
    },
    {
      source: "alex",
      title: "Beach Resort",
      destination: "Egypt",
      price: 12000,
      startDate: "2026-07-08",
    },
    {
      source: "alex",
      title: "Mountain Lodge",
      destination: "Turkey",
      price: 9000,
      startDate: "2026-08-01",
    },
  ];

  it("groups by normalized key", () => {
    const groups = groupOfferRows(rows);
    assert.equal(groups.length, 2);
  });

  it("picks cheapest as representative", () => {
    const groups = groupOfferRows(rows);
    const egyptGroup = groups.find((g) => g.key.includes("egypt"));
    assert.ok(egyptGroup, "egypt group should exist");
    assert.equal(egyptGroup.representative.price, 12000);
  });

  it("includes all offers in group", () => {
    const groups = groupOfferRows(rows);
    const egyptGroup = groups.find((g) => g.key.includes("egypt"));
    assert.ok(egyptGroup, "egypt group should exist");
    assert.equal(egyptGroup.offers.length, 2);
  });

  it("handles empty input", () => {
    const groups = groupOfferRows([]);
    assert.equal(groups.length, 0);
  });

  it("single row becomes its own group", () => {
    const groups = groupOfferRows([rows[2]]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].offers.length, 1);
    assert.equal(groups[0].representative, rows[2]);
  });
});

describe("countOfferGroupsBy", () => {
  const rows = [
    {
      source: "alex",
      title: "Hotel A",
      destination: "Egypt",
      price: 10000,
      startDate: "2026-07-01",
    },
    {
      source: "alex",
      title: "Hotel A",
      destination: "Egypt",
      price: 11000,
      startDate: "2026-07-02",
    },
    {
      source: "alex",
      title: "Hotel B",
      destination: "Egypt",
      price: 9000,
      startDate: "2026-07-03",
    },
    {
      source: "orex",
      title: "Hotel C",
      destination: "Turkey",
      price: 8000,
      startDate: "2026-08-01",
    },
  ];

  it("counts distinct groups per bucket", () => {
    const counts = countOfferGroupsBy(rows, (r) => r.destination.toLowerCase());
    assert.equal(counts.get("egypt"), 2);
    assert.equal(counts.get("turkey"), 1);
  });
});

describe("sortOfferGroups", () => {
  const groups = [
    {
      key: "a",
      representative: {
        source: "x",
        title: "A",
        destination: "A",
        price: 20000,
        startDate: "2026-08-01",
      },
      offers: [],
    },
    {
      key: "b",
      representative: {
        source: "x",
        title: "B",
        destination: "B",
        price: 10000,
        startDate: "2026-07-01",
      },
      offers: [],
    },
  ];

  it("sorts by price ascending", () => {
    const sorted = sortOfferGroups(groups, "price", "asc");
    assert.equal(sorted[0].key, "b");
  });

  it("sorts by price descending", () => {
    const sorted = sortOfferGroups(groups, "price", "desc");
    assert.equal(sorted[0].key, "a");
  });

  it("sorts by date ascending", () => {
    const sorted = sortOfferGroups(groups, "date", "asc");
    assert.equal(sorted[0].key, "b");
  });

  it("sorts by date descending", () => {
    const sorted = sortOfferGroups(groups, "date", "desc");
    assert.equal(sorted[0].key, "a");
  });
});

describe("sortOfferRows", () => {
  const rows = [
    { source: "a", title: "X", destination: "X", price: 5000, startDate: "2026-09-01" },
    { source: "a", title: "Y", destination: "Y", price: 3000, startDate: "2026-07-01" },
  ];

  it("sorts by price ascending", () => {
    const sorted = sortOfferRows(rows, "price", "asc");
    assert.equal(sorted[0].price, 3000);
  });

  it("sorts by date descending", () => {
    const sorted = sortOfferRows(rows, "date", "desc");
    assert.equal(sorted[0].startDate, "2026-09-01");
  });

  it("handles empty input", () => {
    const sorted = sortOfferRows([], "price", "asc");
    assert.deepEqual(sorted, []);
  });
});

// ── Expanded tests ──────────────────────────

describe("groupOfferRows — expanded", () => {
  it("groups same destination with three different dates", () => {
    const rows = [
      { source: "a", title: "Hotel X", destination: "Egypt", price: 10000, startDate: "2026-06-01" },
      { source: "a", title: "Hotel X", destination: "Egypt", price: 11000, startDate: "2026-06-08" },
      { source: "a", title: "Hotel X", destination: "Egypt", price: 9000, startDate: "2026-06-15" },
    ];
    const groups = groupOfferRows(rows);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].offers.length, 3);
  });

  it("does not group same hotel from different providers", () => {
    const rows = [
      { source: "alex", title: "Beach Hotel", destination: "Egypt", price: 15000, startDate: "2026-07-01" },
      { source: "orex", title: "Beach Hotel", destination: "Egypt", price: 14000, startDate: "2026-07-01" },
    ];
    const groups = groupOfferRows(rows);
    assert.equal(groups.length, 2);
  });

  it("picks earlier start date when prices are equal", () => {
    const rows = [
      { source: "a", title: "Hotel Y", destination: "Greece", price: 12000, startDate: "2026-08-10" },
      { source: "a", title: "Hotel Y", destination: "Greece", price: 12000, startDate: "2026-08-03" },
    ];
    const groups = groupOfferRows(rows);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].representative.startDate, "2026-08-03");
  });

  it("handles rows with identical data (no crash)", () => {
    const row = { source: "a", title: "Hotel Z", destination: "Spain", price: 8000, startDate: "2026-09-01" };
    const groups = groupOfferRows([row, row]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].offers.length, 2);
  });
});

describe("countOfferGroupsBy — expanded", () => {
  it("returns empty map for empty input", () => {
    const counts = countOfferGroupsBy<{ source: string; title: string; destination: string; price: number; startDate: string }>([], (r) => r.destination);
    assert.equal(counts.size, 0);
  });

  it("handles single row", () => {
    const rows = [
      { source: "a", title: "Hotel A", destination: "Egypt", price: 10000, startDate: "2026-07-01" },
    ];
    const counts = countOfferGroupsBy(rows, (r) => r.destination);
    assert.equal(counts.get("Egypt"), 1);
  });

  it("counts zero for bucket with no matching rows", () => {
    const rows = [
      { source: "a", title: "Hotel A", destination: "Egypt", price: 10000, startDate: "2026-07-01" },
    ];
    const counts = countOfferGroupsBy(rows, (r) => r.destination);
    assert.equal(counts.get("Turkey"), undefined);
  });
});

describe("sortOfferGroups — expanded", () => {
  it("handles empty input", () => {
    const sorted = sortOfferGroups([], "price", "asc");
    assert.deepEqual(sorted, []);
  });

  it("handles single group", () => {
    const groups = [
      { key: "a", representative: { source: "x", title: "A", destination: "A", price: 10000, startDate: "2026-07-01" }, offers: [] },
    ];
    const sorted = sortOfferGroups(groups, "price", "asc");
    assert.equal(sorted.length, 1);
  });

  it("does not mutate original array", () => {
    const groups = [
      { key: "a", representative: { source: "x", title: "A", destination: "A", price: 20000, startDate: "2026-08-01" }, offers: [] },
      { key: "b", representative: { source: "x", title: "B", destination: "B", price: 10000, startDate: "2026-07-01" }, offers: [] },
    ];
    const sorted = sortOfferGroups(groups, "price", "asc");
    assert.equal(sorted[0].key, "b");
    // Original should still be in insertion order
    assert.equal(groups[0].key, "a");
  });
});

describe("normalizeOfferText — expanded", () => {
  it("keeps non-diacritic characters unchanged", () => {
    // normalizeOfferText only strips diacritics, lowercases,
    // trims, and collapses whitespace — it does not remove punctuation
    assert.equal(normalizeOfferText("Hotel #1 (Deluxe)"), "hotel #1 (deluxe)");
  });

  it("handles German umlauts", () => {
    assert.equal(normalizeOfferText("Schöne Übernachtung"), "schone ubernachtung");
  });

  it("handles Spanish ñ", () => {
    assert.equal(normalizeOfferText("España"), "espana");
  });

  it("handles strings with leading/trailing whitespace", () => {
    assert.equal(normalizeOfferText("  Grand Hotel  "), "grand hotel");
  });
});

describe("buildOfferGroupKey — expanded", () => {
  it("produces different keys for different destinations", () => {
    const key1 = buildOfferGroupKey({ source: "a", title: "Hotel", destination: "Egypt" });
    const key2 = buildOfferGroupKey({ source: "a", title: "Hotel", destination: "Turkey" });
    assert.notEqual(key1, key2);
  });

  it("produces different keys for different sources", () => {
    const key1 = buildOfferGroupKey({ source: "alex", title: "Hotel", destination: "Egypt" });
    const key2 = buildOfferGroupKey({ source: "orex", title: "Hotel", destination: "Egypt" });
    assert.notEqual(key1, key2);
  });

  it("handles destination with diacritics", () => {
    const key = buildOfferGroupKey({ source: "a", title: "Hotel", destination: "Řecko" });
    assert.equal(key, "a|hotel|recko");
  });
});
