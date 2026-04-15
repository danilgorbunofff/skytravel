import "dotenv/config";
import prisma from "../src/prisma.js";
import { AlexandriaProvider } from "../src/providers/alexandriaProvider.js";

async function main() {
  console.log("[refresh-alexandria] Starting sync …");
  const provider = new AlexandriaProvider();
  await provider.syncToDb();
  await provider.loadCacheStatus();

  const status = provider.getCacheStatus();
  console.log(
    `[refresh-alexandria] Done — ${status.itemCount} tours synced (lastRefresh: ${status.lastRefresh ? new Date(status.lastRefresh).toISOString() : "n/a"})`,
  );
}

main()
  .catch((err) => {
    console.error("[refresh-alexandria] Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
