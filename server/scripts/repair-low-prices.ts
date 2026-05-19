import "dotenv/config";
import prisma from "../src/prisma.js";
import { MIN_PROVIDER_TOUR_PRICE_CZK } from "../src/lib/providerPrice.js";

async function main() {
  const grouped = await prisma.providerTour.groupBy({
    by: ["source"],
    where: { price: { lt: MIN_PROVIDER_TOUR_PRICE_CZK } },
    _count: { _all: true },
    _min: { price: true },
  });

  if (grouped.length === 0) {
    console.log(`[repair-low-prices] No provider tours below ${MIN_PROVIDER_TOUR_PRICE_CZK} Kč.`);
    return;
  }

  for (const group of grouped) {
    console.log(
      `[repair-low-prices] ${group.source}: ${group._count._all} rows below ${MIN_PROVIDER_TOUR_PRICE_CZK} Kč (min ${group._min.price ?? "n/a"} Kč).`,
    );
  }

  const deleted = await prisma.providerTour.deleteMany({
    where: { price: { lt: MIN_PROVIDER_TOUR_PRICE_CZK } },
  });

  console.log(`[repair-low-prices] Deleted ${deleted.count} implausible provider-tour rows.`);
}

main()
  .catch((err) => {
    console.error("[repair-low-prices] Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
