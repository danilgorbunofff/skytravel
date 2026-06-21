import "dotenv/config";
import { mapBoard } from "../src/lib/alexandria.js";
import prisma from "../src/prisma.js";

async function main() {
  console.log("Fixing board values for Alexandria tours...");

  const tours = await prisma.providerTour.findMany({
    where: { source: "alexandria" },
    select: { id: true, board: true, externalId: true },
  });

  let fixed = 0;
  for (const tour of tours) {
    const mapped = mapBoard(tour.board);
    if (mapped !== tour.board) {
      const newExternalId = tour.externalId.replace(
        new RegExp(`${escapeRegex(tour.board)}$`),
        mapped,
      );
      await prisma.providerTour.update({
        where: { id: tour.id },
        data: { board: mapped, externalId: newExternalId },
      });
      fixed++;
    }
  }

  console.log(`Checked ${tours.length} tours, fixed ${fixed}.`);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
