import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
