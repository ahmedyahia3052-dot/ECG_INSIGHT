import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateQuery } from "../../middleware/validate";
import { assertResourceAccess, canAccessCase } from "../../utils/resource-access";
import {
  cancelCaseDigitizationJob,
  enqueueCaseDigitization,
  getCaseDigitizationJob,
  getDigitizationEngineHealth,
  listCaseDigitizationJobs,
  retryCaseDigitizationJob,
} from "./ecg-digitization-engine.service";
import {
  digitizationJobListQuerySchema,
  enqueueDigitizationJobSchema,
  retryDigitizationJobSchema,
} from "./schemas";

export const ecgDigitizationEngineRouter = Router();

ecgDigitizationEngineRouter.get("/health", (_req, res) => {
  res.json(getDigitizationEngineHealth());
});

ecgDigitizationEngineRouter.use(requireAuth);

ecgDigitizationEngineRouter.post("/jobs", validateBody(enqueueDigitizationJobSchema), async (req, res, next) => {
  try {
    assertResourceAccess(await canAccessCase(req.body.caseId, req.auth!));
    const job = await enqueueCaseDigitization({
      caseId: req.body.caseId,
      ecgFileId: req.body.ecgFileId,
      maxAttempts: req.body.maxAttempts,
      processingJobId: req.body.processingJobId,
      requestedById: req.auth!.id,
    });
    res.status(202).json({ job });
  } catch (error) {
    next(error);
  }
});

ecgDigitizationEngineRouter.get("/jobs", validateQuery(digitizationJobListQuerySchema), async (req, res, next) => {
  try {
    const query = digitizationJobListQuerySchema.parse(req.query);
    if (query.caseId) assertResourceAccess(await canAccessCase(query.caseId, req.auth!));
    const jobs = await listCaseDigitizationJobs({
      caseId: query.caseId,
      limit: query.limit,
      status: query.status,
    });
    res.json({ count: jobs.length, jobs });
  } catch (error) {
    next(error);
  }
});

ecgDigitizationEngineRouter.get("/jobs/:jobId", async (req, res, next) => {
  try {
    const job = await getCaseDigitizationJob(String(req.params.jobId));
    assertResourceAccess(await canAccessCase(job.caseId, req.auth!));
    res.json({ job });
  } catch (error) {
    next(error);
  }
});

ecgDigitizationEngineRouter.post("/jobs/:jobId/cancel", async (req, res, next) => {
  try {
    const existing = await getCaseDigitizationJob(String(req.params.jobId));
    assertResourceAccess(await canAccessCase(existing.caseId, req.auth!));
    const job = await cancelCaseDigitizationJob(existing.id);
    res.json({ job });
  } catch (error) {
    next(error);
  }
});

ecgDigitizationEngineRouter.post("/jobs/:jobId/retry", validateBody(retryDigitizationJobSchema), async (req, res, next) => {
  try {
    const existing = await getCaseDigitizationJob(String(req.params.jobId));
    assertResourceAccess(await canAccessCase(existing.caseId, req.auth!));
    const job = await retryCaseDigitizationJob(existing.id, req.body.force);
    res.status(202).json({ job });
  } catch (error) {
    next(error);
  }
});

ecgDigitizationEngineRouter.get("/cases/:caseId/jobs", async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId);
    assertResourceAccess(await canAccessCase(caseId, req.auth!));
    const jobs = await listCaseDigitizationJobs({ caseId, limit: 20 });
    res.json({ caseId, count: jobs.length, jobs });
  } catch (error) {
    next(error);
  }
});
