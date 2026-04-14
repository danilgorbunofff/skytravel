/**
 * refresh-orextravel.ts
 *
 * Standalone script that fetches tours from the Orextravel SAMO XML Gate,
 * and optionally upserts them into the database.
 *
 * Usage:
 *   npx tsx scripts/refresh-orextravel.ts                # just fetch & log stats
 *   npx tsx scripts/refresh-orextravel.ts --import       # also upsert into DB
 *   npx tsx scripts/refresh-orextravel.ts --town 54      # specific departure town
 *   npx tsx scripts/refresh-orextravel.ts --state 4      # specific destination country
 */

import "dotenv/config";
import {
  fetchOrextravelTours,
  syncReferenceCache,
} from "../src/lib/orextravel.js";
import prisma from "../src/prisma.js";

const args = process.argv.slice(2);
const doImport = args.includes("--import");

let townFrom: number | undefined;
const townIdx = args.indexOf("--town");
if (townIdx !== -1 && args[townIdx + 1]) {
  townFrom = Number(args[townIdx + 1]);
}

let stateId: number | undefined;
const stateIdx = args.indexOf("--state");
if (stateIdx !== -1 && args[stateIdx + 1]) {
  stateId = Number(args[stateIdx + 1]);
}

async function main() {
  console.log("[Orextravel] Starting sync…");
  if (townFrom) console.log(`[Orextravel]   townFrom=${townFrom}`);
  if (stateId) console.log(`[Orextravel]   stateId=${stateId}`);

  await syncReferenceCache();

  console.log("[Orextravel] Fetching tour offers…");
  const tours = await fetchOrextravelTours(townFrom, stateId);
  console.log(`[Orextravel] Parsed ${tours.length} tour offers.`);

  if (tours.length === 0) {
    console.log("[Orextravel] No tours found. Exiting.");
    return;
  }

  // Stats
  const now = new Date();
  const upcoming = tours.filter((t) => t.startDate > now);
  const cheapest = [...upcoming].sort((a, b) => a.price - b.price).slice(0, 5);
  const destinations = new Set(tours.map((t) => t.destination));
  const hotels = new Set(tours.map((t) => t.title));

  console.log(`[Orextravel] ${upcoming.length} upcoming departures.`);
  console.log(`[Orextravel] ${destinations.size} unique destinations, ${hotels.size} unique hotels.`);
  console.log("[Orextravel] Top 5 cheapest upcoming offers:");
  for (const t of cheapest) {
    console.log(
      `  - ${t.title} | ${t.destination} | ${t.price} CZK | ${t.startDate.toISOString().slice(0, 10)} | ${t.nights}n`,
    );
  }

  if (!doImport) {
    console.log("[Orextravel] Done (dry run). Pass --import to upsert into DB.");
    return;
  }

  // Upsert into DB
  console.log("[Orextravel] Importing into database…");
  let created = 0;
  let updated = 0;

  for (const item of tours) {
    const existing = await prisma.tour.findFirst({
      where: {
        source: "orextravel",
        externalId: item.externalId,
      },
    });

    const data = {
      destination: item.destination,
      title: item.title,
      price: item.price,
      startDate: item.startDate,
      endDate: item.endDate,
      transport: item.transport,
      image: item.image,
      description: item.description,
      photos: item.photos.length > 0 ? item.photos : undefined,
      source: "orextravel" as const,
      externalId: item.externalId,
    };

    if (existing) {
      await prisma.tour.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.tour.create({
        data: { ...data, sortOrder: await prisma.tour.count() },
      });
      created++;
    }
  }

  console.log(
    `[Orextravel] Import complete: ${created} created, ${updated} updated, ${tours.length} total.`,
  );
}

main()
  .catch((err) => {
    console.error("[Orextravel] Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
