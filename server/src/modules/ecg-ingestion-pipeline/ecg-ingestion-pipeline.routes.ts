import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateQuery } from "../../middleware/validate";
import { assertResourceAccess, canAccessCase } from "../../utils/resource-access";
import {
  cancelCaseIngestionJob,
  enqueueIngestion,
  getCaseIngestionJob,
  getIngestionPipelineHealthDetailed,
  getIngestionPipelineMetrics,
  listCaseIngestionEvents,
  listCaseIngestionJobs,
  resumeCaseIngestionJob,
  retryCaseIngestionJob,
} from "./ecg-ingestion-pipeline.service";
import {
  enqueueIngestionJobSchema,
  ingestionJobListQuerySchema,
  resumeIngestionJobSchema,
  retryIngestionJobSchema,
} from "./schemas";

export const ecgIngestionPipelineRouter = Router();

ecgIngestionPipelineRouter.get("/health", async (_req, res, next) => {
  try {
    res.json(await getIngestionPipelineHealthDetailed());
  } catch (error) {
    next(error);
  }
});

ecgIngestionPipelineRouter.get("/metrics", requireAuth, async (_req, res, next) => {
  try {
    res.json({ metrics: await getIngestionPipelineMetrics() });
  } catch (error) {
    next(error);
  }
});

ecgIngestionPipelineRouter.use(requireAuth);

ecgIngestionPipelineRouter.post("/jobs", validateBody(enqueueIngestionJobSchema), async (req, res, next) => {
  try {
    assertResourceAccess(await canAccessCase(req.body.caseId, req.auth!));
    const job = await enqueueIngestion({
      caseId: req.body.caseId,
      ecgFileId: req.body.ecgFileId,
      maxAttempts: req.body.maxAttempts,
      priority: req.body.priority,
      requestedById: req.auth!.id,
      timeoutMs: req.body.timeoutMs,
    });
    res.status(202).json({ job });
  } catch (error) {
    next(error);
  }
});

ecgIngestionPipelineRouter.get("/jobs", validateQuery(ingestionJobListQuerySchema), async (req, res, next) => {
  try {
    const query = ingestionJobListQuerySchema.parse(req.query);
    if (query.caseId) assertResourceAccess(await canAccessCase(query.caseId, req.auth!));
    const jobs = await listCaseIngestionJobs({
      caseId: query.caseId,
      limit: query.limit,
      status: query.status,
    });
    res.json({ count: jobs.length, jobs });
  } catch (error) {
    next(error);
  }
});

ecgIngestionPipelineRouter.get("/jobs/:jobId", async (req, res, next) => {
  try {
    const job = await getCaseIngestionJob(String(req.params.jobId));
    assertResourceAccess(await canAccessCase(job.caseId, req.auth!));
    res.json({ job });
  } catch (error) {
    next(error);
  }
});

ecgIngestionPipelineRouter.get("/jobs/:jobId/events", async (req, res, next) => {
  try {
    const job = await getCaseIngestionJob(String(req.params.jobId));
    assertResourceAccess(await canAccessCase(job.caseId, req.auth!));
    const events = await listCaseIngestionEvents(job.id);
    res.json({ count: events.length, events, jobId: job.id });
  } catch (error) {
    next(error);
  }
});

ecgIngestionPipelineRouter.post("/jobs/:jobId/cancel", async (req, res, next) => {
  try {
    const existing = await getCaseIngestionJob(String(req.params.jobId));
    assertResourceAccess(await canAccessCase(existing.caseId, req.auth!));
    const job = await cancelCaseIngestionJob(existing.id);
    res.json({ job });
  } catch (error) {
    next(error);
  }
});

ecgIngestionPipelineRouter.post("/jobs/:jobId/resume", validateBody(resumeIngestionJobSchema), async (req, res, next) => {
  try {
    const existing = await getCaseIngestionJob(String(req.params.jobId));
    assertResourceAccess(await canAccessCase(existing.caseId, req.auth!));
    const job = await resumeCaseIngestionJob(existing.id, req.body.resumeFromStage);
    res.status(202).json({ job });
  } catch (error) {
    next(error);
  }
});

ecgIngestionPipelineRouter.post("/jobs/:jobId/retry", validateBody(retryIngestionJobSchema), async (req, res, next) => {
  try {
    const existing = await getCaseIngestionJob(String(req.params.jobId));
    assertResourceAccess(await canAccessCase(existing.caseId, req.auth!));
    const job = await retryCaseIngestionJob(existing.id, req.body.force);
    res.status(202).json({ job });
  } catch (error) {
    next(error);
  }
});

ecgIngestionPipelineRouter.get("/cases/:caseId/jobs", async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId);
    assertResourceAccess(await canAccessCase(caseId, req.auth!));
    const jobs = await listCaseIngestionJobs({ caseId, limit: 20 });
    res.json({ caseId, count: jobs.length, jobs });
  } catch (error) {
    next(error);
  }
});
