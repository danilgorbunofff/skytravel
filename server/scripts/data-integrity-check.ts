/**
 * One-off data integrity check & cleanup script.
 * Run with: npx tsx server/scripts/data-integrity-check.ts
 *
 * Reports orphaned records and optionally cleans them up.
 * Pass --fix to actually delete orphans (default: dry-run).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const fix = process.argv.includes("--fix");

async function main() {
  console.log(`Data integrity check (${fix ? "FIX mode" : "DRY RUN"})...\n`);

  // 1. Leads pointing to deleted tours
  const orphanedLeads = await prisma.lead.findMany({
    where: {
      tourId: { not: null },
      tour: null,
    },
    select: { id: true, tourId: true, email: true },
  });
  console.log(`Leads with orphaned tourId: ${orphanedLeads.length}`);
  if (fix && orphanedLeads.length > 0) {
    await prisma.lead.updateMany({
      where: { id: { in: orphanedLeads.map((l) => l.id) } },
      data: { tourId: null },
    });
    console.log(`  → Set tourId to NULL on ${orphanedLeads.length} leads`);
  }

  // 2. ProviderTours with orphaned destinationId
  const orphanedProviderTours = await prisma.providerTour.findMany({
    where: {
      destinationId: { not: null },
      canonicalDestination: null,
    },
    select: { id: true, destinationId: true },
  });
  console.log(`ProviderTours with orphaned destinationId: ${orphanedProviderTours.length}`);
  if (fix && orphanedProviderTours.length > 0) {
    await prisma.providerTour.updateMany({
      where: { id: { in: orphanedProviderTours.map((t) => t.id) } },
      data: { destinationId: null },
    });
    console.log(`  → Set destinationId to NULL on ${orphanedProviderTours.length} provider tours`);
  }

  // 3. Stale ProviderTours (synced more than 30 days ago)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const staleCount = await prisma.providerTour.count({
    where: { syncedAt: { lt: thirtyDaysAgo } },
  });
  console.log(`ProviderTours stale (>30 days since sync): ${staleCount}`);
  if (fix && staleCount > 0) {
    const deleted = await prisma.providerTour.deleteMany({
      where: { syncedAt: { lt: thirtyDaysAgo } },
    });
    console.log(`  → Deleted ${deleted.count} stale provider tours`);
  }

  // 4. Triggered price alerts older than 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const oldAlerts = await prisma.priceAlert.count({
    where: { triggered: true, triggeredAt: { lt: ninetyDaysAgo } },
  });
  console.log(`Triggered PriceAlerts older than 90 days: ${oldAlerts}`);
  if (fix && oldAlerts > 0) {
    const deleted = await prisma.priceAlert.deleteMany({
      where: { triggered: true, triggeredAt: { lt: ninetyDaysAgo } },
    });
    console.log(`  → Deleted ${deleted.count} old triggered alerts`);
  }

  // 5. DestinationMappings with orphaned destination
  const orphanedMappings = await prisma.destinationMapping.findMany({
    where: { destination: null as never },
    select: { id: true },
  });
  // This shouldn't happen due to CASCADE, but check anyway
  console.log(`DestinationMappings with no parent destination: ${orphanedMappings.length}`);

  console.log("\nDone.");
  if (
    !fix &&
    (orphanedLeads.length > 0 ||
      orphanedProviderTours.length > 0 ||
      staleCount > 0 ||
      oldAlerts > 0)
  ) {
    console.log("Run with --fix to apply changes.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
