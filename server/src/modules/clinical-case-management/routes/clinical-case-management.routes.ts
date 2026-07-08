import { Router } from "express";
import { requireAuth, requireRole } from "../../../middleware/auth";
import { AppError } from "../../../middleware/error";
import { validateBody, validateQuery } from "../../../middleware/validate";
import { assertResourceAccess, canAccessCase } from "../../../utils/resource-access";
import { caseRepository } from "../repository/case.repository";
import {
  archiveCaseSchema,
  assignReviewerSchema,
  caseAttachmentSchema,
  caseLockSchema,
  caseVersionSchema,
  clinicalNoteSchema,
  criticalFlagSchema,
  labelsUpdateSchema,
  lifecycleTransitionSchema,
  paginationQuerySchema,
  priorityUpdateSchema,
  reassignCaseSchema,
  restoreCaseSchema,
} from "../dto/schemas";
import { lifecycleService } from "../service/lifecycle.service";
import { timelineService } from "../service/timeline.service";
import { notesService } from "../service/notes.service";
import { assignmentService } from "../service/assignment.service";
import { lockingService } from "../service/locking.service";
import { versionService } from "../service/version.service";
import { clinicalCaseManagementService } from "../service/clinical-case-management.service";
import { serializeCaseLock } from "../domain/types";

export const clinicalCaseManagementRouter = Router();

clinicalCaseManagementRouter.use(requireAuth);

async function assertCaseAccess(caseRef: string, auth: Parameters<typeof canAccessCase>[1]) {
  const ecgCase = await caseRepository.findByRef(caseRef);
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  assertResourceAccess(await canAccessCase(ecgCase.id, auth));
  return ecgCase;
}

clinicalCaseManagementRouter.get("/cases/:caseId", async (req, res, next) => {
  try {
    await assertCaseAccess(String(req.params.caseId), req.auth!);
    res.json({ case: await lifecycleService.getCase(String(req.params.caseId)) });
  } catch (error) {
    next(error);
  }
});

clinicalCaseManagementRouter.post(
  "/cases/:caseId/lifecycle",
  requireRole("DOCTOR"),
  validateBody(lifecycleTransitionSchema),
  async (req, res, next) => {
    try {
      await assertCaseAccess(String(req.params.caseId), req.auth!);
      const updated = await lifecycleService.transition(
        String(req.params.caseId),
        req.auth!.id,
        req.body.lifecycle,
        req.body.reason,
      );
      res.json({ case: updated });
    } catch (error) {
      next(error);
    }
  },
);

clinicalCaseManagementRouter.post(
  "/cases/:caseId/archive",
  requireRole("DOCTOR"),
  validateBody(archiveCaseSchema),
  async (req, res, next) => {
    try {
      await assertCaseAccess(String(req.params.caseId), req.auth!);
      res.json({ case: await lifecycleService.archive(String(req.params.caseId), req.auth!.id, req.body.reason) });
    } catch (error) {
      next(error);
    }
  },
);

clinicalCaseManagementRouter.post(
  "/cases/:caseId/restore",
  requireRole("DOCTOR"),
  validateBody(restoreCaseSchema),
  async (req, res, next) => {
    try {
      await assertCaseAccess(String(req.params.caseId), req.auth!);
      res.json({
        case: await lifecycleService.restore(
          String(req.params.caseId),
          req.auth!.id,
          req.body.lifecycle ?? "draft",
          req.body.reason,
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);

clinicalCaseManagementRouter.get(
  "/cases/:caseId/timeline",
  validateQuery(paginationQuerySchema),
  async (req, res, next) => {
    try {
      const ecgCase = await assertCaseAccess(String(req.params.caseId), req.auth!);
      const query = paginationQuerySchema.parse(req.query);
      res.json(await timelineService.getUnifiedTimeline(ecgCase.id, query.limit, query.offset));
    } catch (error) {
      next(error);
    }
  },
);

clinicalCaseManagementRouter.get(
  "/cases/:caseId/events",
  validateQuery(paginationQuerySchema),
  async (req, res, next) => {
    try {
      const ecgCase = await assertCaseAccess(String(req.params.caseId), req.auth!);
      const query = paginationQuerySchema.parse(req.query);
      res.json(await timelineService.getCaseEvents(ecgCase.id, query.limit, query.offset));
    } catch (error) {
      next(error);
    }
  },
);

clinicalCaseManagementRouter.get(
  "/cases/:caseId/audit",
  validateQuery(paginationQuerySchema),
  async (req, res, next) => {
    try {
      const ecgCase = await assertCaseAccess(String(req.params.caseId), req.auth!);
      const query = paginationQuerySchema.parse(req.query);
      res.json(await timelineService.getAuditHistory(ecgCase.id, query.limit, query.offset));
    } catch (error) {
      next(error);
    }
  },
);

clinicalCaseManagementRouter.get(
  "/cases/:caseId/status-history",
  validateQuery(paginationQuerySchema),
  async (req, res, next) => {
    try {
      const ecgCase = await assertCaseAccess(String(req.params.caseId), req.auth!);
      const query = paginationQuerySchema.parse(req.query);
      res.json(await timelineService.getStatusHistory(ecgCase.id, query.limit, query.offset));
    } catch (error) {
      next(error);
    }
  },
);

clinicalCaseManagementRouter.get("/cases/:caseId/notes", async (req, res, next) => {
  try {
    const ecgCase = await assertCaseAccess(String(req.params.caseId), req.auth!);
    const filter = req.query.type as "clinical" | "doctor" | "internal" | undefined;
    res.json({ notes: await notesService.listNotes(ecgCase.id, filter) });
  } catch (error) {
    next(error);
  }
});

clinicalCaseManagementRouter.post(
  "/cases/:caseId/notes",
  requireRole("DOCTOR"),
  validateBody(clinicalNoteSchema),
  async (req, res, next) => {
    try {
      const ecgCase = await assertCaseAccess(String(req.params.caseId), req.auth!);
      const note = await notesService.addNote({
        actorId: req.auth!.id,
        body: req.body.body,
        caseId: ecgCase.id,
        mentions: req.body.mentions,
        noteType: req.body.noteType,
        parentId: req.body.parentId,
      });
      res.status(201).json({ note });
    } catch (error) {
      next(error);
    }
  },
);

clinicalCaseManagementRouter.post(
  "/cases/:caseId/reviewer",
  requireRole("DOCTOR"),
  validateBody(assignReviewerSchema),
  async (req, res, next) => {
    try {
      await assertCaseAccess(String(req.params.caseId), req.auth!);
      res.json({
        case: await assignmentService.assignReviewer(String(req.params.caseId), req.auth!.id, req.body.reviewerId),
      });
    } catch (error) {
      next(error);
    }
  },
);

clinicalCaseManagementRouter.post(
  "/cases/:caseId/reassign",
  requireRole("DOCTOR"),
  validateBody(reassignCaseSchema),
  async (req, res, next) => {
    try {
      await assertCaseAccess(String(req.params.caseId), req.auth!);
      res.json({
        case: await assignmentService.reassignCase(
          String(req.params.caseId),
          req.auth!.id,
          req.body.reviewerId,
          req.body.reason,
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);

clinicalCaseManagementRouter.patch(
  "/cases/:caseId/priority",
  requireRole("DOCTOR"),
  validateBody(priorityUpdateSchema),
  async (req, res, next) => {
    try {
      await assertCaseAccess(String(req.params.caseId), req.auth!);
      res.json({
        case: await assignmentService.updatePriority(
          String(req.params.caseId),
          req.auth!.id,
          req.body.priority,
          req.body.reason,
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);

clinicalCaseManagementRouter.patch(
  "/cases/:caseId/critical",
  requireRole("DOCTOR"),
  validateBody(criticalFlagSchema),
  async (req, res, next) => {
    try {
      await assertCaseAccess(String(req.params.caseId), req.auth!);
      res.json({
        case: await assignmentService.updateCriticalFlag(
          String(req.params.caseId),
          req.auth!.id,
          req.body.critical,
          req.body.reason,
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);

clinicalCaseManagementRouter.patch(
  "/cases/:caseId/labels",
  requireRole("DOCTOR"),
  validateBody(labelsUpdateSchema),
  async (req, res, next) => {
    try {
      await assertCaseAccess(String(req.params.caseId), req.auth!);
      res.json({
        case: await assignmentService.updateLabels(String(req.params.caseId), req.auth!.id, req.body.labels),
      });
    } catch (error) {
      next(error);
    }
  },
);

clinicalCaseManagementRouter.get("/cases/:caseId/attachments", async (req, res, next) => {
  try {
    await assertCaseAccess(String(req.params.caseId), req.auth!);
    res.json({ attachments: await clinicalCaseManagementService.listAttachments(String(req.params.caseId)) });
  } catch (error) {
    next(error);
  }
});

clinicalCaseManagementRouter.post(
  "/cases/:caseId/attachments",
  requireRole("DOCTOR"),
  validateBody(caseAttachmentSchema),
  async (req, res, next) => {
    try {
      await assertCaseAccess(String(req.params.caseId), req.auth!);
      const attachment = await clinicalCaseManagementService.addAttachment({
        actorId: req.auth!.id,
        caseRef: String(req.params.caseId),
        ...req.body,
      });
      res.status(201).json({ attachment });
    } catch (error) {
      next(error);
    }
  },
);

clinicalCaseManagementRouter.post(
  "/cases/:caseId/lock",
  requireRole("DOCTOR"),
  validateBody(caseLockSchema),
  async (req, res, next) => {
    try {
      await assertCaseAccess(String(req.params.caseId), req.auth!);
      const lock = await lockingService.acquire(
        String(req.params.caseId),
        req.auth!.id,
        req.body.resource,
        req.body.ttlMinutes,
      );
      res.json({ lock });
    } catch (error) {
      next(error);
    }
  },
);

clinicalCaseManagementRouter.post(
  "/cases/:caseId/unlock",
  requireRole("DOCTOR"),
  validateBody(caseLockSchema.pick({ resource: true })),
  async (req, res, next) => {
    try {
      await assertCaseAccess(String(req.params.caseId), req.auth!);
      const lock = await lockingService.release(String(req.params.caseId), req.auth!.id, req.body.resource);
      res.json({ lock });
    } catch (error) {
      next(error);
    }
  },
);

clinicalCaseManagementRouter.get("/cases/:caseId/lock", async (req, res, next) => {
  try {
    await assertCaseAccess(String(req.params.caseId), req.auth!);
    const lock = await lockingService.getActiveLock(String(req.params.caseId), String(req.query.resource ?? "case"));
    res.json({ lock: lock ? serializeCaseLock(lock) : null });
  } catch (error) {
    next(error);
  }
});

clinicalCaseManagementRouter.get("/cases/:caseId/versions", async (req, res, next) => {
  try {
    await assertCaseAccess(String(req.params.caseId), req.auth!);
    res.json({ versions: await versionService.list(String(req.params.caseId)) });
  } catch (error) {
    next(error);
  }
});

clinicalCaseManagementRouter.post(
  "/cases/:caseId/versions",
  requireRole("DOCTOR"),
  validateBody(caseVersionSchema),
  async (req, res, next) => {
    try {
      await assertCaseAccess(String(req.params.caseId), req.auth!);
      res.status(201).json({ version: await versionService.create(String(req.params.caseId), req.auth!.id, req.body.reason) });
    } catch (error) {
      next(error);
    }
  },
);

clinicalCaseManagementRouter.post(
  "/cases/:caseId/versions/:versionId/restore",
  requireRole("DOCTOR"),
  validateBody(caseVersionSchema),
  async (req, res, next) => {
    try {
      await assertCaseAccess(String(req.params.caseId), req.auth!);
      res.json(
        await versionService.restore(
          String(req.params.caseId),
          req.auth!.id,
          String(req.params.versionId),
          req.body.reason,
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);
