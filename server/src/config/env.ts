import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

const nodeEnv = process.env["NODE_ENV"] ?? "development";
const workspaceRoot = path.resolve(__dirname, "../../..");

dotenv.config({ path: path.join(workspaceRoot, `.env.${nodeEnv}`) });
dotenv.config({ path: path.join(workspaceRoot, ".env") });

const developmentDefaults = {
  CLIENT_ORIGIN: "http://localhost:8081",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/ecg_insight",
  EXPO_PUBLIC_API_URL: "http://localhost:3001/api",
  JWT_REFRESH_SECRET:
    "dev-refresh-938cfdc355358b3b4d1879f159a0252b7b7fe3b08bcb0979d98b8ec4b82d684d",
  JWT_SECRET:
    "dev-access-bf05c9530d0e5b0cb6261389e7d95e1eda5202327d09cae39d2be38ef3d4a8a6",
  NODE_ENV: "development",
  PORT: "3001",
};

const envSchema = z
  .object({
    CLIENT_ORIGIN: z.string().url({
      message: "CLIENT_ORIGIN must be the frontend origin, for example http://localhost:8081.",
    }),
    COOKIE_DOMAIN: z.string().optional(),
    DATABASE_URL: z.string().url({
      message: "DATABASE_URL must be a valid PostgreSQL connection URL.",
    }),
    EXPO_PUBLIC_API_URL: z.string().url({
      message: "EXPO_PUBLIC_API_URL must be the public API URL used by the Expo app.",
    }),
    JWT_REFRESH_SECRET: z.string().min(32, {
      message: "JWT_REFRESH_SECRET must be at least 32 characters.",
    }),
    JWT_SECRET: z.string().min(32, {
      message: "JWT_SECRET must be at least 32 characters.",
    }),
    NODE_ENV: z.enum(["development", "test", "production"]),
    PORT: z.coerce.number().int().positive({
      message: "PORT must be a positive integer.",
    }),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== "production") return;

    const productionPlaceholders = [
      ["DATABASE_URL", value.DATABASE_URL],
      ["JWT_SECRET", value.JWT_SECRET],
      ["JWT_REFRESH_SECRET", value.JWT_REFRESH_SECRET],
      ["CLIENT_ORIGIN", value.CLIENT_ORIGIN],
      ["EXPO_PUBLIC_API_URL", value.EXPO_PUBLIC_API_URL],
    ] as const;

    for (const [key, currentValue] of productionPlaceholders) {
      if (/replace|change-me|example|localhost|USER:PASSWORD|HOST/i.test(currentValue)) {
        ctx.addIssue({
          code: "custom",
          message: `${key} must be set to a real production value before starting in production.`,
          path: [key],
        });
      }
    }
  });

const envInput =
  nodeEnv === "production"
    ? { ...process.env, NODE_ENV: nodeEnv }
    : { ...developmentDefaults, ...process.env, NODE_ENV: nodeEnv };

const parsedEnv = envSchema.safeParse(envInput);

if (!parsedEnv.success) {
  const messages = parsedEnv.error.issues
    .map((issue) => `- ${issue.path.join(".") || "ENV"}: ${issue.message}`)
    .join("\n");

  throw new Error(
    `Invalid ECG Insight environment configuration.\n${messages}\n\n` +
      "Create .env.development for local development or .env.production for deployment. " +
      "See .env.example for all required variables.",
  );
}

export const env = parsedEnv.data;
export const isProduction = env.NODE_ENV === "production";
