import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client/client.js";
import bcrypt from "bcryptjs";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL is required");
}

const adapter = new PrismaMariaDb(dbUrl);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create default admin user (dev only)
  const hash = await bcrypt.hash("admin123", 10);
  await prisma.adminUser.upsert({
    where: { login: "admin" },
    update: {},
    create: { login: "admin", passwordHash: hash },
  });

  // Create sample destinations
  await prisma.destination.createMany({
    data: [
      { slug: "egypt", czechName: "Egypt", canonicalName: "Egypt" },
      { slug: "tunisia", czechName: "Tunisko", canonicalName: "Tunisia" },
      { slug: "turkey", czechName: "Turecko", canonicalName: "Turkey" },
      { slug: "greece", czechName: "Řecko", canonicalName: "Greece" },
      { slug: "spain", czechName: "Španělsko", canonicalName: "Spain" },
      { slug: "croatia", czechName: "Chorvatsko", canonicalName: "Croatia" },
    ],
    skipDuplicates: true,
  });

  console.log("Seed completed.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
