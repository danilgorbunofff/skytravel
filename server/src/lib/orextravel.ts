import { XMLParser } from "fast-xml-parser";
import { config } from "../config.js";

// ──────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────
const BASE_URL = config.orextravel.url;
const TOKEN = config.orextravel.token;
const DEFAULT_TOWN_FROM = config.orextravel.townFrom;

const DELAY_MS = 50;
const CONCURRENCY = 6;

// ──────────────────────────────────────────────
// XML parser
// ──────────────────────────────────────────────
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
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

// ──────────────────────────────────────────────
// Raw HTTP fetch
// ──────────────────────────────────────────────
async function fetchSamoRaw(params: Record<string, string>): Promise<string> {
  const url = new URL(BASE_URL);
  url.searchParams.set("oauth_token", TOKEN);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const response = await fetch(url.toString(), { redirect: "follow" });

  if (!response.ok) {
    throw new Error(`SAMO API error: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();

  if (
    text.trimStart().startsWith("<!") ||
    text.trimStart().startsWith("<html")
  ) {
    throw new Error("SAMO API returned HTML — check OREXTRAVEL_TOKEN or IP whitelist");
  }

  return text;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runConcurrent<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;
  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()));
  return results;
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
};

type RefEntry = { inc: number; name: string; lname: string; status?: string; pic?: string };

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
  ts: 0,
};
const REF_TTL = 4 * 60 * 60 * 1000; // 4 hours

function resolveLabel(
  map: Map<number, RefEntry>,
  id: number | string,
  fallback?: string,
): string {
  const entry = map.get(Number(id));
  if (entry) return entry.name || entry.lname || fallback || String(id);
  return fallback || String(id);
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
  const stampData = (stampParsed as any)?.Response?.Data?.currentstamp;
  let delStamp =
    (Array.isArray(stampData)
      ? stampData[0]?.["@_stamp"]
      : stampData?.["@_stamp"]) || "0x0000000000000000";

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
    const data = (parsed as any)?.Response?.Data;
    if (!data) break;

    const items: any[] = Array.isArray(data[type]) ? data[type] : data[type] ? [data[type]] : [];

    // Separate active and deleted
    const active = items.filter((i: any) => i["@_status"] !== "D");
    const deleted = items.filter((i: any) => i["@_status"] === "D");

    for (const item of active) {
      results.push({
        inc: Number(item["@_inc"] ?? 0),
        name: String(item["@_name"] ?? ""),
        lname: String(item["@_lname"] ?? ""),
        status: String(item["@_status"] ?? ""),
        pic: String(item["@_pic"] ?? item["@_www"] ?? item["@_image"] ?? ""),
      });
      const stamp = item["@_stamp"];
      if (stamp && stamp > lastStamp) lastStamp = stamp;
    }

    // Update delStamp from deleted records
    for (const item of deleted) {
      const stamp = item["@_stamp"];
      if (stamp && stamp > delStamp) delStamp = stamp;
    }

    // If fewer than 500 active items, we've reached the end
    if (active.length < 500) break;

    await delay(DELAY_MS);
  }

  return results;
}

export async function syncReferenceCache(): Promise<void> {
  if (refCache.ts > 0 && Date.now() - refCache.ts < REF_TTL) return;

  console.log("[Orextravel] Syncing reference tables…");

  const types: { key: keyof typeof refCache; type: string }[] = [
    { key: "states", type: "state" },
    { key: "towns", type: "town" },
    { key: "hotels", type: "hotel" },
    { key: "stars", type: "star" },
    { key: "rooms", type: "room" },
    { key: "meals", type: "meal" },
  ];

  for (const { key, type } of types) {
    try {
      const items = await fetchFullReference(type);
      const map = refCache[key] as Map<number, RefEntry>;
      map.clear();
      for (const item of items) {
        map.set(item.inc, item);
      }
      console.log(`[Orextravel]   ${type}: ${items.length} entries`);
    } catch (err) {
      console.warn(`[Orextravel]   ${type}: failed — ${err}`);
    }
    await delay(DELAY_MS);
  }

  refCache.ts = Date.now();
  console.log("[Orextravel] Reference sync complete.");
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
  const data = (parsed as any)?.Response?.Data;
  if (!data) return [];

  const items: any[] = Array.isArray(data.townstate)
    ? data.townstate
    : data.townstate
      ? [data.townstate]
      : [];

  const routes: TownStateRoute[] = items.map((item: any) => ({
    town: Number(item["@_town"] ?? 0),
    townName: resolveLabel(refCache.towns, item["@_town"], `Town ${item["@_town"]}`),
    state: Number(item["@_state"] ?? 0),
    stateName: resolveLabel(refCache.states, item["@_state"], `State ${item["@_state"]}`),
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

async function fetchSpoList(
  townFrom: number,
  stateId: number,
): Promise<SpoListItem[]> {
  const xml = await fetchSamoRaw({
    samo_action: "reference",
    type: "spolist",
    town: String(townFrom),
    state: String(stateId),
  });

  const parsed = parseSamoXml(xml);
  const data = (parsed as any)?.Response?.Data;
  if (!data) return [];

  const items: any[] = Array.isArray(data.spolist)
    ? data.spolist
    : data.spolist
      ? [data.spolist]
      : [];

  return items
    .map((item: any) => ({
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
  const data = (parsed as any)?.Response?.Data;
  if (!data) return [];

  const items: any[] = Array.isArray(data.cat_claim_info)
    ? data.cat_claim_info
    : data.cat_claim_info
      ? [data.cat_claim_info]
      : [];

  return items.map((item: any) => ({
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
  const data = (parsed as any)?.Response?.Data;
  if (!data) return [];

  const items: any[] = Array.isArray(data.cat_claim)
    ? data.cat_claim
    : data.cat_claim
      ? [data.cat_claim]
      : [];

  return items.map((item: any) => ({
    inc: Number(item["@_Inc"] ?? item["@_inc"] ?? 0),
    tour: Number(item["@_Tour"] ?? item["@_tour"] ?? 0),
    spog: Number(item["@_Spog"] ?? item["@_spog"] ?? 0),
    price: parseFloat(item["@_Price"] ?? item["@_price"] ?? "0"),
    currency: Number(item["@_Currency"] ?? item["@_currency"] ?? 0),
    peopleCount: Number(item["@_PeopleCount"] ?? item["@_peoplecount"] ?? 0),
    hotel: Number(item["@_Hotel"] ?? item["@_hotel"] ?? 0),
    htplace: Number(item["@_HtPlace"] ?? item["@_htplace"] ?? 0),
    meal: Number(item["@_Meal"] ?? item["@_meal"] ?? 0),
    room: Number(item["@_room"] ?? 0),
    adult: Number(item["@_adult"] ?? 0),
    child: Number(item["@_child"] ?? 0),
    packetType: Number(item["@_packet_type"] ?? 0),
    hnights: Number(item["@_hnights"] ?? nights),
    checkin,
    dateOut: String(item["@_DateOut"] ?? item["@_dateout"] ?? ""),
    nights,
  }));
}

// ──────────────────────────────────────────────
// Orchestrator — fetch all tours for a route
// ──────────────────────────────────────────────
const tourCacheMap = new Map<
  string,
  { data: OrextravelTourInput[]; ts: number }
>();
const TOUR_CACHE_TTL = 60 * 60 * 1000; // 1h

function mapClaimToTour(
  claim: CatClaim,
  stateName: string,
  townName: string,
  _catalogName: string,
): OrextravelTourInput {
  const hotelEntry = refCache.hotels.get(claim.hotel);
  const hotelName = hotelEntry ? (hotelEntry.name || hotelEntry.lname || `Hotel ${claim.hotel}`) : `Hotel ${claim.hotel}`;
  const hotelImage = hotelEntry?.pic || "";
  const mealName = resolveLabel(refCache.meals, claim.meal, "");
  const roomName = resolveLabel(refCache.rooms, claim.room, "");
  const starsEntry = refCache.stars.get(claim.htplace);
  const starsLabel = starsEntry ? starsEntry.name : "";

  const checkinDate = new Date(claim.checkin);
  const checkoutDate = claim.dateOut
    ? new Date(claim.dateOut)
    : new Date(checkinDate.getTime() + claim.nights * 86400000);

  const externalId = `orex-${claim.inc}`;

  return {
    externalId,
    destination: stateName,
    title: hotelName,
    price: Math.round(claim.price / Math.max(claim.peopleCount, 1)),
    originalPrice: Math.round(claim.price / Math.max(claim.peopleCount, 1)),
    startDate: checkinDate,
    endDate: checkoutDate,
    transport: claim.packetType === 1 ? "plane" : claim.packetType === 2 ? "car" : "plane",
    image: hotelImage,
    description: null,
    photos: [],
    url: "",
    stars: starsLabel,
    board: mealName,
    nights: claim.nights,
    adults: claim.adult,
    children: claim.child,
    roomType: roomName,
    hotelId: claim.hotel,
  };
}

const MAX_SPO_PER_ROUTE = 20;
const MAX_DATE_COMBOS_PER_SPO = 5;

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
          (r) =>
            (!townFrom || r.town === townFrom) &&
            (!stateId || r.state === stateId),
        )
      : routes;

  if (filteredRoutes.length === 0) return [];

  const allTours: OrextravelTourInput[] = [];

  for (const route of filteredRoutes) {
    const cacheKey = `${route.town}-${route.state}`;
    const cached = tourCacheMap.get(cacheKey);
    if (cached && Date.now() - cached.ts < TOUR_CACHE_TTL) {
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
          const dateNights = await fetchDateNights(
            route.town,
            route.state,
            spo.inc,
          );
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
                spoTours.push(
                  mapClaimToTour(
                    claim,
                    route.stateName,
                    route.townName,
                    spo.name,
                  ),
                );
              }
            } catch (err) {
              console.warn(
                `[Orextravel] Error fetching prices for SPO ${spo.inc}, ${combo.checkin}/${combo.nights}: ${err}`,
              );
            }
            await delay(DELAY_MS);
          });

          await runConcurrent(comboTasks, CONCURRENCY);
        } catch (err) {
          console.warn(
            `[Orextravel] Error fetching date/nights for SPO ${spo.inc}: ${err}`,
          );
        }
        return spoTours;
      });

      const spoResults = await runConcurrent(spoTasks, CONCURRENCY);
      for (const batch of spoResults) {
        routeTours.push(...batch);
      }
    } catch (err) {
      console.warn(
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
}

export function clearTourCache(): void {
  tourCacheMap.clear();
}
