/**
 * refresh-alexandria.ts
 *
 * Standalone script that fetches the Alexandria XML feed, parses it,
 * and optionally upserts tours into the database.
 *
 * Usage:
 *   npx tsx scripts/refresh-alexandria.ts          # just refresh cache & log stats
 *   npx tsx scripts/refresh-alexandria.ts --import  # also upsert into DB
 *   npx tsx scripts/refresh-alexandria.ts --zeme 53 # specific country id
 */

import "dotenv/config";
import {
  fetchAlexandriaParsed,
  extractToursFromParsed,
} from "../src/lib/alexandria.js";
import prisma from "../src/prisma.js";

const args = process.argv.slice(2);
const doImport = args.includes("--import");

let countryId: number | undefined;
const zemeIdx = args.indexOf("--zeme");
if (zemeIdx !== -1 && args[zemeIdx + 1]) {
  countryId = Number(args[zemeIdx + 1]);
}

async function main() {
  const defaultCountry = Number(process.env.ALEXANDRIA_COUNTRY || 107);
  const zeme = countryId ?? defaultCountry;

  console.log(`[Alexandria] Fetching feed for zeme=${zeme} …`);
  const parsed = await fetchAlexandriaParsed(zeme);
  const tours = extractToursFromParsed(parsed);
  console.log(`[Alexandria] Parsed ${tours.length} tour offers.`);

  if (tours.length === 0) {
    console.log("[Alexandria] No tours found. Exiting.");
    return;
  }

  // Stats
  const now = new Date();
  const upcoming = tours.filter((t) => t.startDate > now);
  const cheapest = [...upcoming].sort((a, b) => a.price - b.price).slice(0, 5);
  console.log(`[Alexandria] ${upcoming.length} upcoming departures.`);
  console.log("[Alexandria] Top 5 cheapest upcoming offers:");
  for (const t of cheapest) {
    console.log(
      `  - ${t.title} | ${t.destination} | ${t.price} CZK | ${t.startDate.toISOString().slice(0, 10)}`
    );
  }

  if (!doImport) {
    console.log("[Alexandria] Done (dry run). Pass --import to upsert into DB.");
    return;
  }

  // Upsert into DB
  console.log("[Alexandria] Importing into database …");
  let created = 0;
  let updated = 0;

  for (const item of tours) {
    const existing = item.externalId
      ? await prisma.tour.findFirst({
          where: {
            source: "alexandria",
            externalId: item.externalId,
          },
        })
      : await prisma.tour.findFirst({
          where: {
            destination: item.destination,
            title: item.title,
            startDate: item.startDate,
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
      source: "alexandria" as const,
      externalId: item.externalId || undefined,
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
    `[Alexandria] Import complete: ${created} created, ${updated} updated, ${tours.length} total.`
  );
}

main()
  .catch((err) => {
    console.error("[Alexandria] Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
