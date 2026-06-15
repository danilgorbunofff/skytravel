import { LRUCache } from "lru-cache";
import { XMLParser } from "fast-xml-parser";
import { config } from "../config.js";
import { MIN_PROVIDER_TOUR_PRICE_CZK, isPlausibleProviderPriceCzk } from "./providerPrice.js";
import { fetchWithRetry } from "./fetchWithRetry.js";
import { logger } from "./logger.js";
import { delay } from "./delay.js";

// ──────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────
const BASE_URL = config.orextravel.url;
const TOKEN = config.orextravel.token;

const DELAY_MS = 50;
const CONCURRENCY = 6;
const OREX_EUR_TO_CZK = Number(process.env.OREX_EUR_TO_CZK || 25.5);

// ──────────────────────────────────────────────
// XML parser
// ──────────────────────────────────────────────
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: false,
  stopNodes: ["*.script", "*.style"],
  isArray: (name) =>
    [
      "state",
      "region",
      "town",
      "star",
      "hotel",
      "hotelattributes",
      "room",
      "htplace",
      "meal",
      "class",
      "port",
      "freight",
      "service",
      "servtype",
      "insure",
      "visapr",
      "currency",
      "tour",
      "spog",
      "townstate",
      "spolist",
      "cat_claim_info",
      "cat_claim",
      "cat_pattern",
      "cat_pattern_hotel",
      "cat_pattern_freight",
      "cat_pattern_service",
      "cat_pattern_insure",
      "cat_pattern_visa",
      "currentstamp",
      "deleted",
    ].includes(name),
});

function parseSamoXml(xml: string): Record<string, unknown> {
  return xmlParser.parse(xml) as Record<string, unknown>;
}

/** Safely extract Response.Data from parsed SAMO XML. */
function samoData(parsed: Record<string, unknown>): Record<string, unknown> | undefined {
  const response = parsed.Response as Record<string, unknown> | undefined;
  return response?.Data as Record<string, unknown> | undefined;
}

/** Ensure value is an array (like ensureArray for XML nodes). */
function samoArray(
  data: Record<string, unknown> | undefined,
  key: string,
): Record<string, unknown>[] {
  if (!data) return [];
  const v = data[key];
  if (Array.isArray(v)) return v as Record<string, unknown>[];
  if (v && typeof v === "object") return [v as Record<string, unknown>];
  return [];
}

/**
 * Parse a price string from SAMO XML.
 *
 * SAMO returns prices in two possible formats:
 *   1. Standard decimal:  "3115.6000"  → 3115.60  (dot = decimal separator)
 *   2. Czech thousands:   "31.000"     → 31000    (dot = thousands separator)
 *   3. Mixed Czech:       "1.250,50"   → 1250.50  (dot = thousands, comma = decimal)
 *
 * Detection logic:
 *   - If a comma is present → Czech format (strip dots, comma→dot).
 *   - If dots form a pure thousands pattern (\d{1,3}(\.\d{3})+) → Czech thousands.
 *   - Otherwise → standard decimal (parseFloat directly).
 */
export function parseSamoPrice(raw: string | number | undefined | null): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return raw;
  const s = String(raw).trim();

  if (s.includes(",")) {
    // Czech/European: dots are thousands separators, comma is decimal
    const cleaned = s.replace(/\./g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  // No comma — decide if dot is thousands separator or decimal
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // Pure thousands pattern: "31.000", "1.000.000"
    return parseFloat(s.replace(/\./g, "")) || 0;
  }

  // Standard decimal: "3115.6000", "1006.89", "93000"
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function isEuroCurrency(value: string): boolean {
  const normalized = normalizeCurrencyLabel(value);
  return (
    normalized === "eur" ||
    normalized === "euro" ||
    normalized.includes("euro") ||
    normalized.includes("eur")
  );
}

function normalizeCurrencyLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function isCzkCurrency(value: string, currencyId?: number): boolean {
  if (currencyId === 203) return true;
  const normalized = normalizeCurrencyLabel(value);
  return (
    normalized === "czk" ||
    normalized === "kc" ||
    normalized === "kcs" ||
    normalized.includes("koruna")
  );
}

function isExplicitEuroCurrency(value: string, currencyId?: number): boolean {
  return currencyId === 978 || isEuroCurrency(value);
}

function resolveSanePeopleCount(peopleCount: number, adults?: number, children?: number): number {
  const passengerCount = Math.max(0, adults ?? 0) + Math.max(0, children ?? 0);
  if (Number.isFinite(passengerCount) && passengerCount >= 1 && passengerCount <= 10) {
    return passengerCount;
  }
  if (Number.isFinite(peopleCount) && peopleCount >= 1 && peopleCount <= 10) {
    return peopleCount;
  }
  return 1;
}

function shouldConvertOrexPriceToCzk(
  perPersonPrice: number,
  currencyName: string,
  currencyId?: number,
): boolean {
  if (isExplicitEuroCurrency(currencyName, currencyId)) return true;
  if (isCzkCurrency(currencyName, currencyId)) {
    return perPersonPrice < MIN_PROVIDER_TOUR_PRICE_CZK;
  }
  return true;
}

function convertOrexAmountToCzk(amount: number, currencyName: string, currencyId?: number): number {
  return shouldConvertOrexPriceToCzk(amount, currencyName, currencyId)
    ? amount * OREX_EUR_TO_CZK
    : amount;
}

export function normalizeOrexPrice(
  price: number,
  peopleCount: number,
  currencyName: string,
  options: { currencyId?: number; adults?: number; children?: number } = {},
): number {
  const sanePeopleCount = resolveSanePeopleCount(peopleCount, options.adults, options.children);
  const perPersonPrice = price / sanePeopleCount;
  const dividedPriceCzk = Math.max(
    0,
    Math.round(convertOrexAmountToCzk(perPersonPrice, currencyName, options.currencyId)),
  );
  const undividedPriceCzk = Math.max(
    0,
    Math.round(convertOrexAmountToCzk(price, currencyName, options.currencyId)),
  );
  const normalizedPrice =
    sanePeopleCount > 1 &&
    dividedPriceCzk < MIN_PROVIDER_TOUR_PRICE_CZK &&
    isPlausibleProviderPriceCzk(undividedPriceCzk)
      ? undividedPriceCzk
      : dividedPriceCzk;

  if (process.env.OREX_DEBUG_PRICE === "1" && normalizedPrice < MIN_PROVIDER_TOUR_PRICE_CZK) {
    logger.warn(
      { rawPrice: price, peopleCount, sanePeopleCount, currencyId: options.currencyId, currencyName, dividedPriceCzk, undividedPriceCzk, normalizedPrice },
      "[Orextravel] Suspicious normalized price",
    );
  }

  return normalizedPrice;
}

// ──────────────────────────────────────────────
// Raw HTTP fetch
// ──────────────────────────────────────────────
async function fetchSamoRaw(params: Record<string, string>): Promise<string> {
  const url = new URL(BASE_URL);
  url.searchParams.set("oauth_token", TOKEN);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const response = await fetchWithRetry(url.toString(), { redirect: "follow", timeout: 15_000 });

  if (!response.ok) {
    throw new Error(`SAMO API error: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();

  if (text.trimStart().startsWith("<!") || text.trimStart().startsWith("<html")) {
    throw new Error("SAMO API returned HTML — check OREXTRAVEL_TOKEN or IP whitelist");
  }

  return text;
}

async function runConcurrent<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = [];
  let index = 0;
  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      try {
        results[i] = await tasks[i]();
      } catch {
        // Worker task threw; caller handles errors individually
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()));
  return results.filter((r): r is T => r != null);
}

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
export type OrextravelTourInput = {
  externalId: string;
  destination: string;
  title: string;
  price: number;
  originalPrice: number;
  startDate: Date;
  endDate: Date;
  transport: string;
  image: string;
  description: string | null;
  photos: string[];
  url: string;
  stars: string;
  board: string;
  nights: number;
  adults: number;
  children: number;
  roomType: string;
  hotelId: number;
  currency: string;
};

type RefEntry = { inc: number; name: string; lname: string; status?: string; pic?: string; star?: number };

// ──────────────────────────────────────────────
// In-memory reference cache
// ──────────────────────────────────────────────
const refCache = {
  states: new Map<number, RefEntry>(),
  towns: new Map<number, RefEntry>(),
  hotels: new Map<number, RefEntry>(),
  stars: new Map<number, RefEntry>(),
  rooms: new Map<number, RefEntry>(),
  meals: new Map<number, RefEntry>(),
  htplaces: new Map<number, RefEntry>(),
  currencies: new Map<number, RefEntry>(),
  tours: new Map<number, RefEntry>(),
  hotelDescriptions: new Map<number, string>(),
  ts: 0,
};
const REF_TTL = 4 * 60 * 60 * 1000; // 4 hours

function resolveLabel(map: Map<number, RefEntry>, id: number | string, fallback?: string): string {
  const entry = map.get(Number(id));
  if (entry) return entry.name || entry.lname || (fallback ?? String(id));
  return fallback ?? String(id);
}

// ──────────────────────────────────────────────
// Reference sync — paginated via stamps
// ──────────────────────────────────────────────
async function fetchFullReference(type: string): Promise<RefEntry[]> {
  const results: RefEntry[] = [];

  // 1. Get current delete stamp
  const stampXml = await fetchSamoRaw({
    samo_action: "reference",
    type: "currentstamp",
  });
  const stampParsed = parseSamoXml(stampXml);
  const stampDataRoot = samoData(stampParsed);
  const stampData = stampDataRoot?.currentstamp as
    | Record<string, unknown>
    | Record<string, unknown>[]
    | undefined;
  let delStamp =
    ((Array.isArray(stampData)
      ? (stampData[0] as Record<string, unknown>)?.["@_stamp"]
      : stampData?.["@_stamp"]) as string) || "0x0000000000000000";

  await delay(DELAY_MS);

  // 2. Paginate through records
  let lastStamp = "0x0000000000000000";
  let iterations = 0;
  const MAX_ITERATIONS = 100;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    const xml = await fetchSamoRaw({
      samo_action: "reference",
      type,
      laststamp: lastStamp,
      delstamp: delStamp,
    });

    const parsed = parseSamoXml(xml);
    const data = samoData(parsed);
    if (!data) break;

    const items = samoArray(data, type);

    // Separate active and deleted
    const active = items.filter((i) => i["@_status"] !== "D");
    const deleted = items.filter((i) => i["@_status"] === "D");

    for (const item of active) {
      results.push({
        inc: Number(item["@_inc"] ?? 0),
        name: String(item["@_name"] ?? ""),
        lname: String(item["@_lname"] ?? ""),
        status: String(item["@_status"] ?? ""),
        pic: String(item["@_pic"] ?? item["@_www"] ?? item["@_image"] ?? ""),
        star: item["@_star"] != null ? Number(item["@_star"]) : undefined,
      });
      const stamp = String(item["@_stamp"] ?? "");
      if (stamp && stamp > lastStamp) lastStamp = stamp;
    }

    // Update delStamp from deleted records
    for (const item of deleted) {
      const stamp = String(item["@_stamp"] ?? "");
      if (stamp && stamp > delStamp) delStamp = stamp;
    }

    // If fewer than 500 active items, we've reached the end
    if (active.length < 500) break;

    await delay(DELAY_MS);
  }

  return results;
}

// ──────────────────────────────────────────────
// Hotel attributes — paginated, custom field extraction
// ──────────────────────────────────────────────
async function syncHotelAttributes(): Promise<void> {
  const stampXml = await fetchSamoRaw({
    samo_action: "reference",
    type: "currentstamp",
  });
  const stampParsed = parseSamoXml(stampXml);
  const stampDataRoot = samoData(stampParsed);
  const stampData = stampDataRoot?.currentstamp as
    | Record<string, unknown>
    | Record<string, unknown>[]
    | undefined;
  let delStamp =
    ((Array.isArray(stampData)
      ? (stampData[0] as Record<string, unknown>)?.["@_stamp"]
      : stampData?.["@_stamp"]) as string) || "0x0000000000000000";

  await delay(DELAY_MS);

  const grouped = new Map<number, string[]>();
  let lastStamp = "0x0000000000000000";
  let iterations = 0;

  while (iterations < 100) {
    iterations++;
    const xml = await fetchSamoRaw({
      samo_action: "reference",
      type: "hotelattributes",
      laststamp: lastStamp,
      delstamp: delStamp,
    });

    const parsed = parseSamoXml(xml);
    const data = samoData(parsed);
    if (!data) break;

    const items = samoArray(data, "hotelattributes");

    const active = items.filter((i) => i["@_status"] !== "D");
    const deleted = items.filter((i) => i["@_status"] === "D");

    for (const item of active) {
      const hotelId = Number(item["@_hotel"] ?? 0);
      const attrName = String(item["@_name"] ?? item["@_lname"] ?? "");
      const attrValue = String(item["@_value"] ?? "");
      if (hotelId && attrValue) {
        const arr = grouped.get(hotelId) ?? [];
        arr.push(`${attrName}: ${attrValue}`);
        grouped.set(hotelId, arr);
      }
      const stamp = String(item["@_stamp"] ?? "");
      if (stamp && stamp > lastStamp) lastStamp = stamp;
    }

    for (const item of deleted) {
      const stamp = String(item["@_stamp"] ?? "");
      if (stamp && stamp > delStamp) delStamp = stamp;
    }

    if (active.length < 500) break;
    await delay(DELAY_MS);
  }

  refCache.hotelDescriptions.clear();
  for (const [hotelId, parts] of grouped) {
    refCache.hotelDescriptions.set(hotelId, parts.join("; "));
  }
  logger.info(`[Orextravel]   hotelattributes: ${grouped.size} hotels with descriptions`);
}

export async function syncReferenceCache(): Promise<void> {
  if (refCache.ts > 0 && Date.now() - refCache.ts < REF_TTL) return;

  logger.info("[Orextravel] Syncing reference tables…");

  const types: { key: keyof typeof refCache; type: string; critical: boolean }[] = [
    { key: "states", type: "state", critical: true },
    { key: "towns", type: "town", critical: true },
    { key: "hotels", type: "hotel", critical: true },
    { key: "stars", type: "star", critical: false },
    { key: "rooms", type: "room", critical: false },
    { key: "meals", type: "meal", critical: false },
    { key: "htplaces", type: "htplace", critical: false },
    { key: "currencies", type: "currency", critical: false },
    { key: "tours", type: "tour", critical: false },
  ];

  let criticalFailures = 0;
  for (const { key, type, critical } of types) {
    try {
      const items = await fetchFullReference(type);
      const map = refCache[key] as Map<number, RefEntry>;
      map.clear();
      for (const item of items) {
        map.set(item.inc, item);
      }
      logger.info(`[Orextravel]   ${type}: ${items.length} entries`);
    } catch (err) {
      logger.warn(`[Orextravel]   ${type}: failed — ${err}`);
      if (critical) criticalFailures++;
    }
    await delay(DELAY_MS);
  }

  // Sync hotel attributes (descriptions) — different structure than other refs
  try {
    await syncHotelAttributes();
  } catch (err) {
    logger.warn(`[Orextravel]   hotelattributes: failed — ${err}`);
  }

  // Only mark as synced if all critical types succeeded
  if (criticalFailures === 0) {
    refCache.ts = Date.now();
    logger.info("[Orextravel] Reference sync complete.");
  } else {
    logger.warn(`[Orextravel] Reference sync incomplete (${criticalFailures} critical failures).`);
  }
}

// ──────────────────────────────────────────────
// TownState — available departure/destination routes
// ──────────────────────────────────────────────
export type TownStateRoute = {
  town: number;
  townName: string;
  state: number;
  stateName: string;
  packetType: number;
};

let townStateCache: { data: TownStateRoute[]; ts: number } | null = null;
const TOWNSTATE_TTL = 4 * 60 * 60 * 1000;

export async function fetchTownState(): Promise<TownStateRoute[]> {
  if (townStateCache && Date.now() - townStateCache.ts < TOWNSTATE_TTL) {
    return townStateCache.data;
  }

  await syncReferenceCache();

  const xml = await fetchSamoRaw({
    samo_action: "reference",
    type: "townstate",
  });

  const parsed = parseSamoXml(xml);
  const data = samoData(parsed);
  if (!data) return [];

  const items = samoArray(data, "townstate");

  const routes: TownStateRoute[] = items.map((item) => ({
    town: Number(item["@_town"] ?? 0),
    townName: resolveLabel(refCache.towns, Number(item["@_town"] ?? 0), `Town ${item["@_town"]}`),
    state: Number(item["@_state"] ?? 0),
    stateName: resolveLabel(
      refCache.states,
      Number(item["@_state"] ?? 0),
      `State ${item["@_state"]}`,
    ),
    packetType: Number(item["@_packet_type"] ?? 0),
  }));

  // Deduplicate by town+state (different packet_types → keep the first)
  const seen = new Set<string>();
  const unique = routes.filter((r) => {
    const key = `${r.town}-${r.state}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  townStateCache = { data: unique, ts: Date.now() };
  return unique;
}

// ──────────────────────────────────────────────
// SPO List — catalogs per route
// ──────────────────────────────────────────────
type SpoListItem = {
  inc: number;
  name: string;
  spog: number;
  tour: number;
  calcdate: string;
  note: string;
  enable4delete: number;
};

async function fetchSpoList(townFrom: number, stateId: number): Promise<SpoListItem[]> {
  const xml = await fetchSamoRaw({
    samo_action: "reference",
    type: "spolist",
    town: String(townFrom),
    state: String(stateId),
  });

  const parsed = parseSamoXml(xml);
  const data = samoData(parsed);
  if (!data) return [];

  const items = samoArray(data, "spolist");

  return items
    .map((item) => ({
      inc: Number(item["@_inc"] ?? 0),
      name: String(item["@_name"] ?? ""),
      spog: Number(item["@_spog"] ?? 0),
      tour: Number(item["@_tour"] ?? 0),
      calcdate: String(item["@_calcdate"] ?? ""),
      note: String(item["@_note"] ?? ""),
      enable4delete: Number(item["@_enable4delete"] ?? 0),
    }))
    .filter((s) => s.enable4delete !== 1);
}

// ──────────────────────────────────────────────
// Price — date/nights combos and actual prices
// ──────────────────────────────────────────────
type DateNightsCombo = { checkin: string; nights: number };

async function fetchDateNights(
  townFrom: number,
  stateId: number,
  catalogId: number,
): Promise<DateNightsCombo[]> {
  const xml = await fetchSamoRaw({
    samo_action: "reference",
    type: "price",
    townfrom: String(townFrom),
    state: String(stateId),
    catalog: String(catalogId),
    data: "0",
  });

  const parsed = parseSamoXml(xml);
  const data = samoData(parsed);
  if (!data) return [];

  const items = samoArray(data, "cat_claim_info");

  return items.map((item) => ({
    checkin: String(item["@_checkin"] ?? ""),
    nights: Number(item["@_nights"] ?? 7),
  }));
}

type CatClaim = {
  inc: number;
  tour: number;
  spog: number;
  price: number;
  currency: number;
  peopleCount: number;
  hotel: number;
  htplace: number;
  meal: number;
  room: number;
  adult: number;
  child: number;
  packetType: number;
  hnights: number;
  checkin: string;
  dateOut: string;
  nights: number;
  internetInvisible: number;
};

async function fetchPrices(
  townFrom: number,
  stateId: number,
  catalogId: number,
  checkin: string,
  nights: number,
): Promise<CatClaim[]> {
  const xml = await fetchSamoRaw({
    samo_action: "reference",
    type: "price",
    townfrom: String(townFrom),
    state: String(stateId),
    catalog: String(catalogId),
    data: "1",
    checkin: checkin.slice(0, 10),
    nights: String(nights),
  });

  const parsed = parseSamoXml(xml);
  const data = samoData(parsed);
  if (!data) return [];

  const items = samoArray(data, "cat_claim");

  return items
    .map((item) => ({
      inc: Number(item["@_Inc"] ?? item["@_inc"] ?? 0),
      tour: Number(item["@_Tour"] ?? item["@_tour"] ?? 0),
      spog: Number(item["@_Spog"] ?? item["@_spog"] ?? 0),
      price: parseSamoPrice((item["@_Price"] ?? item["@_price"]) as string | number | undefined),
      currency: Number(item["@_Currency"] ?? item["@_currency"] ?? 0),
      peopleCount: Number(item["@_PeopleCount"] ?? item["@_peoplecount"] ?? 0),
      hotel: Number(item["@_Hotel"] ?? item["@_hotel"] ?? 0),
      htplace: Number(item["@_HtPlace"] ?? item["@_htplace"] ?? 0),
      meal: Number(item["@_Meal"] ?? item["@_meal"] ?? 0),
      room: Number(item["@_Room"] ?? item["@_room"] ?? 0),
      adult: Number(item["@_Adult"] ?? item["@_adult"] ?? 0),
      child: Number(item["@_Child"] ?? item["@_child"] ?? 0),
      packetType: Number(item["@_Packet_type"] ?? item["@_packet_type"] ?? 0),
      hnights: Number(item["@_Hnights"] ?? item["@_hnights"] ?? nights),
      checkin,
      dateOut: String(item["@_DateOut"] ?? item["@_dateout"] ?? ""),
      nights,
      internetInvisible: Number(item["@_InternetInvisible"] ?? item["@_internetinvisible"] ?? 0),
    }))
    .filter((c) => c.internetInvisible === 0);
}

// ──────────────────────────────────────────────
// Orchestrator — fetch all tours for a route
// ──────────────────────────────────────────────
const tourCacheMap = new LRUCache<string, { data: OrextravelTourInput[]; ts: number }>({
  max: 100,
  ttl: 60 * 60 * 1000, // 1h
});

function mapClaimToTour(
  claim: CatClaim,
  stateName: string,
  townName: string,
  _catalogName: string,
  routeTown: number,
  routeState: number,
): OrextravelTourInput {
  const hotelEntry = refCache.hotels.get(claim.hotel);
  const hotelName = hotelEntry
    ? hotelEntry.name || hotelEntry.lname || `Hotel ${claim.hotel}`
    : `Hotel ${claim.hotel}`;
  const hotelImage = hotelEntry?.pic || "";
  const mealName = resolveLabel(refCache.meals, claim.meal, "");
  const roomName = resolveLabel(refCache.rooms, claim.room, "");
  const htplaceName = resolveLabel(refCache.htplaces, claim.htplace, "");
  const starsLabel = hotelEntry?.star
    ? resolveLabel(refCache.stars, hotelEntry.star, "")
    : "";
  const currencyName = resolveLabel(refCache.currencies, claim.currency, "");
  const hotelDesc = refCache.hotelDescriptions.get(claim.hotel) || null;
  const price = normalizeOrexPrice(claim.price, claim.peopleCount, currencyName, {
    currencyId: claim.currency,
    adults: claim.adult,
    children: claim.child,
  });

  const checkinDate = new Date(claim.checkin);
  const checkoutDate = claim.dateOut
    ? new Date(claim.dateOut)
    : new Date(checkinDate.getTime() + claim.nights * 86400000);

  const externalId = `orex-${routeTown}-${routeState}-${claim.inc}`;

  // packet_type: 0 = full package (flight+hotel), 1 = transport only, 2 = hotel only
  const transport = claim.packetType === 2 ? "car" : "plane";

  return {
    externalId,
    destination: stateName,
    title: hotelName,
    price,
    originalPrice: price,
    startDate: checkinDate,
    endDate: checkoutDate,
    transport,
    image: hotelImage,
    description: hotelDesc,
    photos: hotelImage ? [hotelImage] : [],
    url: "",
    stars: starsLabel,
    board: mealName,
    nights: claim.nights,
    adults: claim.adult,
    children: claim.child,
    roomType: htplaceName || roomName,
    hotelId: claim.hotel,
    currency: "CZK",
  };
}

const MAX_SPO_PER_ROUTE = Number(process.env.OREX_MAX_SPO_PER_ROUTE || 20);
const MAX_DATE_COMBOS_PER_SPO = Number(process.env.OREX_MAX_DATE_COMBOS_PER_SPO || 5);
const MAX_TOURS_PER_FETCH = Number(process.env.OREX_MAX_TOURS_PER_FETCH || 5000);

export type ProgressCallback = (info: {
  loaded: number;
  total: number;
  batch: OrextravelTourInput[];
}) => void;

export async function fetchOrextravelTours(
  townFrom?: number,
  stateId?: number,
  onProgress?: ProgressCallback,
): Promise<OrextravelTourInput[]> {
  await syncReferenceCache();

  const routes = await fetchTownState();
  const filteredRoutes =
    townFrom || stateId
      ? routes.filter(
          (r) => (!townFrom || r.town === townFrom) && (!stateId || r.state === stateId),
        )
      : routes;

  if (filteredRoutes.length === 0) return [];

  const allTours: OrextravelTourInput[] = [];

  for (const route of filteredRoutes) {
    if (allTours.length >= MAX_TOURS_PER_FETCH) {
      logger.warn(`[Orextravel] Reached MAX_TOURS_PER_FETCH (${MAX_TOURS_PER_FETCH}), truncating.`);
      break;
    }
    const cacheKey = `${route.town}-${route.state}`;
    const cached = tourCacheMap.get(cacheKey);
    if (cached) {
      allTours.push(...cached.data);
      continue;
    }

    const routeTours: OrextravelTourInput[] = [];
    try {
      const spoList = await fetchSpoList(route.town, route.state);
      await delay(DELAY_MS);

      const spoSlice = spoList.slice(0, MAX_SPO_PER_ROUTE);

      // Process SPOs concurrently
      const spoTasks = spoSlice.map((spo) => async () => {
        const spoTours: OrextravelTourInput[] = [];
        try {
          const dateNights = await fetchDateNights(route.town, route.state, spo.inc);
          await delay(DELAY_MS);

          const comboSlice = dateNights.slice(0, MAX_DATE_COMBOS_PER_SPO);

          // Process date combos concurrently within each SPO
          const comboTasks = comboSlice.map((combo) => async () => {
            try {
              const prices = await fetchPrices(
                route.town,
                route.state,
                spo.inc,
                combo.checkin,
                combo.nights,
              );

              for (const claim of prices) {
                if (claim.price <= 0) continue;
                const tour = mapClaimToTour(
                  claim,
                  route.stateName,
                  route.townName,
                  spo.name,
                  route.town,
                  route.state,
                );
                if (isPlausibleProviderPriceCzk(tour.price)) {
                  spoTours.push(tour);
                }
              }
            } catch (err) {
              logger.warn(
                `[Orextravel] Error fetching prices for SPO ${spo.inc}, ${combo.checkin}/${combo.nights}: ${err}`,
              );
            }
            await delay(DELAY_MS);
          });

          await runConcurrent(comboTasks, CONCURRENCY);
        } catch (err) {
          logger.warn(`[Orextravel] Error fetching date/nights for SPO ${spo.inc}: ${err}`);
        }
        return spoTours;
      });

      const spoResults = await runConcurrent(spoTasks, CONCURRENCY);
      for (const batch of spoResults) {
        routeTours.push(...batch);
      }
      if (routeTours.length >= MAX_TOURS_PER_FETCH) {
        logger.warn(`[Orextravel] Route ${route.townName}→${route.stateName}: reached MAX_TOURS_PER_FETCH, truncating.`);
        routeTours.length = MAX_TOURS_PER_FETCH;
      }
    } catch (err) {
      logger.warn(
        `[Orextravel] Error fetching SPO list for ${route.townName} → ${route.stateName}: ${err}`,
      );
    }

    // Deduplicate by externalId
    const seen = new Set<string>();
    const deduped = routeTours.filter((t) => {
      if (seen.has(t.externalId)) return false;
      seen.add(t.externalId);
      return true;
    });

    tourCacheMap.set(cacheKey, { data: deduped, ts: Date.now() });
    allTours.push(...deduped);

    if (onProgress) {
      onProgress({ loaded: allTours.length, total: 0, batch: deduped });
    }
  }

  return allTours;
}

// ──────────────────────────────────────────────
// Cache management
// ──────────────────────────────────────────────
export function clearOrextravelCache(): void {
  tourCacheMap.clear();
  townStateCache = null;
  refCache.ts = 0;
  refCache.states.clear();
  refCache.towns.clear();
  refCache.hotels.clear();
  refCache.stars.clear();
  refCache.rooms.clear();
  refCache.meals.clear();
  refCache.htplaces.clear();
  refCache.currencies.clear();
  refCache.tours.clear();
  refCache.hotelDescriptions.clear();
}

export function clearTourCache(): void {
  tourCacheMap.clear();
}
