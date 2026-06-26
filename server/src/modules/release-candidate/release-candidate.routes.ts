import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  bugBashSummary,
  performanceBenchmarkSnapshot,
  releaseCandidateDashboard,
} from "./release-candidate.service";

export const releaseCandidateRouter = Router();

releaseCandidateRouter.use(requireAuth, requireRole("ADMIN"));

releaseCandidateRouter.get("/dashboard", async (_req, res, next) => {
  try {
    res.json({ release: await releaseCandidateDashboard() });
  } catch (error) {
    next(error);
  }
});

releaseCandidateRouter.get("/workflows", async (_req, res, next) => {
  try {
    const dashboard = await releaseCandidateDashboard();
    res.json({ checks: dashboard.checks.filter((check) => check.category.startsWith("Workflow")) });
  } catch (error) {
    next(error);
  }
});

releaseCandidateRouter.get("/performance", async (_req, res, next) => {
  try {
    res.json({ performance: performanceBenchmarkSnapshot() });
  } catch (error) {
    next(error);
  }
});

releaseCandidateRouter.get("/bug-bash", async (_req, res, next) => {
  try {
    res.json({ bugBash: await bugBashSummary() });
  } catch (error) {
    next(error);
  }
});
