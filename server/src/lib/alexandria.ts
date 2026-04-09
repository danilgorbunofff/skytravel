import { XMLParser } from "fast-xml-parser";
import { config } from "../config.js";

const { url: ALEXANDRIA_URL, apiKey: ALEXANDRIA_API_KEY, country: ALEXANDRIA_COUNTRY } =
  config.alexandria;

// ──────────────────────────────────────────────
// Raw fetch – returns the XML string as-is
// ──────────────────────────────────────────────
export async function fetchAlexandriaRaw(countryId?: number): Promise<string> {
  const payload = {
    zeme: countryId ?? ALEXANDRIA_COUNTRY,
    zip: false,
    api_key: ALEXANDRIA_API_KEY,
  };

  const response = await fetch(ALEXANDRIA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Alexandria API error: ${response.status} ${response.statusText}`
    );
  }

  return response.text();
}

// ──────────────────────────────────────────────
// Parsed fetch – returns the XML as a plain JS object
// ──────────────────────────────────────────────
export async function fetchAlexandriaParsed(
  countryId?: number
): Promise<Record<string, unknown>> {
  const xml = await fetchAlexandriaRaw(countryId);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: (name) => name === "zajezd" || name === "tour" || name === "item" || name === "nabidka" || name === "offer",
  });
  return parser.parse(xml) as Record<string, unknown>;
}

// ──────────────────────────────────────────────
// Tour mapper
// Inspects parsed XML and maps entries to Tour-shaped objects.
// Field names are guesses based on common Czech XML export conventions;
// adjust after seeing a real response via the /preview endpoint.
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
};

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function str(value: unknown): string {
  return value !== undefined && value !== null ? String(value).trim() : "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapAlexandriaItem(item: Record<string, any>): AlexandriaTourInput | null {
  // Try multiple candidate field names for each required property
  const destination =
    str(item.destinace ?? item.stredisko ?? item.zeme_nazev ?? item.nazev_zeme ?? "");
  const title =
    str(item.nazev ?? item.name ?? item.hotel ?? destination);
  const rawPrice =
    item.cena ?? item.cena_od ?? item.price ?? item.priceFrom;
  const price = rawPrice !== undefined ? Number(rawPrice) : 0;
  const startDate =
    toDate(item.termin_od ?? item.datum_odjezdu ?? item.termin_od_datum ?? item.odjezd);
  const endDate =
    toDate(item.termin_do ?? item.datum_navratu ?? item.termin_do_datum ?? item.navrat);
  const transportRaw =
    str(item.doprava ?? item.transport ?? "plane").toLowerCase();
  const transport =
    transportRaw.includes("let") || transportRaw.includes("air")
      ? "plane"
      : transportRaw.includes("vlak") || transportRaw.includes("train")
        ? "train"
        : transportRaw.includes("bus") || transportRaw.includes("autobus")
          ? "bus"
          : transportRaw.includes("lo") || transportRaw.includes("boat")
            ? "boat"
            : "plane";

  // Images: Alexandria may nest them under obrazky/obrazek or use img/foto
  const imageNode = item.obrazky?.obrazek ?? item.images?.image ?? item.foto ?? item.fotky?.fotka;
  let photos: string[] = [];
  if (Array.isArray(imageNode)) {
    photos = imageNode.map(str).filter(Boolean);
  } else if (imageNode) {
    const s = str(imageNode);
    if (s) photos = [s];
  }
  const image = photos[0] ?? "";

  const description = str(item.popis ?? item.description ?? item.poznamka ?? "") || null;
  const externalId = str(item.id ?? item.kod ?? item.kodzajezdu ?? item.externalId ?? "");

  if (!destination || !price || !startDate || !endDate) return null;

  return {
    externalId,
    destination,
    title: title || destination,
    price,
    startDate,
    endDate,
    transport,
    image,
    description,
    photos,
  };
}
