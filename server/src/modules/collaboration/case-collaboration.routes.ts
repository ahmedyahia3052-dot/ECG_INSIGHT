import type { ECGCaseStatus, Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { emitRealtime } from "../../realtime/realtime.service";
import { createNotification } from "../../utils/notifications";
import { assertResourceAccess, canAccessCase } from "../../utils/resource-access";

export const caseCollaborationRouter = Router();

caseCollaborationRouter.use(requireAuth);

const assignmentTypeSchema = z.enum(["PRIMARY_REVIEW", "REASSIGNMENT", "ESCALATION", "MULTI_REVIEW", "SECOND_OPINION"]);
const caseWorkflowStatusSchema = z.enum([
  "NEW",
  "PENDING",
  "UPLOADED",
  "PROCESSING",
  "AI_COMPLETED",
  "UNDER_REVIEW",
  "AWAITING_SECOND_OPINION",
  "ESCALATED",
  "REVIEWED",
  "APPROVED",
  "REJECTED",
  "FINALIZED",
  "SIGNED",
  "ARCHIVED",
]);

const caseSnapshotSelect = {
  aiDiagnosis: true,
  assignedDoctorId: true,
  clinicalComments: true,
  clinicalNotes: true,
  doctorDiagnosis: true,
  finalDiagnosis: true,
  priority: true,
  recommendations: true,
  reviewedById: true,
  severity: true,
  status: true,
} satisfies Prisma.ECGCaseSelect;

async function loadCase(caseId: string, auth: Express.AuthUser) {
  const ecgCase = await prisma.eCGCase.findFirst({
    select: { caseId: true, caseNumber: true, id: true, patientId: true, status: true, uploadedById: true },
    where: { OR: [{ id: caseId }, { caseId }, { caseNumber: caseId }] },
  });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  assertResourceAccess(await canAccessCase(ecgCase.id, auth));
  return ecgCase;
}

async function createActivity(input: {
  actorId?: string;
  caseId: string;
  message?: string;
  metadata?: Prisma.InputJsonValue;
  title: string;
  type: Prisma.CaseActivityCreateInput["type"];
}) {
  const activity = await prisma.caseActivity.create({
    data: {
      actorId: input.actorId,
      caseId: input.caseId,
      message: input.message,
      metadata: input.metadata,
      title: input.title,
      type: input.type,
    },
    include: { actor: { select: { email: true, id: true, name: true, role: true } } },
  });
  emitRealtime("case.activity.created", activity, [`case:${input.caseId}`]);
  return activity;
}

async function audit(input: {
  action: Prisma.AuditLogCreateInput["action"];
  actorId: string;
  caseId: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
  patientId: string;
  entityId?: string;
  entityType?: string;
}) {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      actorId: input.actorId,
      caseId: input.caseId,
      entityId: input.entityId,
      entityType: input.entityType,
      message: input.message,
      metadata: input.metadata,
      patientId: input.patientId,
    },
  });
}

async function nextCaseVersion(caseId: string) {
  const latest = await prisma.caseVersion.findFirst({
    orderBy: { version: "desc" },
    select: { version: true },
    where: { caseId },
  });
  return (latest?.version ?? 0) + 1;
}

async function saveVersion(caseId: string, actorId: string, reason: string) {
  const ecgCase = await prisma.eCGCase.findUnique({ select: caseSnapshotSelect, where: { id: caseId } });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  return prisma.caseVersion.create({
    data: {
      caseId,
      createdById: actorId,
      reason,
      snapshot: ecgCase as unknown as Prisma.InputJsonObject,
      version: await nextCaseVersion(caseId),
    },
  });
}

function extractMentions(text: string) {
  return Array.from(new Set(Array.from(text.matchAll(/@([\w.-]+)/g)).map((match) => match[1]).filter(Boolean)));
}

caseCollaborationRouter.get("/cases/:caseId", async (req, res, next) => {
  try {
    const ecgCase = await loadCase(String(req.params.caseId), req.auth!);
    const [presence, notes, activities, threads, assignments, locks, versions] = await Promise.all([
      prisma.casePresence.findMany({
        include: { user: { select: { email: true, id: true, name: true, role: true } } },
        orderBy: { lastActivityAt: "desc" },
        where: { caseId: ecgCase.id },
      }),
      prisma.caseClinicalNote.findMany({
        include: {
          author: { select: { email: true, id: true, name: true, role: true } },
          edits: { orderBy: { createdAt: "desc" }, take: 10 },
        },
        orderBy: { createdAt: "desc" },
        where: { caseId: ecgCase.id },
      }),
      prisma.caseActivity.findMany({
        include: { actor: { select: { email: true, id: true, name: true, role: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
        where: { caseId: ecgCase.id },
      }),
      prisma.caseDiscussionThread.findMany({
        include: {
          messages: {
            include: {
              author: { select: { email: true, id: true, name: true, role: true } },
              readReceipts: true,
              replies: { include: { author: { select: { email: true, id: true, name: true, role: true } } } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { updatedAt: "desc" },
        where: { caseId: ecgCase.id },
      }),
      prisma.caseAssignment.findMany({
        include: {
          assignedBy: { select: { email: true, id: true, name: true, role: true } },
          assignedTo: { select: { email: true, id: true, name: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        where: { caseId: ecgCase.id },
      }),
      prisma.caseLock.findMany({
        include: { user: { select: { email: true, id: true, name: true, role: true } } },
        orderBy: { createdAt: "desc" },
        where: { caseId: ecgCase.id, status: "ACTIVE", expiresAt: { gt: new Date() } },
      }),
      prisma.caseVersion.findMany({
        include: { createdBy: { select: { email: true, id: true, name: true, role: true } } },
        orderBy: { version: "desc" },
        take: 20,
        where: { caseId: ecgCase.id },
      }),
    ]);
    res.json({ activities, assignments, case: ecgCase, locks, notes, presence, threads, versions });
  } catch (error) {
    next(error);
  }
});

caseCollaborationRouter.post("/cases/:caseId/presence", async (req, res, next) => {
  try {
    const ecgCase = await loadCase(String(req.params.caseId), req.auth!);
    const body = z
      .object({
        currentSection: z.string().trim().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        status: z.enum(["ONLINE", "IDLE", "OFFLINE"]).default("ONLINE"),
      })
      .parse(req.body);
    const now = new Date();
    const presence = await prisma.casePresence.upsert({
      create: {
        caseId: ecgCase.id,
        connectedAt: now,
        currentSection: body.currentSection,
        lastActivityAt: now,
        metadata: body.metadata as Prisma.InputJsonObject | undefined,
        status: body.status,
        userId: req.auth!.id,
      },
      include: { user: { select: { email: true, id: true, name: true, role: true } } },
      update: {
        currentSection: body.currentSection,
        disconnectedAt: body.status === "OFFLINE" ? now : null,
        lastActivityAt: now,
        metadata: body.metadata as Prisma.InputJsonObject | undefined,
        status: body.status,
      },
      where: { caseId_userId: { caseId: ecgCase.id, userId: req.auth!.id } },
    });
    emitRealtime("case.presence.updated", presence, [`case:${ecgCase.id}`]);
    res.json({ presence });
  } catch (error) {
    next(error);
  }
});

caseCollaborationRouter.post("/cases/:caseId/notes", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const ecgCase = await loadCase(String(req.params.caseId), req.auth!);
    const body = z.object({ plainText: z.string().trim().optional(), richText: z.string().trim().min(1) }).parse(req.body);
    await saveVersion(ecgCase.id, req.auth!.id, "Before collaborative note creation");
    const note = await prisma.caseClinicalNote.create({
      data: {
        authorId: req.auth!.id,
        caseId: ecgCase.id,
        mentions: extractMentions(`${body.richText} ${body.plainText ?? ""}`),
        plainText: body.plainText,
        richText: body.richText,
      },
      include: { author: { select: { email: true, id: true, name: true, role: true } }, edits: true },
    });
    await audit({
      action: "COLLABORATION_NOTE_CREATED",
      actorId: req.auth!.id,
      caseId: ecgCase.id,
      entityId: note.id,
      entityType: "CaseClinicalNote",
      message: "Collaborative clinical note created.",
      patientId: ecgCase.patientId,
    });
    await createActivity({ actorId: req.auth!.id, caseId: ecgCase.id, title: "Clinical note added", type: "NOTE_ADDED" });
    emitRealtime("case.note.created", note, [`case:${ecgCase.id}`]);
    res.status(201).json({ note });
  } catch (error) {
    next(error);
  }
});

caseCollaborationRouter.patch("/cases/:caseId/notes/:noteId", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const ecgCase = await loadCase(String(req.params.caseId), req.auth!);
    const body = z.object({ plainText: z.string().trim().optional(), reason: z.string().trim().optional(), richText: z.string().trim().min(1) }).parse(req.body);
    const current = await prisma.caseClinicalNote.findFirst({ where: { caseId: ecgCase.id, id: String(req.params.noteId) } });
    if (!current) throw new AppError(404, "Clinical note not found.", "NOTE_NOT_FOUND");
    await saveVersion(ecgCase.id, req.auth!.id, "Before collaborative note edit");
    const nextVersion = current.version + 1;
    const note = await prisma.$transaction(async (tx) => {
      await tx.caseClinicalNoteEdit.create({
        data: {
          editorId: req.auth!.id,
          nextRichText: body.richText,
          noteId: current.id,
          previousRichText: current.richText,
          reason: body.reason,
          version: nextVersion,
        },
      });
      return tx.caseClinicalNote.update({
        data: {
          mentions: extractMentions(`${body.richText} ${body.plainText ?? ""}`),
          plainText: body.plainText,
          richText: body.richText,
          version: nextVersion,
        },
        include: {
          author: { select: { email: true, id: true, name: true, role: true } },
          edits: { orderBy: { createdAt: "desc" } },
        },
        where: { id: current.id },
      });
    });
    await audit({
      action: "COLLABORATION_NOTE_UPDATED",
      actorId: req.auth!.id,
      caseId: ecgCase.id,
      entityId: note.id,
      entityType: "CaseClinicalNote",
      message: "Collaborative clinical note updated.",
      patientId: ecgCase.patientId,
    });
    emitRealtime("case.note.updated", note, [`case:${ecgCase.id}`]);
    res.json({ note });
  } catch (error) {
    next(error);
  }
});

caseCollaborationRouter.post("/cases/:caseId/discussions", async (req, res, next) => {
  try {
    const ecgCase = await loadCase(String(req.params.caseId), req.auth!);
    const body = z
      .object({
        attachments: z.array(z.record(z.string(), z.unknown())).default([]),
        body: z.string().trim().min(1),
        mentionUserIds: z.array(z.string().trim()).default([]),
        parentId: z.string().trim().optional(),
        threadId: z.string().trim().optional(),
        title: z.string().trim().default("Case discussion"),
      })
      .parse(req.body);
    const thread = body.threadId
      ? await prisma.caseDiscussionThread.findFirst({ where: { caseId: ecgCase.id, id: body.threadId } })
      : await prisma.caseDiscussionThread.create({ data: { caseId: ecgCase.id, title: body.title } });
    if (!thread) throw new AppError(404, "Discussion thread not found.", "THREAD_NOT_FOUND");
    const mentions = Array.from(new Set([...body.mentionUserIds, ...extractMentions(body.body)]));
    const message = await prisma.caseDiscussionMessage.create({
      data: {
        attachments: body.attachments.length ? (body.attachments as Prisma.InputJsonArray) : undefined,
        authorId: req.auth!.id,
        body: body.body,
        mentions,
        parentId: body.parentId,
        threadId: thread.id,
      },
      include: { author: { select: { email: true, id: true, name: true, role: true } }, readReceipts: true },
    });
    await prisma.caseDiscussionThread.update({ data: { updatedAt: new Date() }, where: { id: thread.id } });
    await audit({
      action: "COLLABORATION_MESSAGE_SENT",
      actorId: req.auth!.id,
      caseId: ecgCase.id,
      entityId: message.id,
      entityType: "CaseDiscussionMessage",
      message: "Case discussion message sent.",
      patientId: ecgCase.patientId,
    });
    await createActivity({ actorId: req.auth!.id, caseId: ecgCase.id, title: "Discussion comment added", type: "COMMENT_ADDED" });
    await Promise.all(
      mentions.map((userId) =>
        createNotification({
          caseId: ecgCase.id,
          message: `You were mentioned in case ${ecgCase.caseNumber ?? ecgCase.caseId}.`,
          title: "Case mention",
          type: "INFO",
          userId,
        }),
      ),
    );
    emitRealtime("case.discussion.message.created", { message, threadId: thread.id }, [`case:${ecgCase.id}`]);
    res.status(201).json({ message, thread });
  } catch (error) {
    next(error);
  }
});

caseCollaborationRouter.post("/cases/:caseId/discussions/:threadId/read", async (req, res, next) => {
  try {
    const ecgCase = await loadCase(String(req.params.caseId), req.auth!);
    const thread = await prisma.caseDiscussionThread.findFirst({
      include: { messages: { select: { id: true } } },
      where: { caseId: ecgCase.id, id: String(req.params.threadId) },
    });
    if (!thread) throw new AppError(404, "Discussion thread not found.", "THREAD_NOT_FOUND");
    const receipts = await Promise.all(
      thread.messages.map((message) =>
        prisma.caseDiscussionReadReceipt.upsert({
          create: { messageId: message.id, userId: req.auth!.id },
          update: { readAt: new Date() },
          where: { messageId_userId: { messageId: message.id, userId: req.auth!.id } },
        }),
      ),
    );
    res.json({ receipts });
  } catch (error) {
    next(error);
  }
});

caseCollaborationRouter.post("/cases/:caseId/assignments", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const ecgCase = await loadCase(String(req.params.caseId), req.auth!);
    const body = z.object({ assignedToId: z.string().trim(), reason: z.string().trim().optional(), type: assignmentTypeSchema.default("PRIMARY_REVIEW") }).parse(req.body);
    await saveVersion(ecgCase.id, req.auth!.id, "Before collaboration assignment");
    const assignment = await prisma.caseAssignment.create({
      data: { assignedById: req.auth!.id, assignedToId: body.assignedToId, caseId: ecgCase.id, reason: body.reason, type: body.type },
      include: {
        assignedBy: { select: { email: true, id: true, name: true, role: true } },
        assignedTo: { select: { email: true, id: true, name: true, role: true } },
      },
    });
    const statusPatch: { assignedDoctorId?: string; status?: ECGCaseStatus } = {};
    if (body.type === "PRIMARY_REVIEW" || body.type === "REASSIGNMENT") statusPatch.assignedDoctorId = body.assignedToId;
    if (body.type === "ESCALATION") statusPatch.status = "ESCALATED";
    if (body.type === "SECOND_OPINION") statusPatch.status = "AWAITING_SECOND_OPINION";
    if (Object.keys(statusPatch).length > 0) {
      await prisma.eCGCase.update({ data: statusPatch, where: { id: ecgCase.id } });
    }
    await audit({
      action: "COLLABORATION_ASSIGNMENT_UPDATED",
      actorId: req.auth!.id,
      caseId: ecgCase.id,
      entityId: assignment.id,
      entityType: "CaseAssignment",
      message: `Case assignment updated: ${body.type}.`,
      patientId: ecgCase.patientId,
    });
    await createNotification({
      caseId: ecgCase.id,
      message: `You were assigned to case ${ecgCase.caseNumber ?? ecgCase.caseId}.`,
      title: "Case assignment",
      type: body.type === "ESCALATION" ? "WARNING" : "INFO",
      userId: body.assignedToId,
    });
    await createActivity({
      actorId: req.auth!.id,
      caseId: ecgCase.id,
      metadata: { assignedToId: body.assignedToId, type: body.type },
      title: body.type === "REASSIGNMENT" ? "Case reassigned" : "Case assignment updated",
      type: body.type === "REASSIGNMENT" ? "CASE_REASSIGNED" : "STATUS_CHANGED",
    });
    emitRealtime("case.assignment.updated", assignment, [`case:${ecgCase.id}`, `user:${body.assignedToId}`]);
    res.status(201).json({ assignment });
  } catch (error) {
    next(error);
  }
});

caseCollaborationRouter.post("/cases/:caseId/status", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const ecgCase = await loadCase(String(req.params.caseId), req.auth!);
    const body = z.object({ reason: z.string().trim().optional(), status: caseWorkflowStatusSchema }).parse(req.body);
    await saveVersion(ecgCase.id, req.auth!.id, "Before collaboration status change");
    const updated = await prisma.eCGCase.update({ data: { status: body.status }, where: { id: ecgCase.id } });
    await audit({
      action: "CASE_STATUS_CHANGED",
      actorId: req.auth!.id,
      caseId: ecgCase.id,
      message: `ECG case status changed to ${updated.status}.`,
      metadata: { previousStatus: ecgCase.status, reason: body.reason, status: updated.status },
      patientId: ecgCase.patientId,
    });
    await createActivity({
      actorId: req.auth!.id,
      caseId: ecgCase.id,
      metadata: { previousStatus: ecgCase.status, status: updated.status },
      title: updated.status === "APPROVED" ? "Final approval recorded" : "Case status changed",
      type: updated.status === "APPROVED" ? "FINAL_APPROVAL" : "STATUS_CHANGED",
    });
    emitRealtime("case.status.updated", updated, [`case:${ecgCase.id}`]);
    res.json({ case: updated });
  } catch (error) {
    next(error);
  }
});

caseCollaborationRouter.post("/cases/:caseId/locks", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const ecgCase = await loadCase(String(req.params.caseId), req.auth!);
    const body = z
      .object({
        metadata: z.record(z.string(), z.unknown()).optional(),
        resource: z.string().trim().default("case"),
        ttlSeconds: z.coerce.number().int().min(30).max(3600).default(300),
        version: z.coerce.number().int().min(1).default(1),
      })
      .parse(req.body);
    const now = new Date();
    const blockingLock = await prisma.caseLock.findFirst({
      include: { user: { select: { email: true, id: true, name: true, role: true } } },
      where: { caseId: ecgCase.id, expiresAt: { gt: now }, resource: body.resource, status: "ACTIVE", userId: { not: req.auth!.id } },
    });
    if (blockingLock) {
      throw new AppError(409, "This case section is locked by another collaborator.", "CASE_LOCKED");
    }
    await saveVersion(ecgCase.id, req.auth!.id, "Before lock acquisition");
    await prisma.caseLock.updateMany({
      data: { releasedAt: now, status: "RELEASED" },
      where: { caseId: ecgCase.id, resource: body.resource, status: "ACTIVE", userId: req.auth!.id },
    });
    const lock = await prisma.caseLock.create({
      data: {
        caseId: ecgCase.id,
        expiresAt: new Date(now.getTime() + body.ttlSeconds * 1000),
        metadata: body.metadata as Prisma.InputJsonObject | undefined,
        resource: body.resource,
        userId: req.auth!.id,
        version: body.version,
      },
      include: { user: { select: { email: true, id: true, name: true, role: true } } },
    });
    await audit({
      action: "COLLABORATION_LOCK_ACQUIRED",
      actorId: req.auth!.id,
      caseId: ecgCase.id,
      entityId: lock.id,
      entityType: "CaseLock",
      message: `Soft lock acquired for ${lock.resource}.`,
      patientId: ecgCase.patientId,
    });
    await createActivity({ actorId: req.auth!.id, caseId: ecgCase.id, title: "Record lock acquired", type: "LOCK_ACQUIRED" });
    emitRealtime("case.lock.updated", lock, [`case:${ecgCase.id}`]);
    res.status(201).json({ lock });
  } catch (error) {
    next(error);
  }
});

caseCollaborationRouter.delete("/cases/:caseId/locks/:lockId", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const ecgCase = await loadCase(String(req.params.caseId), req.auth!);
    const lock = await prisma.caseLock.findFirst({ where: { caseId: ecgCase.id, id: String(req.params.lockId) } });
    if (!lock) throw new AppError(404, "Case lock not found.", "LOCK_NOT_FOUND");
    assertResourceAccess(lock.userId === req.auth!.id || req.auth!.role === "ADMIN" || req.auth!.role === "SUPER_ADMIN");
    const released = await prisma.caseLock.update({
      data: { releasedAt: new Date(), status: "RELEASED" },
      include: { user: { select: { email: true, id: true, name: true, role: true } } },
      where: { id: lock.id },
    });
    await audit({
      action: "COLLABORATION_LOCK_RELEASED",
      actorId: req.auth!.id,
      caseId: ecgCase.id,
      entityId: lock.id,
      entityType: "CaseLock",
      message: `Soft lock released for ${lock.resource}.`,
      patientId: ecgCase.patientId,
    });
    await createActivity({ actorId: req.auth!.id, caseId: ecgCase.id, title: "Record lock released", type: "LOCK_RELEASED" });
    emitRealtime("case.lock.updated", released, [`case:${ecgCase.id}`]);
    res.json({ lock: released });
  } catch (error) {
    next(error);
  }
});

caseCollaborationRouter.post("/cases/:caseId/versions/:versionId/restore", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const ecgCase = await loadCase(String(req.params.caseId), req.auth!);
    const version = await prisma.caseVersion.findFirst({ where: { caseId: ecgCase.id, id: String(req.params.versionId) } });
    if (!version) throw new AppError(404, "Case version not found.", "VERSION_NOT_FOUND");
    await saveVersion(ecgCase.id, req.auth!.id, "Before version restore");
    const snapshot = version.snapshot as Record<string, unknown>;
    const restored = await prisma.eCGCase.update({
      data: {
        aiDiagnosis: snapshot.aiDiagnosis as string | null | undefined,
        assignedDoctorId: snapshot.assignedDoctorId as string | null | undefined,
        clinicalComments: snapshot.clinicalComments as string | null | undefined,
        clinicalNotes: snapshot.clinicalNotes as string | null | undefined,
        doctorDiagnosis: snapshot.doctorDiagnosis as string | null | undefined,
        finalDiagnosis: snapshot.finalDiagnosis as string | null | undefined,
        priority: snapshot.priority as Prisma.ECGCaseUpdateInput["priority"],
        recommendations: snapshot.recommendations as string | null | undefined,
        reviewedById: snapshot.reviewedById as string | null | undefined,
        severity: snapshot.severity as Prisma.ECGCaseUpdateInput["severity"],
        status: snapshot.status as Prisma.ECGCaseUpdateInput["status"],
      },
      where: { id: ecgCase.id },
    });
    await prisma.caseVersion.update({ data: { restoredAt: new Date() }, where: { id: version.id } });
    await audit({
      action: "COLLABORATION_VERSION_RESTORED",
      actorId: req.auth!.id,
      caseId: ecgCase.id,
      entityId: version.id,
      entityType: "CaseVersion",
      message: `Case restored to version ${version.version}.`,
      patientId: ecgCase.patientId,
    });
    await createActivity({
      actorId: req.auth!.id,
      caseId: ecgCase.id,
      metadata: { version: version.version },
      title: "Case version restored",
      type: "VERSION_RESTORED",
    });
    emitRealtime("case.version.restored", { case: restored, version }, [`case:${ecgCase.id}`]);
    res.json({ case: restored, version });
  } catch (error) {
    next(error);
  }
});
