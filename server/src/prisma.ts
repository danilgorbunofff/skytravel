import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Graceful shutdown — release DB connections when the process exits.
function shutdown() {
  prisma.$disconnect().catch(console.error);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export default prisma;
