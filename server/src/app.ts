import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { metricsSnapshot, requestMetrics } from "./middleware/observability";
import { modulesRouter } from "./modules";

const developmentOrigins = ["http://localhost:8082", "http://localhost:8081", "http://localhost:3000"];

function allowedOrigins() {
  const configuredOrigins = env.CLIENT_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return env.NODE_ENV === "development"
    ? Array.from(new Set([...configuredOrigins, ...developmentOrigins]))
    : configuredOrigins;
}

export function createApp() {
  const app = express();
  const corsOrigins = allowedOrigins();

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(null, false);
      },
    }),
  );
  app.use(
    rateLimit({
      legacyHeaders: false,
      limit: 600,
      standardHeaders: "draft-8",
      windowMs: 15 * 60 * 1000,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestMetrics);

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "ecg-insight-api" });
  });
  app.get("/liveness", (_req, res) => {
    res.json({ ok: true, uptimeSeconds: Math.round(process.uptime()) });
  });
  app.get("/readiness", async (_req, res, next) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ database: "ready", ok: true });
    } catch (error) {
      next(error);
    }
  });
  app.get("/metrics", (_req, res) => {
    res.json(metricsSnapshot());
  });

  app.use("/api", modulesRouter);
  app.use(modulesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
