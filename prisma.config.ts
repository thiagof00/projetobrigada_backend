import "dotenv/config";
import { defineConfig, env } from "prisma";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "node src/db/seed.js" },
  datasource: {
    url: env("DIRECT_URL"),
  },
});