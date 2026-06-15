import { defineConfig } from "@prisma/config";

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || "mysql://dummy:dummy@localhost:3306/dummy",
  },
});
