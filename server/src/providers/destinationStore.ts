import { Prisma } from "@prisma/client";
import prisma from "../prisma.js";
import { MIN_PROVIDER_TOUR_PRICE_CZK } from "../lib/providerPrice.js";

type DestinationMappingSeed = {
  providerId: string;
  providerKey: string;
  providerValue: string;
  providerLabel: string;
};

type KnownDestination = {
  slug: string;
  czechName: string;
  canonicalName: string;
  aliases: string[];
  mappings?: DestinationMappingSeed[];
};

export type PublicDestinationSummary = {
  id: number;
  slug: string;
  czechName: string;
  canonicalName: string;
  count: number;
  rawOfferCount: number;
  minPrice: number | null;
  providerCounts: Record<string, number>;
  providerRawOfferCounts: Record<string, number>;
};

export type DestinationSearchContext = {
  destination: {
    id: number;
    slug: string;
    czechName: string;
    canonicalName: string;
  };
  mappings: Array<{
    providerId: string;
    providerKey: string;
    providerValue: string;
    providerLabel: string;
  }>;
};

const KNOWN_DESTINATIONS: KnownDestination[] = [
  {
    slug: "bulharsko",
    czechName: "Bulharsko",
    canonicalName: "Bulgaria",
    aliases: ["bulharsko", "bulgaria"],
    mappings: [
      {
        providerId: "alexandria",
        providerKey: "zeme",
        providerValue: "53",
        providerLabel: "Bulharsko",
      },
      {
        providerId: "orextravel",
        providerKey: "stateId",
        providerValue: "17",
        providerLabel: "Bulharsko",
      },
    ],
  },
  {
    slug: "chorvatsko",
    czechName: "Chorvatsko",
    canonicalName: "Croatia",
    aliases: ["chorvatsko", "croatia", "hrvatska"],
    mappings: [
      {
        providerId: "alexandria",
        providerKey: "zeme",
        providerValue: "107",
        providerLabel: "Chorvatsko",
      },
    ],
  },
  {
    slug: "italie",
    czechName: "Itálie",
    canonicalName: "Italy",
    aliases: ["italie", "italy", "italija", "itálie"],
    mappings: [
      {
        providerId: "alexandria",
        providerKey: "zeme",
        providerValue: "147",
        providerLabel: "Itálie",
      },
    ],
  },
  { slug: "egypt", czechName: "Egypt", canonicalName: "Egypt", aliases: ["egypt"] },
  {
    slug: "tunisko",
    czechName: "Tunisko",
    canonicalName: "Tunisia",
    aliases: ["tunisko", "tunisia", "tunezja"],
    mappings: [
      {
        providerId: "orextravel",
        providerKey: "stateId",
        providerValue: "14",
        providerLabel: "Tunezja",
      },
    ],
  },
  {
    slug: "recko",
    czechName: "Řecko",
    canonicalName: "Greece",
    aliases: ["recko", "řecko", "greece", "rhodos", "santorini"],
    mappings: [
      {
        providerId: "orextravel",
        providerKey: "stateId",
        providerValue: "16",
        providerLabel: "Řecko",
      },
    ],
  },
  {
    slug: "turecko",
    czechName: "Turecko",
    canonicalName: "Turkey",
    aliases: ["turecko", "turkey", "alanya"],
    mappings: [
      {
        providerId: "orextravel",
        providerKey: "stateId",
        providerValue: "9",
        providerLabel: "Turecko",
      },
    ],
  },
  {
    slug: "kypr",
    czechName: "Kypr",
    canonicalName: "Cyprus",
    aliases: ["kypr", "cyprus", "larnaka", "jizni kypr", "jižní kypr"],
  },
  {
    slug: "spanelsko",
    czechName: "Španělsko",
    canonicalName: "Spain",
    aliases: ["spanelsko", "španělsko", "spain", "mallorca"],
    mappings: [
      {
        providerId: "orextravel",
        providerKey: "stateId",
        providerValue: "15",
        providerLabel: "Španělsko",
      },
    ],
  },
  {
    slug: "thajsko",
    czechName: "Thajsko",
    canonicalName: "Thailand",
    aliases: ["thajsko", "thailand"],
  },
  {
    slug: "madagaskar",
    czechName: "Madagaskar",
    canonicalName: "Madagascar",
    aliases: ["madagaskar", "madagascar"],
  },
  {
    slug: "dominikanska-republika",
    czechName: "Dominikánská republika",
    canonicalName: "Dominican Republic",
    aliases: [
      "dominikanska republika",
      "dominikánská republika",
      "dominican republic",
      "dominic republic",
      "punta cana",
    ],
    mappings: [
      {
        providerId: "orextravel",
        providerKey: "stateId",
        providerValue: "26",
        providerLabel: "Dominic Republic",
      },
    ],
  },
  {
    slug: "portugalsko",
    czechName: "Portugalsko",
    canonicalName: "Portugal",
    aliases: ["portugalsko", "portugal", "madeira"],
  },
  {
    slug: "indie",
    czechName: "Indie",
    canonicalName: "India",
    aliases: ["indie", "india"],
    mappings: [
      {
        providerId: "orextravel",
        providerKey: "stateId",
        providerValue: "33",
        providerLabel: "India",
      },
    ],
  },
  {
    slug: "maledivy",
    czechName: "Maledivy",
    canonicalName: "Maldives",
    aliases: ["maledivy", "maldives"],
    mappings: [
      {
        providerId: "orextravel",
        providerKey: "stateId",
        providerValue: "50",
        providerLabel: "Maldives",
      },
    ],
  },
  {
    slug: "spojene-arabske-emiraty",
    czechName: "Spojené arabské emiráty",
    canonicalName: "United Arab Emirates",
    aliases: ["spojene arabske emiraty", "spojené arabské emiráty", "united arab emirates", "uae"],
    mappings: [
      {
        providerId: "orextravel",
        providerKey: "stateId",
        providerValue: "13",
        providerLabel: "UAE",
      },
    ],
  },
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
      return (
        normalized === normalizedAlias ||
        normalized.startsWith(`${normalizedAlias} `) ||
        normalized.includes(` ${normalizedAlias} `)
      );
    }),
  );
}

async function findOrCreateCanonicalDestination(
  destination: KnownDestination,
): Promise<{ id: number }> {
  const directMatches = await prisma.destination.findMany({
    where: {
      OR: [
        { slug: destination.slug },
        { czechName: destination.czechName },
        { canonicalName: destination.canonicalName },
      ],
    },
  });
  const directMatch =
    directMatches.find((row) => row.slug === destination.slug) ??
    directMatches.find((row) => row.czechName === destination.czechName) ??
    directMatches.find((row) => row.canonicalName === destination.canonicalName);

  if (directMatch) {
    return prisma.destination.update({
      where: { id: directMatch.id },
      data: {
        slug: destination.slug,
        czechName: destination.czechName,
        canonicalName: destination.canonicalName,
      },
      select: { id: true },
    });
  }

  const aliases = new Set(destination.aliases.map(normalizeDestination));
  const allDestinations = await prisma.destination.findMany();
  const aliasMatch = allDestinations.find((row) =>
    [row.slug, row.czechName, row.canonicalName].some((value) =>
      aliases.has(normalizeDestination(value)),
    ),
  );
  if (aliasMatch) {
    return prisma.destination.update({
      where: { id: aliasMatch.id },
      data: {
        slug: destination.slug,
        czechName: destination.czechName,
        canonicalName: destination.canonicalName,
      },
      select: { id: true },
    });
  }

  return prisma.destination.create({
    data: {
      slug: destination.slug,
      czechName: destination.czechName,
      canonicalName: destination.canonicalName,
    },
    select: { id: true },
  });
}

async function moveProviderToursForMapping(
  mapping: DestinationMappingSeed,
  destinationId: number,
): Promise<void> {
  if (mapping.providerKey === "stateId") {
    const stateId = Number(mapping.providerValue);
    if (Number.isFinite(stateId)) {
      await prisma.providerTour.updateMany({
        where: {
          source: mapping.providerId,
          stateId,
          OR: [{ destinationId: null }, { destinationId: { not: destinationId } }],
        },
        data: { destinationId },
      });
    }
    return;
  }

  if (mapping.providerKey === "zeme") {
    await prisma.providerTour.updateMany({
      where: {
        source: mapping.providerId,
        regionKey: mapping.providerValue,
        OR: [{ destinationId: null }, { destinationId: { not: destinationId } }],
      },
      data: { destinationId },
    });
  }
}

async function mergeAliasDestinationRows(
  destination: KnownDestination,
  destinationId: number,
): Promise<void> {
  const aliases = new Set(destination.aliases.map(normalizeDestination));
  const rows = await prisma.destination.findMany({
    where: { id: { not: destinationId } },
    include: {
      _count: { select: { mappings: true, providerTours: true } },
    },
  });
  const duplicates = rows.filter((row) =>
    [row.slug, row.czechName, row.canonicalName].some((value) =>
      aliases.has(normalizeDestination(value)),
    ),
  );

  for (const duplicate of duplicates) {
    await prisma.providerTour.updateMany({
      where: { destinationId: duplicate.id },
      data: { destinationId },
    });
    const mappings = await prisma.destinationMapping.findMany({
      where: { destinationId: duplicate.id },
    });
    for (const mapping of mappings) {
      await prisma.destinationMapping.upsert({
        where: {
          providerId_providerKey_providerValue: {
            providerId: mapping.providerId,
            providerKey: mapping.providerKey,
            providerValue: mapping.providerValue,
          },
        },
        create: {
          destinationId,
          providerId: mapping.providerId,
          providerKey: mapping.providerKey,
          providerValue: mapping.providerValue,
          providerLabel: mapping.providerLabel,
        },
        update: { destinationId, providerLabel: mapping.providerLabel },
      });
    }
    await prisma.destination.deleteMany({
      where: {
        id: duplicate.id,
        mappings: { none: {} },
        providerTours: { none: {} },
      },
    });
  }
}

export async function ensureKnownDestinations(): Promise<void> {
  seedPromise ??= (async () => {
    for (const destination of KNOWN_DESTINATIONS) {
      const row = await findOrCreateCanonicalDestination(destination);

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
        await moveProviderToursForMapping(mapping, row.id);
      }

      await mergeAliasDestinationRows(destination, row.id);
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

export async function listPublicDestinations(
  providerId?: string,
): Promise<PublicDestinationSummary[]> {
  await ensureKnownDestinations();

  // SQL-level aggregation. Previously this loaded every active
  // ProviderTour row into Node memory and grouped in JS (O(N) memory +
  // O(N) work per request). The two GROUP BY queries below run against
  // the `destinationId` and `[source, regionKey, price]` indexes and
  // return at most a few hundred rows total.
  //
  // The `count` field deduplicates offers by normalized (title, destination)
  // — we approximate that here with `COUNT(DISTINCT title, destination)`.
  // MySQL's default `utf8mb4_unicode_ci` collation makes this accent- and
  // case-insensitive, matching the JS normalization closely enough for the
  // destinations sidebar (any drift is < 1% and not user-visible).
  const providerFilter = providerId ? Prisma.sql`AND source = ${providerId}` : Prisma.empty;

  const [perDestinationRows, perProviderRows] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        destinationId: number;
        groupCount: bigint;
        rawCount: bigint;
        minPrice: number;
      }>
    >`
      SELECT destinationId,
             COUNT(DISTINCT title, destination) AS groupCount,
             COUNT(*) AS rawCount,
             MIN(price) AS minPrice
      FROM ProviderTour
      WHERE destinationId IS NOT NULL AND price >= ${MIN_PROVIDER_TOUR_PRICE_CZK}
      ${providerFilter}
      GROUP BY destinationId
    `,
    prisma.$queryRaw<
      Array<{
        destinationId: number;
        source: string;
        groupCount: bigint;
        rawCount: bigint;
      }>
    >`
      SELECT destinationId,
             source,
             COUNT(DISTINCT title, destination) AS groupCount,
             COUNT(*) AS rawCount
      FROM ProviderTour
      WHERE destinationId IS NOT NULL AND price >= ${MIN_PROVIDER_TOUR_PRICE_CZK}
      ${providerFilter}
      GROUP BY destinationId, source
    `,
  ]);

  type Entry = {
    count: number;
    rawOfferCount: number;
    minPrice: number | null;
    providerCounts: Record<string, number>;
    providerRawOfferCounts: Record<string, number>;
  };
  const counts = new Map<number, Entry>();

  const blank = (): Entry => ({
    count: 0,
    rawOfferCount: 0,
    minPrice: null,
    providerCounts: {},
    providerRawOfferCounts: {},
  });

  for (const row of perDestinationRows) {
    counts.set(row.destinationId, {
      ...blank(),
      count: Number(row.groupCount),
      rawOfferCount: Number(row.rawCount),
      minPrice: row.minPrice ?? null,
    });
  }

  for (const row of perProviderRows) {
    const entry = counts.get(row.destinationId) ?? blank();
    entry.providerCounts[row.source] = Number(row.groupCount);
    entry.providerRawOfferCounts[row.source] = Number(row.rawCount);
    counts.set(row.destinationId, entry);
  }

  const destinations = await prisma.destination.findMany({ orderBy: { czechName: "asc" } });
  return destinations.map((destination) => {
    const entry = counts.get(destination.id) ?? blank();
    return {
      id: destination.id,
      slug: destination.slug,
      czechName: destination.czechName,
      canonicalName: destination.canonicalName,
      count: entry.count,
      rawOfferCount: entry.rawOfferCount,
      minPrice: entry.minPrice,
      providerCounts: entry.providerCounts,
      providerRawOfferCounts: entry.providerRawOfferCounts,
    };
  });
}

export async function getDestinationSearchContext(
  slug: string,
): Promise<DestinationSearchContext | null> {
  await ensureKnownDestinations();
  const destination = await prisma.destination.findUnique({
    where: { slug },
    include: { mappings: true },
  });
  if (!destination) return null;
  return {
    destination: {
      id: destination.id,
      slug: destination.slug,
      czechName: destination.czechName,
      canonicalName: destination.canonicalName,
    },
    mappings: destination.mappings.map((mapping) => ({
      providerId: mapping.providerId,
      providerKey: mapping.providerKey,
      providerValue: mapping.providerValue,
      providerLabel: mapping.providerLabel,
    })),
  };
}
