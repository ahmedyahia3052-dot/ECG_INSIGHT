import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateQuery } from "../../middleware/validate";
import { assertResourceAccess, canAccessCase } from "../../utils/resource-access";
import {
  cancelCaseProcessingJob,
  enqueueCaseProcessing,
  getCaseProcessingJob,
  getProcessingEngineHealth,
  listCaseProcessingJobs,
  retryCaseProcessingJob,
} from "./ecg-processing-engine.service";
import { enqueueProcessingJobSchema, jobListQuerySchema, retryJobSchema } from "./schemas";

export const ecgProcessingEngineRouter = Router();

ecgProcessingEngineRouter.get("/health", (_req, res) => {
  res.json(getProcessingEngineHealth());
});

ecgProcessingEngineRouter.use(requireAuth);

ecgProcessingEngineRouter.post("/jobs", validateBody(enqueueProcessingJobSchema), async (req, res, next) => {
  try {
    assertResourceAccess(await canAccessCase(req.body.caseId, req.auth!));
    const job = await enqueueCaseProcessing({
      caseId: req.body.caseId,
      ecgFileId: req.body.ecgFileId,
      maxAttempts: req.body.maxAttempts,
      requestedById: req.auth!.id,
    });
    res.status(202).json({ job });
  } catch (error) {
    next(error);
  }
});

ecgProcessingEngineRouter.get("/jobs", validateQuery(jobListQuerySchema), async (req, res, next) => {
  try {
    const query = jobListQuerySchema.parse(req.query);
    if (query.caseId) assertResourceAccess(await canAccessCase(query.caseId, req.auth!));
    const jobs = await listCaseProcessingJobs({
      caseId: query.caseId,
      limit: query.limit,
      status: query.status,
    });
    res.json({ count: jobs.length, jobs });
  } catch (error) {
    next(error);
  }
});

ecgProcessingEngineRouter.get("/jobs/:jobId", async (req, res, next) => {
  try {
    const job = await getCaseProcessingJob(String(req.params.jobId));
    assertResourceAccess(await canAccessCase(job.caseId, req.auth!));
    res.json({ job });
  } catch (error) {
    next(error);
  }
});

ecgProcessingEngineRouter.post("/jobs/:jobId/cancel", async (req, res, next) => {
  try {
    const existing = await getCaseProcessingJob(String(req.params.jobId));
    assertResourceAccess(await canAccessCase(existing.caseId, req.auth!));
    const job = await cancelCaseProcessingJob(existing.id);
    res.json({ job });
  } catch (error) {
    next(error);
  }
});

ecgProcessingEngineRouter.post("/jobs/:jobId/retry", validateBody(retryJobSchema), async (req, res, next) => {
  try {
    const existing = await getCaseProcessingJob(String(req.params.jobId));
    assertResourceAccess(await canAccessCase(existing.caseId, req.auth!));
    const job = await retryCaseProcessingJob(existing.id, req.body.force);
    res.status(202).json({ job });
  } catch (error) {
    next(error);
  }
});

ecgProcessingEngineRouter.get("/cases/:caseId/jobs", async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId);
    assertResourceAccess(await canAccessCase(caseId, req.auth!));
    const jobs = await listCaseProcessingJobs({ caseId, limit: 20 });
    res.json({ caseId, count: jobs.length, jobs });
  } catch (error) {
    next(error);
  }
});
