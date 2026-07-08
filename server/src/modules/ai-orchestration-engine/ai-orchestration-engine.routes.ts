import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateQuery } from "../../middleware/validate";
import { assertResourceAccess, canAccessCase } from "../../utils/resource-access";
import {
  cancelCaseOrchestrationJob,
  enqueueCaseOrchestration,
  getCaseOrchestrationJob,
  getOrchestrationEngineHealth,
  listCaseOrchestrationJobs,
  retryCaseOrchestrationJob,
} from "./ai-orchestration-engine.service";
import {
  enqueueOrchestrationJobSchema,
  orchestrationJobListQuerySchema,
  retryOrchestrationJobSchema,
} from "./schemas";

export const aiOrchestrationEngineRouter = Router();

aiOrchestrationEngineRouter.get("/health", (_req, res) => {
  res.json(getOrchestrationEngineHealth());
});

aiOrchestrationEngineRouter.use(requireAuth);

aiOrchestrationEngineRouter.post("/jobs", validateBody(enqueueOrchestrationJobSchema), async (req, res, next) => {
  try {
    assertResourceAccess(await canAccessCase(req.body.caseId, req.auth!));
    const job = await enqueueCaseOrchestration({
      analysisId: req.body.analysisId,
      caseId: req.body.caseId,
      maxAttempts: req.body.maxAttempts,
      pipelineKind: req.body.pipelineKind,
      providerPreference: req.body.providerPreference,
      requestedById: req.auth!.id,
      timeoutMs: req.body.timeoutMs,
    });
    res.status(202).json({ job });
  } catch (error) {
    next(error);
  }
});

aiOrchestrationEngineRouter.get("/jobs", validateQuery(orchestrationJobListQuerySchema), async (req, res, next) => {
  try {
    const query = orchestrationJobListQuerySchema.parse(req.query);
    if (query.caseId) assertResourceAccess(await canAccessCase(query.caseId, req.auth!));
    const jobs = await listCaseOrchestrationJobs({
      caseId: query.caseId,
      limit: query.limit,
      status: query.status,
    });
    res.json({ count: jobs.length, jobs });
  } catch (error) {
    next(error);
  }
});

aiOrchestrationEngineRouter.get("/jobs/:jobId", async (req, res, next) => {
  try {
    const job = await getCaseOrchestrationJob(String(req.params.jobId));
    assertResourceAccess(await canAccessCase(job.caseId, req.auth!));
    res.json({ job });
  } catch (error) {
    next(error);
  }
});

aiOrchestrationEngineRouter.get("/jobs/:jobId/logs", async (req, res, next) => {
  try {
    const job = await getCaseOrchestrationJob(String(req.params.jobId));
    assertResourceAccess(await canAccessCase(job.caseId, req.auth!));
    res.json({
      jobId: job.id,
      processingLogs: job.processingLogs,
      stageLog: job.stageLog,
    });
  } catch (error) {
    next(error);
  }
});

aiOrchestrationEngineRouter.post("/jobs/:jobId/cancel", async (req, res, next) => {
  try {
    const existing = await getCaseOrchestrationJob(String(req.params.jobId));
    assertResourceAccess(await canAccessCase(existing.caseId, req.auth!));
    const job = await cancelCaseOrchestrationJob(existing.id);
    res.json({ job });
  } catch (error) {
    next(error);
  }
});

aiOrchestrationEngineRouter.post("/jobs/:jobId/retry", validateBody(retryOrchestrationJobSchema), async (req, res, next) => {
  try {
    const existing = await getCaseOrchestrationJob(String(req.params.jobId));
    assertResourceAccess(await canAccessCase(existing.caseId, req.auth!));
    const job = await retryCaseOrchestrationJob(existing.id, req.body.force);
    res.status(202).json({ job });
  } catch (error) {
    next(error);
  }
});

aiOrchestrationEngineRouter.get("/cases/:caseId/jobs", async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId);
    assertResourceAccess(await canAccessCase(caseId, req.auth!));
    const jobs = await listCaseOrchestrationJobs({ caseId, limit: 20 });
    res.json({ caseId, count: jobs.length, jobs });
  } catch (error) {
    next(error);
  }
});
