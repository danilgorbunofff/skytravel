import prisma from "../prisma.js";

type KnownDestination = {
  slug: string;
  czechName: string;
  canonicalName: string;
  aliases: string[];
  mappings?: Array<{ providerId: string; providerKey: string; providerValue: string; providerLabel: string }>;
};

export type PublicDestinationSummary = {
  id: number;
  slug: string;
  czechName: string;
  canonicalName: string;
  count: number;
  minPrice: number | null;
  providerCounts: Record<string, number>;
};

const KNOWN_DESTINATIONS: KnownDestination[] = [
  {
    slug: "bulharsko",
    czechName: "Bulharsko",
    canonicalName: "Bulgaria",
    aliases: ["bulharsko", "bulgaria"],
    mappings: [{ providerId: "alexandria", providerKey: "zeme", providerValue: "53", providerLabel: "Bulharsko" }],
  },
  {
    slug: "chorvatsko",
    czechName: "Chorvatsko",
    canonicalName: "Croatia",
    aliases: ["chorvatsko", "croatia", "hrvatska"],
    mappings: [{ providerId: "alexandria", providerKey: "zeme", providerValue: "107", providerLabel: "Chorvatsko" }],
  },
  {
    slug: "italie",
    czechName: "Itálie",
    canonicalName: "Italy",
    aliases: ["italie", "italy", "italija", "itálie"],
    mappings: [{ providerId: "alexandria", providerKey: "zeme", providerValue: "147", providerLabel: "Itálie" }],
  },
  { slug: "egypt", czechName: "Egypt", canonicalName: "Egypt", aliases: ["egypt"] },
  { slug: "tunisko", czechName: "Tunisko", canonicalName: "Tunisia", aliases: ["tunisko", "tunisia"] },
  { slug: "recko", czechName: "Řecko", canonicalName: "Greece", aliases: ["recko", "řecko", "greece", "rhodos", "santorini"] },
  { slug: "turecko", czechName: "Turecko", canonicalName: "Turkey", aliases: ["turecko", "turkey", "alanya"] },
  { slug: "kypr", czechName: "Kypr", canonicalName: "Cyprus", aliases: ["kypr", "cyprus", "larnaka", "jizni kypr", "jižní kypr"] },
  { slug: "spanelsko", czechName: "Španělsko", canonicalName: "Spain", aliases: ["spanelsko", "španělsko", "spain", "mallorca"] },
  { slug: "thajsko", czechName: "Thajsko", canonicalName: "Thailand", aliases: ["thajsko", "thailand"] },
  { slug: "madagaskar", czechName: "Madagaskar", canonicalName: "Madagascar", aliases: ["madagaskar", "madagascar"] },
  { slug: "dominikanska-republika", czechName: "Dominikánská republika", canonicalName: "Dominican Republic", aliases: ["dominikanska republika", "dominikánská republika", "dominican republic", "punta cana"] },
  { slug: "portugalsko", czechName: "Portugalsko", canonicalName: "Portugal", aliases: ["portugalsko", "portugal", "madeira"] },
];

let seedPromise: Promise<void> | null = null;

export function normalizeDestination(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyDestination(value: string): string {
  const normalized = normalizeDestination(value).replace(/\s+/g, "-");
  return normalized || "destination";
}

function findKnownDestination(label: string): KnownDestination | undefined {
  const normalized = normalizeDestination(label);
  return KNOWN_DESTINATIONS.find((destination) =>
    destination.aliases.some((alias) => {
      const normalizedAlias = normalizeDestination(alias);
      return normalized === normalizedAlias || normalized.startsWith(`${normalizedAlias} `) || normalized.includes(` ${normalizedAlias} `);
    }),
  );
}

export async function ensureKnownDestinations(): Promise<void> {
  seedPromise ??= (async () => {
    for (const destination of KNOWN_DESTINATIONS) {
      const row = await prisma.destination.upsert({
        where: { slug: destination.slug },
        create: {
          slug: destination.slug,
          czechName: destination.czechName,
          canonicalName: destination.canonicalName,
        },
        update: {
          czechName: destination.czechName,
          canonicalName: destination.canonicalName,
        },
      });

      for (const mapping of destination.mappings ?? []) {
        await prisma.destinationMapping.upsert({
          where: {
            providerId_providerKey_providerValue: {
              providerId: mapping.providerId,
              providerKey: mapping.providerKey,
              providerValue: mapping.providerValue,
            },
          },
          create: { ...mapping, destinationId: row.id },
          update: { destinationId: row.id, providerLabel: mapping.providerLabel },
        });
      }
    }
  })();
  return seedPromise;
}

export async function ensureProviderDestinationMapping(args: {
  providerId: string;
  providerKey: string;
  providerValue: string;
  providerLabel: string;
}): Promise<number> {
  await ensureKnownDestinations();

  const existingMapping = await prisma.destinationMapping.findUnique({
    where: {
      providerId_providerKey_providerValue: {
        providerId: args.providerId,
        providerKey: args.providerKey,
        providerValue: args.providerValue,
      },
    },
  });
  if (existingMapping) return existingMapping.destinationId;

  const known = findKnownDestination(args.providerLabel);
  const slug = known?.slug ?? slugifyDestination(args.providerLabel);
  const czechName = known?.czechName ?? args.providerLabel.trim();
  const canonicalName = known?.canonicalName ?? args.providerLabel.trim();

  const destination = await prisma.destination.upsert({
    where: { slug },
    create: { slug, czechName, canonicalName },
    update: { czechName, canonicalName },
  });

  await prisma.destinationMapping.upsert({
    where: {
      providerId_providerKey_providerValue: {
        providerId: args.providerId,
        providerKey: args.providerKey,
        providerValue: args.providerValue,
      },
    },
    create: {
      destinationId: destination.id,
      providerId: args.providerId,
      providerKey: args.providerKey,
      providerValue: args.providerValue,
      providerLabel: args.providerLabel,
    },
    update: {
      destinationId: destination.id,
      providerLabel: args.providerLabel,
    },
  });

  return destination.id;
}

export async function listPublicDestinations(providerId?: string): Promise<PublicDestinationSummary[]> {
  await ensureKnownDestinations();

  const countRows = await prisma.providerTour.groupBy({
    by: ["destinationId", "source"],
    where: {
      destinationId: { not: null },
      ...(providerId ? { source: providerId } : {}),
    },
    _count: { _all: true },
    _min: { price: true },
  });

  const counts = new Map<number, { count: number; minPrice: number | null; providerCounts: Record<string, number> }>();
  for (const row of countRows) {
    if (row.destinationId == null) continue;
    const entry = counts.get(row.destinationId) ?? { count: 0, minPrice: null, providerCounts: {} };
    entry.count += row._count._all;
    entry.providerCounts[row.source] = (entry.providerCounts[row.source] ?? 0) + row._count._all;
    const minPrice = row._min.price;
    if (minPrice != null && (entry.minPrice == null || minPrice < entry.minPrice)) entry.minPrice = minPrice;
    counts.set(row.destinationId, entry);
  }

  const destinations = await prisma.destination.findMany({ orderBy: { czechName: "asc" } });
  return destinations.map((destination) => {
    const entry = counts.get(destination.id) ?? { count: 0, minPrice: null, providerCounts: {} };
    return {
      id: destination.id,
      slug: destination.slug,
      czechName: destination.czechName,
      canonicalName: destination.canonicalName,
      count: entry.count,
      minPrice: entry.minPrice,
      providerCounts: entry.providerCounts,
    };
  });
}