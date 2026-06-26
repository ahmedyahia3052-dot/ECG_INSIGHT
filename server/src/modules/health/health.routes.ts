import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  aiHealth,
  auditPipelineHealth,
  databaseHealth,
  productionReadinessSnapshot,
  queueHealth,
  storageHealth,
} from "./health.service";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res, next) => {
  try {
    const result = await productionReadinessSnapshot();
    res.json({ ...result, status: result.ok ? "ok" : result.status, service: "api-gateway" });
  } catch (error) {
    next(error);
  }
});

healthRouter.get("/frontend", async (_req, res) => {
  res.json({ service: "frontend", status: "ok", timestamp: new Date().toISOString() });
});

healthRouter.get("/auth", async (_req, res, next) => {
  try {
    const result = await databaseHealth();
    res.status(result.ok ? 200 : 503).json({
      details: result.details,
      durationMs: result.durationMs,
      service: "authentication",
      status: result.ok ? "ok" : "offline",
    });
  } catch (error) {
    next(error);
  }
});

healthRouter.get("/db", async (_req, res, next) => {
  try {
    const result = await databaseHealth();
    res.status(result.ok ? 200 : 503).json({ component: "database", service: "database", status: result.ok ? "ok" : "offline", ...result });
  } catch (error) {
    next(error);
  }
});

healthRouter.get("/database", async (_req, res, next) => {
  try {
    const result = await databaseHealth();
    res.status(result.ok ? 200 : 503).json({ component: "database", service: "database", status: result.ok ? "ok" : "offline", ...result });
  } catch (error) {
    next(error);
  }
});

healthRouter.get("/ai", async (_req, res, next) => {
  try {
    const result = await aiHealth();
    const degraded = result.ok && result.details && typeof result.details === "object" && "engineUrlConfigured" in result.details && result.details.engineUrlConfigured === false;
    res.status(result.ok ? 200 : 503).json({ component: "ai", service: "ai", status: result.ok ? (degraded ? "degraded" : "ok") : "offline", ...result });
  } catch (error) {
    next(error);
  }
});

healthRouter.get("/storage", async (_req, res, next) => {
  try {
    const result = await storageHealth();
    res.status(result.ok ? 200 : 503).json({ component: "storage", ...result });
  } catch (error) {
    next(error);
  }
});

healthRouter.get("/queue", async (_req, res, next) => {
  try {
    const result = await queueHealth();
    res.status(result.ok ? 200 : 503).json({ component: "queue", ...result });
  } catch (error) {
    next(error);
  }
});

healthRouter.get("/audit-pipeline", requireAuth, requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const result = await auditPipelineHealth();
    res.status(result.ok ? 200 : 503).json({ component: "auditPipeline", ...result });
  } catch (error) {
    next(error);
  }
});

healthRouter.get("/readiness-dashboard", requireAuth, requireRole("ADMIN"), async (_req, res, next) => {
  try {
    res.json({ readiness: await productionReadinessSnapshot() });
  } catch (error) {
    next(error);
  }
});
