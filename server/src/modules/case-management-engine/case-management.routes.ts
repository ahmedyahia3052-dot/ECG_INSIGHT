import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { validateBody, validateQuery } from "../../middleware/validate";
import { assertResourceAccess, canAccessCase } from "../../utils/resource-access";
import { fromApiCaseStatus } from "../../utils/clinical";
import {
  addCaseAttachment,
  addCaseComment,
  acquireCaseLock,
  archiveManagedCase,
  assignReviewer,
  createCaseVersion,
  findCaseForManagement,
  listCaseAttachments,
  listCaseAudit,
  listCaseComments,
  listCaseHistory,
  listCaseVersions,
  releaseCaseLock,
  restoreManagedCase,
  runDuplicateDetection,
  updateCaseTags,
  updateManagedCase,
} from "./case-management.service";
import {
  archiveCaseSchema,
  assignReviewerSchema,
  caseAttachmentSchema,
  caseCommentSchema,
  caseHistoryQuerySchema,
  caseLockSchema,
  caseManagementUpdateSchema,
  caseTagsSchema,
  caseVersionSchema,
  restoreCaseSchema,
} from "./schemas";

export const caseManagementEngineRouter = Router();

caseManagementEngineRouter.use(requireAuth);

async function assertCaseAccess(caseRef: string, auth: Parameters<typeof canAccessCase>[1]) {
  const ecgCase = await findCaseForManagement(caseRef);
  if (!ecgCase) {
    throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  }
  assertResourceAccess(await canAccessCase(ecgCase.id, auth));
  return ecgCase;
}

caseManagementEngineRouter.put("/:caseId", requireRole("DOCTOR"), validateBody(caseManagementUpdateSchema), async (req, res, next) => {
  try {
    await assertCaseAccess(String(req.params.caseId), req.auth!);
    const updated = await updateManagedCase(String(req.params.caseId), req.auth!.id, req.body);
    res.json({ case: updated });
  } catch (error) {
    next(error);
  }
});

caseManagementEngineRouter.get("/:caseId/management-history", validateQuery(caseHistoryQuerySchema), async (req, res, next) => {
  try {
    const ecgCase = await assertCaseAccess(String(req.params.caseId), req.auth!);
    const query = caseHistoryQuerySchema.parse(req.query);
    const result = await listCaseHistory(ecgCase.id, query.limit, query.offset);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

caseManagementEngineRouter.post("/:caseId/archive", requireRole("DOCTOR"), validateBody(archiveCaseSchema), async (req, res, next) => {
  try {
    await assertCaseAccess(String(req.params.caseId), req.auth!);
    const archived = await archiveManagedCase(String(req.params.caseId), req.auth!.id, req.body.reason);
    res.json({ case: archived });
  } catch (error) {
    next(error);
  }
});

caseManagementEngineRouter.post("/:caseId/restore", requireRole("DOCTOR"), validateBody(restoreCaseSchema), async (req, res, next) => {
  try {
    await assertCaseAccess(String(req.params.caseId), req.auth!);
    const restored = await restoreManagedCase(String(req.params.caseId), req.auth!.id, {
      managementStatus: req.body.managementStatus,
      reason: req.body.reason,
      status: req.body.status ? fromApiCaseStatus(req.body.status) : undefined,
    });
    res.json({ case: restored });
  } catch (error) {
    next(error);
  }
});

caseManagementEngineRouter.get("/:caseId/audit", validateQuery(caseHistoryQuerySchema), async (req, res, next) => {
  try {
    const ecgCase = await assertCaseAccess(String(req.params.caseId), req.auth!);
    const query = caseHistoryQuerySchema.parse(req.query);
    const result = await listCaseAudit(ecgCase.id, query.limit, query.offset);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

caseManagementEngineRouter.get("/:caseId/versions", async (req, res, next) => {
  try {
    const ecgCase = await assertCaseAccess(String(req.params.caseId), req.auth!);
    res.json({ versions: await listCaseVersions(ecgCase.id) });
  } catch (error) {
    next(error);
  }
});

caseManagementEngineRouter.post("/:caseId/versions", requireRole("DOCTOR"), validateBody(caseVersionSchema), async (req, res, next) => {
  try {
    const ecgCase = await assertCaseAccess(String(req.params.caseId), req.auth!);
    const version = await createCaseVersion(ecgCase.id, req.auth!.id, req.body.reason);
    res.status(201).json({ version });
  } catch (error) {
    next(error);
  }
});

caseManagementEngineRouter.get("/:caseId/comments", async (req, res, next) => {
  try {
    const ecgCase = await assertCaseAccess(String(req.params.caseId), req.auth!);
    res.json({ comments: await listCaseComments(ecgCase.id) });
  } catch (error) {
    next(error);
  }
});

caseManagementEngineRouter.post("/:caseId/comments", requireRole("DOCTOR"), validateBody(caseCommentSchema), async (req, res, next) => {
  try {
    const ecgCase = await assertCaseAccess(String(req.params.caseId), req.auth!);
    const comment = await addCaseComment({
      actorId: req.auth!.id,
      body: req.body.body,
      caseId: ecgCase.id,
      isClinical: req.body.isClinical,
      mentions: req.body.mentions,
      parentId: req.body.parentId,
    });
    res.status(201).json({ comment });
  } catch (error) {
    next(error);
  }
});

caseManagementEngineRouter.get("/:caseId/attachments", async (req, res, next) => {
  try {
    const ecgCase = await assertCaseAccess(String(req.params.caseId), req.auth!);
    res.json({ attachments: await listCaseAttachments(ecgCase.id) });
  } catch (error) {
    next(error);
  }
});

caseManagementEngineRouter.post("/:caseId/attachments", requireRole("DOCTOR"), validateBody(caseAttachmentSchema), async (req, res, next) => {
  try {
    const ecgCase = await assertCaseAccess(String(req.params.caseId), req.auth!);
    const attachment = await addCaseAttachment({
      actorId: req.auth!.id,
      caseId: ecgCase.id,
      category: req.body.category,
      checksum: req.body.checksum,
      fileName: req.body.fileName,
      metadata: req.body.metadata,
      mimeType: req.body.mimeType,
      sizeBytes: req.body.sizeBytes,
      storagePath: req.body.storagePath,
    });
    res.status(201).json({ attachment });
  } catch (error) {
    next(error);
  }
});

caseManagementEngineRouter.post("/:caseId/assign-reviewer", requireRole("DOCTOR"), validateBody(assignReviewerSchema), async (req, res, next) => {
  try {
    await assertCaseAccess(String(req.params.caseId), req.auth!);
    const updated = await assignReviewer((await findCaseForManagement(String(req.params.caseId)))!.id, req.auth!.id, req.body.reviewerId);
    res.json({ case: updated });
  } catch (error) {
    next(error);
  }
});

caseManagementEngineRouter.post("/:caseId/lock", requireRole("DOCTOR"), validateBody(caseLockSchema), async (req, res, next) => {
  try {
    const ecgCase = await assertCaseAccess(String(req.params.caseId), req.auth!);
    const lock = await acquireCaseLock(ecgCase.id, req.auth!.id, req.body.resource, req.body.ttlMinutes);
    res.status(201).json({ lock });
  } catch (error) {
    next(error);
  }
});

caseManagementEngineRouter.post("/:caseId/unlock", requireRole("DOCTOR"), validateBody(caseLockSchema), async (req, res, next) => {
  try {
    const ecgCase = await assertCaseAccess(String(req.params.caseId), req.auth!);
    const lock = await releaseCaseLock(ecgCase.id, req.auth!.id, req.body.resource);
    res.json({ lock });
  } catch (error) {
    next(error);
  }
});

caseManagementEngineRouter.put("/:caseId/tags", requireRole("DOCTOR"), validateBody(caseTagsSchema), async (req, res, next) => {
  try {
    const ecgCase = await assertCaseAccess(String(req.params.caseId), req.auth!);
    const updated = await updateCaseTags(ecgCase.id, req.auth!.id, req.body.tags);
    res.json({ case: updated });
  } catch (error) {
    next(error);
  }
});

caseManagementEngineRouter.get("/:caseId/duplicates", async (req, res, next) => {
  try {
    await assertCaseAccess(String(req.params.caseId), req.auth!);
    const duplicates = await runDuplicateDetection(String(req.params.caseId));
    res.json({ duplicates });
  } catch (error) {
    next(error);
  }
});
