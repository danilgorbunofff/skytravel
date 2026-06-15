import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@server/generated/prisma/client/client.js";
import { logger } from "@server/lib/logger.js";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL is required");
}

// Limit the MariaDB connection pool to 5 connections to prevent memory
// exhaustion under the 450 MB --max-old-space-size limit.
const poolUrl = new URL(dbUrl);
poolUrl.searchParams.set("connectionLimit", "5");
const adapter = new PrismaMariaDb(poolUrl.toString());
const prisma = new PrismaClient({ adapter });

// Graceful shutdown — release DB connections when the process exits.
function shutdown() {
  prisma.$disconnect().catch((e) => logger.error(e, "prisma disconnect error"));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Export pool info
export function getPoolInfo() {
  return { connectionLimit: 5, poolTimeout: 10 };
}

export default prisma;
