import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import passport from "passport";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { configureOAuthPassport } from "./auth/oauth-passport";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { apiSecurityMiddleware } from "./middleware/api-security";
import { inputSanitizer } from "./middleware/input-sanitizer";
import { metricsSnapshot, requestMetrics } from "./middleware/observability";
import { requestContext } from "./middleware/request-context";
import { modulesRouter } from "./modules";
import { registeredCopilotRoutes } from "./modules/copilot/copilot.routes";
import { productionReadinessSnapshot } from "./modules/health/health.service";
import { log } from "./utils/logger";

const developmentOrigins = ["http://localhost:8082", "http://localhost:8081", "http://localhost:5173", "http://localhost:3000"];

function isDevelopmentLocalhostOrigin(origin: string) {
  if (env.NODE_ENV !== "development") return false;
  try {
    const url = new URL(origin);
    return (url.hostname === "localhost" || url.hostname === "127.0.0.1") && ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

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
  configureOAuthPassport();

  app.disable("x-powered-by");
  if (env.TRUST_PROXY) app.set("trust proxy", 1);
  app.use(requestContext);
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false,
      crossOriginEmbedderPolicy: false,
      hsts: env.NODE_ENV === "production" ? { includeSubDomains: true, maxAge: 31_536_000, preload: true } : false,
    }),
  );
  app.use(
    cors({
      allowedHeaders: ["Authorization", "Content-Type", "X-CSRF-Token"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      origin(origin, callback) {
        if (!origin || corsOrigins.includes(origin) || isDevelopmentLocalhostOrigin(origin)) {
          callback(null, true);
          return;
        }

        log("warn", "CORS origin rejected.", { origin });
        callback(null, false);
      },
    }),
  );
  app.use(
    rateLimit({
      legacyHeaders: false,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: "draft-8",
      windowMs: env.RATE_LIMIT_WINDOW_MS,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(passport.initialize());
  app.use(inputSanitizer);
  app.use(apiSecurityMiddleware);
  app.use(requestMetrics);

  app.get("/health", async (req, res, next) => {
    try {
      const snapshot = await productionReadinessSnapshot();
      res.status(snapshot.ok ? 200 : 503).json({
        ...snapshot,
        requestId: req.requestId,
        service: "api-gateway",
        status: snapshot.ok ? "ok" : snapshot.status,
        uptimeSeconds: Math.round(process.uptime()),
      });
    } catch (error) {
      next(error);
    }
  });
  app.get("/liveness", (req, res) => {
    res.json({ ok: true, requestId: req.requestId, uptimeSeconds: Math.round(process.uptime()) });
  });
  app.get("/readiness", async (req, res, next) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        checks: {
          database: "ready",
          environment: "ready",
        },
        ok: true,
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  });
  app.get("/metrics", (_req, res) => {
    res.json(metricsSnapshot());
  });

  app.use("/api", modulesRouter);
  app.use("/api/v1", modulesRouter);
  log("info", "Registered AI Copilot routes.", { routes: registeredCopilotRoutes });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
