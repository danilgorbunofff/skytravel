import "dotenv/config";
import { mapBoard } from "../src/lib/alexandria.js";
import prisma from "../src/prisma.js";

async function main() {
  console.log("Fixing board values for Alexandria tours...");

  // Step 1: Update board values only (no externalId changes to avoid unique constraint issues)
  const tours = await prisma.providerTour.findMany({
    where: { source: "alexandria" },
    select: { id: true, board: true },
  });

  let fixed = 0;
  for (const tour of tours) {
    const mapped = mapBoard(tour.board);
    if (mapped !== tour.board) {
      await prisma.providerTour.update({
        where: { id: tour.id },
        data: { board: mapped },
      });
      fixed++;
    }
  }
  console.log(`Fixed ${fixed} board values out of ${tours.length} tours.`);

  // Step 2: Delete all Alexandria tours — their externalIds are now stale
  // The next refresh will re-create them with correct externalIds + board values
  if (fixed > 0) {
    console.log("Deleting stale Alexandria tours with outdated externalIds...");
    const deleted = await prisma.providerTour.deleteMany({
      where: { source: "alexandria" },
    });
    console.log(`Deleted ${deleted.count} Alexandria tours.`);

    // Step 3: Reset sync status so refresh picks up all regions
    console.log("Resetting Alexandria sync status...");
    await prisma.providerSync.deleteMany({
      where: { providerId: "alexandria" },
    });
    console.log("Sync status reset. Run refresh-alexandria to rebuild from scratch.");
  } else {
    console.log("No board values needed fixing — nothing to clean up.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
