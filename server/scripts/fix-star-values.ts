import "dotenv/config";
import { mapStars } from "../src/lib/alexandria.js";
import prisma from "../src/prisma.js";

async function main() {
  console.log("Fixing star values for Alexandria tours...");

  const tours = await prisma.providerTour.findMany({
    where: { source: "alexandria" },
    select: { id: true, stars: true },
  });

  let fixed = 0;
  for (const tour of tours) {
    const mapped = mapStars(tour.stars);
    if (mapped !== tour.stars) {
      await prisma.providerTour.update({
        where: { id: tour.id },
        data: { stars: mapped },
      });
      fixed++;
    }
  }
  console.log(`Fixed ${fixed} star values out of ${tours.length} tours.`);

  if (fixed > 0) {
    console.log("Deleting stale Alexandria tours to force full re-sync...");
    const deleted = await prisma.providerTour.deleteMany({
      where: { source: "alexandria" },
    });
    console.log(`Deleted ${deleted.count} Alexandria tours.`);

    await prisma.providerSync.deleteMany({
      where: { providerId: "alexandria" },
    });
    console.log("Sync status reset. Run refresh-alexandria to rebuild.");
  } else {
    console.log("No star values needed fixing.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
