// ──────────────────────────────────────────────
// Region Store — DB-backed cache of provider regions
// ──────────────────────────────────────────────

import prisma from "../prisma.js";
import type { ProviderRegion, ProviderRegionRecord } from "./types.js";

const L1_TTL_MS = 5 * 60 * 1000; // 5 min in-process cache
const l1: Map<string, { ts: number; data: ProviderRegion[] }> = new Map();

function rowToRegion(row: {
  externalId: string;
  name: string;
  tourCount: number;
  meta: unknown;
}): ProviderRegion {
  const id = Number(row.externalId);
  return {
    id: Number.isFinite(id) ? id : 0,
    name: row.name,
    count: row.tourCount > 0 ? row.tourCount : undefined,
    meta: (row.meta as Record<string, unknown> | null) ?? undefined,
  };
}

/** Read regions for a provider from DB (with in-process L1 cache).
 *  Rows are grouped by (externalId, name) so providers that store one row per
 *  departure-route (e.g. Orextravel's town×state pairs) return each destination
 *  only once, with tourCount summed across all routes. */
export async function readRegions(providerId: string): Promise<ProviderRegion[]> {
  const cached = l1.get(providerId);
  if (cached && Date.now() - cached.ts < L1_TTL_MS) {
    return cached.data;
  }
  const groups = await prisma.providerRegion.groupBy({
    by: ["externalId", "name"],
    where: { providerId },
    _sum: { tourCount: true },
    orderBy: { name: "asc" },
  });
  const items = groups.map((g) =>
    rowToRegion({
      externalId: g.externalId,
      name: g.name,
      tourCount: g._sum.tourCount ?? 0,
      meta: null,
    }),
  );
  l1.set(providerId, { ts: Date.now(), data: items });
  return items;
}

/** Invalidate L1 cache (call after writeRegions). */
export function invalidateRegionsCache(providerId: string): void {
  l1.delete(providerId);
}

/** Replace all regions for a provider with the given set, in a single transaction. */
export async function writeRegions(
  providerId: string,
  records: ProviderRegionRecord[],
): Promise<void> {
  const seenKeys = new Set(records.map((r) => r.regionKey));

  // Upsert all current records
  for (const rec of records) {
    await prisma.providerRegion.upsert({
      where: {
        providerId_regionKey: {
          providerId,
          regionKey: rec.regionKey,
        },
      },
      create: {
        providerId,
        regionKey: rec.regionKey,
        externalId: rec.externalId,
        parentExternalId: rec.parentExternalId,
        name: rec.name,
        meta: rec.meta as object | undefined,
      },
      update: {
        externalId: rec.externalId,
        parentExternalId: rec.parentExternalId,
        name: rec.name,
        meta: rec.meta as object | undefined,
      },
    });
  }

  // Delete stale rows
  if (seenKeys.size > 0) {
    await prisma.providerRegion.deleteMany({
      where: {
        providerId,
        regionKey: { notIn: [...seenKeys] },
      },
    });
  }

  invalidateRegionsCache(providerId);
}

/** Update tourCount for a single region after a per-region tour sync. */
export async function updateRegionTourCount(
  providerId: string,
  regionKey: string,
  tourCount: number,
): Promise<void> {
  await prisma.providerRegion.updateMany({
    where: { providerId, regionKey },
    data: { tourCount },
  });
  invalidateRegionsCache(providerId);
}

/** Sum tourCount for regions matching an optional regionKey filter (or all). */
export async function sumRegionTourCount(
  providerId: string,
  regionKey?: string | { startsWith?: string; endsWith?: string; equals?: string },
): Promise<number> {
  const where: Record<string, unknown> = { providerId };
  if (typeof regionKey === "string") {
    where.regionKey = regionKey;
  } else if (regionKey) {
    where.regionKey = regionKey;
  }
  const agg = await prisma.providerRegion.aggregate({
    where,
    _sum: { tourCount: true },
  });
  return agg._sum.tourCount ?? 0;
}
