// Prisma 7 no longer auto-loads .env, so load it here for both the CLI and `npm start`.
import "dotenv/config";
import { defineConfig } from "@prisma/config";

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || "mysql://dummy:dummy@localhost:3306/dummy",
  },
});
