import { XMLParser } from "fast-xml-parser";

const ALEXANDRIA_URL =
  process.env.ALEXANDRIA_API_URL || "https://export.alexandria.cz/export";
const ALEXANDRIA_API_KEY = process.env.ALEXANDRIA_API_KEY || "";
const ALEXANDRIA_COUNTRY = Number(process.env.ALEXANDRIA_COUNTRY || 107);

const IMAGE_BASE = "https://images.alexandria.cz/dataStorage/hotel-obrazky/orig";

// ──────────────────────────────────────────────
// Raw fetch – returns the XML string as-is
// ──────────────────────────────────────────────
export async function fetchAlexandriaRaw(countryId?: number): Promise<string> {
  const payload = {
    zeme: countryId ?? ALEXANDRIA_COUNTRY,
    zip: false,
    api_key: ALEXANDRIA_API_KEY,
  };

  // Always use HTTPS to avoid 301 redirect issues
  const url = ALEXANDRIA_URL.replace(/^http:\/\//, "https://");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(
      `Alexandria API error: ${response.status} ${response.statusText}`
    );
  }

  const text = await response.text();

  // Guard: if response is HTML (login page), the API key is wrong
  if (text.trimStart().startsWith("<!") || text.trimStart().startsWith("<html")) {
    throw new Error("Alexandria API returned HTML instead of XML — check ALEXANDRIA_API_KEY");
  }

  return text;
}

// ──────────────────────────────────────────────
// Parsed fetch – returns the XML as a plain JS object
// ──────────────────────────────────────────────
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) =>
    ["zeme", "oblast", "misto", "hotel", "objekt", "obrazek", "termin", "cena", "ikona", "katalog"].includes(name),
});

export async function fetchAlexandriaParsed(
  countryId?: number
): Promise<Record<string, unknown>> {
  const xml = await fetchAlexandriaRaw(countryId);
  return xmlParser.parse(xml) as Record<string, unknown>;
}

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
export type AlexandriaTourInput = {
  externalId: string;
  destination: string;
  title: string;
  price: number;
  startDate: Date;
  endDate: Date;
  transport: string;
  image: string;
  description: string | null;
  photos: string[];
  url: string;
  stars: string;
  board: string;
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Parse "dd.mm.yyyy" → Date */
function parseCzDate(value: unknown): Date | null {
  if (!value) return null;
  const s = String(value).trim();
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function attr(node: unknown, key: string): string {
  if (!node || typeof node !== "object") return "";
  return String((node as Record<string, unknown>)[`@_${key}`] ?? "").trim();
}

function ensureArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Map transport string from Alexandria termin/@misto */
function mapTransport(raw: string): string {
  const lc = raw.toLowerCase();
  if (lc.includes("bus") || lc.includes("autobus")) return "bus";
  if (lc.includes("let") || lc.includes("air") || lc.includes("plane")) return "plane";
  if (lc.includes("vlak") || lc.includes("train")) return "train";
  if (lc.includes("lo") || lc.includes("boat")) return "boat";
  if (lc.includes("pobyt") || lc.includes("vlastn") || lc.includes("car")) return "car";
  return "bus";
}

/** Extract the first (main adult) non-zero price from cena elements */
function extractPrice(termin: Record<string, unknown>): number {
  const cenaNodes = ensureArray(termin.cena);
  for (const c of cenaNodes) {
    const p = Number(attr(c, "cena"));
    if (p > 0) return p;
  }
  return 0;
}

// ──────────────────────────────────────────────
// Walk the Alexandria XML tree and flatten to tour items
//
// Structure: data > zeme > oblast > misto > hotel >
//   [objekt (attrs), obrazek[] (hotel photos), termin[] > cena[]]
//
// Each (hotel × termin) combination produces one AlexandriaTourInput.
// ──────────────────────────────────────────────
export function extractToursFromParsed(
  parsed: Record<string, unknown>,
): AlexandriaTourInput[] {
  const results: AlexandriaTourInput[] = [];
  const dataNode = (parsed as any).data;
  if (!dataNode) return results;

  for (const zeme of ensureArray(dataNode.zeme)) {
    const zemeName = attr(zeme, "name") || attr(zeme, "id");

    for (const oblast of ensureArray((zeme as any)?.oblast)) {
      for (const misto of ensureArray((oblast as any)?.misto)) {
        const mistoName = attr(misto, "name");
        const destination = `${zemeName} – ${mistoName}`;

        for (const hotel of ensureArray((misto as any)?.hotel)) {
          // objekt holds hotel metadata (may be single or array, take first)
          const objektArr = ensureArray((hotel as any)?.objekt);
          const objekt = objektArr[0] as Record<string, unknown> | undefined;
          const hotelName = attr(objekt, "nazev") || mistoName;
          const hotelId = attr(objekt, "ident_hotel");
          const hotelUrl = attr(objekt, "url");
          const stars = attr(objekt, "hvezdy");

          // Hotel-level images
          const hotelImages = ensureArray((hotel as any)?.obrazek)
            .map((img: unknown) => {
              const soubor = attr(img, "soubor");
              if (!soubor) return "";
              return hotelId
                ? `${IMAGE_BASE}/${hotelId}/${soubor}`
                : soubor;
            })
            .filter(Boolean);

          // Each termin is a separate tour offer
          for (const termin of ensureArray((hotel as any)?.termin)) {
            const startDate = parseCzDate(attr(termin, "datum_od"));
            const endDate = parseCzDate(attr(termin, "datum_do"));
            const transportType = mapTransport(attr(termin, "misto"));
            const board = attr(termin, "typstravy");
            const price = extractPrice(termin as Record<string, unknown>);

            if (!startDate || !endDate || !price) continue;

            const akce = attr(objekt, "akce");
            const terminId = attr(termin, "ident_hl");
            const externalId = akce && terminId
              ? `${akce}-${terminId}`
              : `${hotelId}-${startDate.toISOString().slice(0, 10)}`;

            results.push({
              externalId,
              destination,
              title: hotelName,
              price,
              startDate,
              endDate,
              transport: transportType,
              image: hotelImages[0] ?? "",
              description: null,
              photos: hotelImages,
              url: hotelUrl,
              stars,
              board,
            });
          }
        }
      }
    }
  }

  return results;
}

// Backward-compat alias
export function mapAlexandriaItem(_item: Record<string, unknown>): AlexandriaTourInput | null {
  return null; // no longer used — extractToursFromParsed walks the tree instead
}
