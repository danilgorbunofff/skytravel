import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";
import {
  parseNightsRange,
  nightsFromDates,
  photosFromJson,
  buildTourSelect,
} from "./BaseProvider.js";
import { extractToursFromParsed, mapBoard } from "../lib/alexandria.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ──────────────────────────────────────────────
// parseNightsRange
// ──────────────────────────────────────────────
describe("parseNightsRange", () => {
  it('parses "7-14" into { min: 7, max: 14 }', () => {
    assert.deepEqual(parseNightsRange("7-14"), { min: 7, max: 14 });
  });

  it('parses "3-10" into { min: 3, max: 10 }', () => {
    assert.deepEqual(parseNightsRange("3-10"), { min: 3, max: 10 });
  });

  it("returns null for undefined", () => {
    assert.equal(parseNightsRange(undefined), null);
  });

  it("returns null for empty string", () => {
    assert.equal(parseNightsRange(""), null);
  });

  it("returns null for non-numeric input", () => {
    assert.equal(parseNightsRange("abc-def"), null);
  });

  it("handles partial range with missing max gracefully", () => {
    // "7-" → min=7, max=0 (Number("") converts to 0)
    const result = parseNightsRange("7-");
    assert.equal(result?.min, 7);
    assert.equal(result?.max, 0);
  });

  it("handles partial range with missing min gracefully", () => {
    // "-14" → min=0, max=14 (Number("") converts to 0)
    const result = parseNightsRange("-14");
    assert.equal(result?.min, 0);
    assert.equal(result?.max, 14);
  });
});

// ──────────────────────────────────────────────
// nightsFromDates
// ──────────────────────────────────────────────
describe("nightsFromDates", () => {
  it("calculates 7 nights for same-day-of-week dates one week apart", () => {
    assert.equal(nightsFromDates("2026-06-01", "2026-06-08"), 7);
  });

  it("calculates 14 nights for a two-week gap", () => {
    assert.equal(nightsFromDates("2026-06-01", "2026-06-15"), 14);
  });

  it("handles Date objects", () => {
    assert.equal(nightsFromDates(new Date("2026-07-01"), new Date("2026-07-10")), 9);
  });

  it("returns null for same start and end date (zero nights)", () => {
    assert.equal(nightsFromDates("2026-06-01", "2026-06-01"), null);
  });

  it("returns null for end date before start date", () => {
    assert.equal(nightsFromDates("2026-06-08", "2026-06-01"), null);
  });

  it("returns null for invalid date strings", () => {
    assert.equal(nightsFromDates("invalid", "2026-06-08"), null);
  });
});

// ──────────────────────────────────────────────
// photosFromJson
// ──────────────────────────────────────────────
describe("photosFromJson", () => {
  it("returns photo array as-is when valid", () => {
    assert.deepEqual(photosFromJson(["a.jpg", "b.jpg"], "fallback.jpg"), ["a.jpg", "b.jpg"]);
  });

  it("filters out empty strings from array", () => {
    assert.deepEqual(photosFromJson(["a.jpg", "", "b.jpg"], "fallback.jpg"), ["a.jpg", "b.jpg"]);
  });

  it("falls back to image string when array is empty", () => {
    assert.deepEqual(photosFromJson([], "fallback.jpg"), ["fallback.jpg"]);
  });

  it("falls back to image string for non-array input", () => {
    assert.deepEqual(photosFromJson("not-an-array", "fallback.jpg"), ["fallback.jpg"]);
  });

  it("returns empty array when array is empty and image is empty", () => {
    assert.deepEqual(photosFromJson([], ""), []);
  });

  it("returns empty array for null input with empty image", () => {
    assert.deepEqual(photosFromJson(null, ""), []);
  });

  it("returns empty array for undefined input with empty image", () => {
    assert.deepEqual(photosFromJson(undefined, ""), []);
  });
});

// ──────────────────────────────────────────────
// buildTourSelect
// ──────────────────────────────────────────────
describe("buildTourSelect", () => {
  it("includes core identification fields", () => {
    const select = buildTourSelect(false);
    assert.ok(select.externalId);
    assert.ok(select.source);
    assert.ok(select.id);
    assert.ok(select.regionKey);
  });

  it("includes destination and title", () => {
    const select = buildTourSelect(false);
    assert.ok(select.destination);
    assert.ok(select.title);
  });

  it("includes pricing and date fields", () => {
    const select = buildTourSelect(false);
    assert.ok(select.price);
    assert.ok(select.originalPrice);
    assert.ok(select.startDate);
    assert.ok(select.endDate);
  });

  it("includes transport, image, stars, board", () => {
    const select = buildTourSelect(false);
    assert.ok(select.transport);
    assert.ok(select.image);
    assert.ok(select.stars);
    assert.ok(select.board);
  });

  it("includes heavy fields by default", () => {
    const select = buildTourSelect(false);
    assert.ok(select.url);
    assert.ok(select.description);
    assert.ok(select.photos);
  });

  it("omits heavy fields when omitHeavy is true", () => {
    const select = buildTourSelect(true);
    assert.equal(select.url, undefined);
    assert.equal(select.description, undefined);
    assert.equal(select.photos, undefined);
  });

  it("always includes nights, adults, children, roomType, currency", () => {
    const select = buildTourSelect(false);
    assert.ok(select.nights);
    assert.ok(select.adults);
    assert.ok(select.children);
    assert.ok(select.roomType);
    assert.ok(select.currency);
  });

  it("includes offersCount, syncedAt, createdAt", () => {
    const select = buildTourSelect(false);
    assert.ok(select.offersCount);
    assert.ok(select.syncedAt);
    assert.ok(select.createdAt);
  });
});

// ──────────────────────────────────────────────
// extractToursFromParsed with fixture XML
// ──────────────────────────────────────────────
describe("extractToursFromParsed with fixture XML", () => {
  // Replicate the same XMLParser config used in alexandria.ts
  const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    processEntities: false,
    stopNodes: ["*.script", "*.style"],
    isArray: (name) =>
      [
        "zeme",
        "oblast",
        "misto",
        "hotel",
        "objekt",
        "obrazek",
        "termin",
        "cena",
        "ikona",
        "katalog",
      ].includes(name),
  });

  function loadFixture(): Record<string, unknown> {
    const xml = readFileSync(resolve(__dirname, "__fixtures__", "alexandria-sample.xml"), "utf-8");
    return xmlParser.parse(xml) as Record<string, unknown>;
  }

  it("extracts exactly 3 tours from the fixture", () => {
    const parsed = loadFixture();
    const tours = extractToursFromParsed(parsed);
    assert.equal(tours.length, 3);
  });

  it("parses externalId for all tours", () => {
    const parsed = loadFixture();
    const tours = extractToursFromParsed(parsed);
    for (const tour of tours) {
      assert.ok(tour.externalId, "each tour must have an externalId");
      assert.ok(tour.externalId.length > 0);
    }
  });

  it("sets destination with country – place format", () => {
    const parsed = loadFixture();
    const tours = extractToursFromParsed(parsed);
    // First two tours are from Bulharsko – Slunečné pobřeží
    assert.match(tours[0].destination, /Bulharsko/);
    assert.match(tours[0].destination, /Slunečné/);
    // Third tour is from Chorvatsko – Dubrovník
    assert.match(tours[2].destination, /Chorvatsko/);
    assert.match(tours[2].destination, /Dubrovník/);
  });

  it("assigns correct hotel titles", () => {
    const parsed = loadFixture();
    const tours = extractToursFromParsed(parsed);
    assert.equal(tours[0].title, "Hotel Slunce");
    assert.equal(tours[1].title, "Hotel Slunce");
    assert.equal(tours[2].title, "Hotel Adria");
  });

  it("parses price as a positive number", () => {
    const parsed = loadFixture();
    const tours = extractToursFromParsed(parsed);
    for (const tour of tours) {
      assert.ok(tour.price > 0, `price for ${tour.externalId} should be > 0`);
    }
  });

  it("parses startDate and endDate as Date objects", () => {
    const parsed = loadFixture();
    const tours = extractToursFromParsed(parsed);
    for (const tour of tours) {
      assert.ok(tour.startDate instanceof Date);
      assert.ok(tour.endDate instanceof Date);
      assert.ok(tour.startDate.getTime() < tour.endDate.getTime());
    }
  });

  it("parses specific dates correctly", () => {
    const parsed = loadFixture();
    const tours = extractToursFromParsed(parsed);
    // Use local date components to avoid UTC timezone offset issues
    assert.equal(tours[0].startDate.getFullYear(), 2026);
    assert.equal(tours[0].startDate.getMonth(), 5); // 0-indexed: June = 5
    assert.equal(tours[0].startDate.getDate(), 1);
    assert.equal(tours[0].endDate.getDate(), 8);
    assert.equal(tours[2].startDate.getMonth(), 6); // July = 6
    assert.equal(tours[2].startDate.getDate(), 10);
    assert.equal(tours[2].endDate.getDate(), 17);
  });

  it("maps transport type correctly", () => {
    const parsed = loadFixture();
    const tours = extractToursFromParsed(parsed);
    // Hotel Slunce uses "Letadlo" → "plane"
    assert.equal(tours[0].transport, "plane");
    assert.equal(tours[1].transport, "plane");
    // Hotel Adria uses "Autobus" → "bus"
    assert.equal(tours[2].transport, "bus");
  });

  it("parses board type (strava)", () => {
    const parsed = loadFixture();
    const tours = extractToursFromParsed(parsed);
    assert.equal(tours[0].board, "AI");
    assert.equal(tours[1].board, "AI");
    assert.equal(tours[2].board, "HB");
  });

  it("parses star rating", () => {
    const parsed = loadFixture();
    const tours = extractToursFromParsed(parsed);
    assert.equal(tours[0].stars, "4");
    assert.equal(tours[2].stars, "3");
  });

  it("extracts hotel photos with IMAGE_BASE prefix", () => {
    const parsed = loadFixture();
    const tours = extractToursFromParsed(parsed);
    const base = "https://images.alexandria.cz/dataStorage/hotel-obrazky/orig";
    // Hotel Slunce (id=1001) has 2 photos
    assert.equal(tours[0].photos.length, 2);
    assert.equal(tours[0].photos[0], `${base}/1001/slunce1.jpg`);
    assert.equal(tours[0].photos[1], `${base}/1001/slunce2.jpg`);
    // Hotel Adria (id=2002) has 1 photo
    assert.equal(tours[2].photos.length, 1);
    assert.equal(tours[2].photos[0], `${base}/2002/adria1.jpg`);
  });

  it("sets first photo (with IMAGE_BASE) as image", () => {
    const parsed = loadFixture();
    const tours = extractToursFromParsed(parsed);
    const base = "https://images.alexandria.cz/dataStorage/hotel-obrazky/orig";
    assert.equal(tours[0].image, `${base}/1001/slunce1.jpg`);
    assert.equal(tours[2].image, `${base}/2002/adria1.jpg`);
  });

  it("extracts description text", () => {
    const parsed = loadFixture();
    const tours = extractToursFromParsed(parsed);
    assert.ok(tours[0].description?.includes("pláže"));
    assert.ok(tours[2].description?.includes("výhledem"));
  });

  it("extracts hotel URL", () => {
    const parsed = loadFixture();
    const tours = extractToursFromParsed(parsed);
    assert.equal(tours[0].url, "https://example.com/hotel-slunce");
    assert.equal(tours[2].url, "https://example.com/hotel-adria");
  });

  it("originalPrice is higher than price", () => {
    const parsed = loadFixture();
    const tours = extractToursFromParsed(parsed);
    for (const tour of tours) {
      assert.ok(
        tour.originalPrice >= tour.price,
        `originalPrice (${tour.originalPrice}) should be >= price (${tour.price})`,
      );
    }
  });

  it("produces unique externalIds for each tour", () => {
    const parsed = loadFixture();
    const tours = extractToursFromParsed(parsed);
    const ids = tours.map((t) => t.externalId);
    assert.equal(new Set(ids).size, ids.length);
  });
});

// ──────────────────────────────────────────────
// mapBoard (Alexandria typstravy mapping)
// ──────────────────────────────────────────────
describe("mapBoard", () => {
  it("maps valid short codes through unchanged (normalized to uppercase)", () => {
    for (const code of ["AI", "UAI", "FB", "HB", "BB", "RO"]) {
      assert.equal(mapBoard(code), code);
      assert.equal(mapBoard(code.toLowerCase()), code);
    }
  });

  it("maps 'ALL' and 'All Inclusive' to AI", () => {
    assert.equal(mapBoard("ALL"), "AI");
    assert.equal(mapBoard("all inclusive"), "AI");
    assert.equal(mapBoard("All Inclusive"), "AI");
  });

  it("maps Czech names to codes", () => {
    assert.equal(mapBoard("plná penze"), "FB");
    assert.equal(mapBoard("Polopenze"), "HB");
    assert.equal(mapBoard("snídaně"), "BB");
    assert.equal(mapBoard("ultra all inclusive"), "UAI");
  });

  it("returns '' for empty input", () => {
    assert.equal(mapBoard(""), "");
    assert.equal(mapBoard("   "), "");
  });

  it("returns '' for undocumented DN/LN codes instead of guessing", () => {
    assert.equal(mapBoard("DN"), "");
    assert.equal(mapBoard("LN"), "");
  });

  it("returns '' for unknown values", () => {
    assert.equal(mapBoard("xyz"), "");
  });
});
