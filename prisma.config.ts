import "dotenv/config";
import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

const nodeEnv = process.env["NODE_ENV"] ?? "development";
const workspaceRoot = process.cwd();

dotenv.config({ path: path.join(workspaceRoot, `.env.${nodeEnv}`) });
dotenv.config({ path: path.join(workspaceRoot, ".env") });

export default defineConfig({
  datasource: {
    url:
      process.env["DATABASE_URL"] ??
      "postgresql://postgres:postgres@localhost:5432/ecg_insight",
  },
  migrations: {
    path: "prisma/migrations",
  },
  schema: "prisma/schema.prisma",
});
