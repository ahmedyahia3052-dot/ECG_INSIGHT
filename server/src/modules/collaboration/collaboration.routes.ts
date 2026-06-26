import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { emitRealtime } from "../../realtime/realtime.service";
import { createNotification } from "../../utils/notifications";
import { assertResourceAccess, canAccessCase, canAccessPatient } from "../../utils/resource-access";

export const syncRouter = Router();
export const tasksRouter = Router();
export const messagesRouter = Router();
export const teamsRouter = Router();
export const alertsRouter = Router();

syncRouter.use(requireAuth);
tasksRouter.use(requireAuth);
messagesRouter.use(requireAuth);
teamsRouter.use(requireAuth);
alertsRouter.use(requireAuth);

const jsonBody = z.record(z.string(), z.unknown()).default({});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().trim().optional(),
});

async function loadAccessibleTask(taskId: string, auth: Express.AuthUser) {
  const task = await prisma.task.findFirst({
    include: { assignments: true, comments: true },
    where: {
      id: taskId,
      ...(auth.role === "SUPER_ADMIN" || auth.role === "ADMIN"
        ? {}
        : { OR: [{ createdById: auth.id }, { assignments: { some: { userId: auth.id } } }] }),
    },
  });
  if (!task) throw new AppError(404, "Task not found.", "TASK_NOT_FOUND");
  return task;
}

async function loadAccessibleTeam(teamId: string, auth: Express.AuthUser) {
  const team = await prisma.team.findFirst({
    include: { members: true },
    where: {
      id: teamId,
      ...(auth.role === "SUPER_ADMIN" || auth.role === "ADMIN"
        ? {}
        : { OR: [{ createdById: auth.id }, { members: { some: { userId: auth.id } } }] }),
    },
  });
  if (!team) throw new AppError(404, "Team not found.", "TEAM_NOT_FOUND");
  return team;
}

async function loadAccessibleConversation(conversationId: string, auth: Express.AuthUser) {
  const conversation = await prisma.conversation.findFirst({
    include: { messages: { orderBy: { createdAt: "asc" } }, participants: true },
    where: {
      id: conversationId,
      ...(auth.role === "SUPER_ADMIN" || auth.role === "ADMIN"
        ? {}
        : { participants: { some: { userId: auth.id } } }),
    },
  });
  if (!conversation) throw new AppError(404, "Conversation not found.", "CONVERSATION_NOT_FOUND");
  return conversation;
}

async function loadAccessibleAlert(alertId: string, auth: Express.AuthUser) {
  const alert = await prisma.alert.findFirst({
    where: {
      id: alertId,
      ...(auth.role === "SUPER_ADMIN" || auth.role === "ADMIN"
        ? {}
        : { OR: [{ userId: auth.id }, { userId: null }] }),
    },
  });
  if (!alert) throw new AppError(404, "Alert not found.", "ALERT_NOT_FOUND");
  if (alert.patientId) assertResourceAccess(await canAccessPatient(alert.patientId, auth));
  if (alert.caseId) assertResourceAccess(await canAccessCase(alert.caseId, auth));
  return alert;
}

syncRouter.get("/", async (req, res, next) => {
  try {
    const queue = await prisma.syncQueue.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      where: { userId: req.auth!.id },
    });
    const cache = await prisma.offlineCache.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      where: { userId: req.auth!.id },
    });
    res.json({ cache, queue });
  } catch (error) {
    next(error);
  }
});

syncRouter.post("/queue", async (req, res, next) => {
  try {
    const body = z
      .object({
        entityId: z.string().trim().optional(),
        entityType: z.string().trim().min(1),
        operation: z.string().trim().min(1),
        patientId: z.string().trim().optional(),
        payloadJson: jsonBody,
      })
      .parse(req.body);
    if (body.patientId) assertResourceAccess(await canAccessPatient(body.patientId, req.auth!));
    const item = await prisma.syncQueue.create({
      data: { ...body, payloadJson: body.payloadJson as Prisma.InputJsonObject, userId: req.auth!.id },
    });
    await prisma.auditLog.create({
      data: {
        action: "SYNC_ITEM_CREATED",
        actorId: req.auth!.id,
        entityId: item.id,
        entityType: "SyncQueue",
        message: "Offline sync queue item created.",
        patientId: item.patientId,
      },
    });
    res.status(201).json({ item });
  } catch (error) {
    next(error);
  }
});

syncRouter.post("/process", async (req, res, next) => {
  try {
    const pending = await prisma.syncQueue.findMany({
      orderBy: { scheduledAt: "asc" },
      take: 25,
      where: { status: { in: ["PENDING", "FAILED"] }, userId: req.auth!.id },
    });
    const completed = [];
    const conflicts = [];
    const failed = [];
    for (const item of pending) {
      const payload = item.payloadJson && typeof item.payloadJson === "object" && !Array.isArray(item.payloadJson)
        ? item.payloadJson as Record<string, unknown>
        : {};
      if (payload.clientVersion && payload.serverVersion && payload.clientVersion !== payload.serverVersion) {
        const conflicted = await prisma.syncQueue.update({
          data: {
            conflictJson: {
              clientVersion: payload.clientVersion,
              reason: "Client and server versions differ.",
              serverVersion: payload.serverVersion,
            } as Prisma.InputJsonObject,
            lastError: "Client and server versions differ. Manual review required.",
            retryCount: item.retryCount + 1,
            status: "FAILED",
            syncedAt: null,
          },
          where: { id: item.id },
        });
        conflicts.push(conflicted);
        continue;
      }
      if (item.retryCount >= 4) {
        const retryFailed = await prisma.syncQueue.update({
          data: {
            lastError: item.lastError ?? "Maximum retry attempts exceeded.",
            retryCount: item.retryCount + 1,
            status: "FAILED",
            syncedAt: null,
          },
          where: { id: item.id },
        });
        failed.push(retryFailed);
        continue;
      }
      const updated = await prisma.syncQueue.update({
        data: { lastError: null, retryCount: item.retryCount + 1, status: "COMPLETED", syncedAt: new Date() },
        where: { id: item.id },
      });
      completed.push(updated);
    }
    res.json({ completed, conflicts, failed });
  } catch (error) {
    next(error);
  }
});

syncRouter.post("/cache", async (req, res, next) => {
  try {
    const body = z
      .object({
        cacheKey: z.string().trim().min(1),
        entityType: z.string().trim().min(1),
        expiresAt: z.string().datetime().optional(),
        patientId: z.string().trim().optional(),
        value: z.unknown(),
      })
      .parse(req.body);
    if (body.patientId) assertResourceAccess(await canAccessPatient(body.patientId, req.auth!));
    const encryptedBlob = Buffer.from(JSON.stringify(body.value)).toString("base64");
    const checksum = crypto.createHash("sha256").update(encryptedBlob).digest("hex");
    const cache = await prisma.offlineCache.upsert({
      create: {
        cacheKey: body.cacheKey,
        checksum,
        encryptedBlob,
        encryptionMeta: { algorithm: "base64-dev-abstraction", version: 1 },
        entityType: body.entityType,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        patientId: body.patientId,
        userId: req.auth!.id,
      },
      update: { checksum, encryptedBlob, lastAccessedAt: new Date() },
      where: { userId_cacheKey: { cacheKey: body.cacheKey, userId: req.auth!.id } },
    });
    res.status(201).json({ cache });
  } catch (error) {
    next(error);
  }
});

tasksRouter.get("/", async (req, res, next) => {
  try {
    const query = listQuerySchema
      .extend({
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
        status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
      })
      .parse(req.query);
    const where: Prisma.TaskWhereInput = {
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.status ? { status: query.status } : {}),
      AND: [
        ...(query.q
          ? [
              {
                OR: [
                  { title: { contains: query.q } },
                  { description: { contains: query.q } },
                  { patientId: query.q },
                  { caseId: query.q },
                ],
              },
            ]
          : []),
        ...(req.auth!.role === "SUPER_ADMIN" || req.auth!.role === "ADMIN"
          ? []
          : [{ OR: [{ createdById: req.auth!.id }, { assignments: { some: { userId: req.auth!.id } } }] }]),
      ],
    };
    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        include: { assignments: true, comments: true },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
    ]);
    res.json({ page: query.page, pageSize: query.pageSize, tasks, total, totalPages: Math.ceil(total / query.pageSize) });
  } catch (error) {
    next(error);
  }
});

tasksRouter.get("/:taskId", async (req, res, next) => {
  try {
    const task = await loadAccessibleTask(String(req.params.taskId), req.auth!);
    res.json({ task });
  } catch (error) {
    next(error);
  }
});

tasksRouter.post("/", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = z
      .object({
        assignedUserId: z.string().trim().optional(),
        caseId: z.string().trim().optional(),
        description: z.string().trim().optional(),
        dueAt: z.string().datetime().optional(),
        patientId: z.string().trim().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
        title: z.string().trim().min(1),
      })
      .parse(req.body);
    if (body.patientId) assertResourceAccess(await canAccessPatient(body.patientId, req.auth!));
    if (body.caseId) assertResourceAccess(await canAccessCase(body.caseId, req.auth!));
    const patient = body.patientId ? await prisma.patient.findUnique({ where: { id: body.patientId } }) : null;
    const task = await prisma.task.create({
      data: {
        caseId: body.caseId,
        createdById: req.auth!.id,
        departmentId: patient?.departmentId,
        description: body.description,
        dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
        organizationId: patient?.organizationId,
        patientId: body.patientId,
        priority: body.priority,
        title: body.title,
        assignments: body.assignedUserId ? { create: { userId: body.assignedUserId } } : undefined,
      },
      include: { assignments: true },
    });
    await prisma.auditLog.create({
      data: { action: "TASK_CREATED", actorId: req.auth!.id, entityId: task.id, entityType: "Task", message: `Task created: ${task.title}.`, patientId: task.patientId },
    });
    if (body.assignedUserId) {
      await createNotification({ message: task.title, title: "Task assigned", type: "INFO", userId: body.assignedUserId });
      emitRealtime("task.assigned", task, [`user:${body.assignedUserId}`]);
    }
    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

tasksRouter.patch("/:taskId", async (req, res, next) => {
  try {
    const current = await loadAccessibleTask(String(req.params.taskId), req.auth!);
    assertResourceAccess(req.auth!.role === "SUPER_ADMIN" || req.auth!.role === "ADMIN" || current.createdById === req.auth!.id);
    const body = z
      .object({
        assignedUserId: z.string().trim().nullable().optional(),
        description: z.string().trim().nullable().optional(),
        dueAt: z.string().datetime().nullable().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
        status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
        title: z.string().trim().min(1).optional(),
      })
      .parse(req.body);
    const task = await prisma.task.update({
      data: {
        description: body.description,
        dueAt: body.dueAt === null ? null : body.dueAt ? new Date(body.dueAt) : undefined,
        priority: body.priority,
        status: body.status,
        title: body.title,
        assignments:
          body.assignedUserId === undefined
            ? undefined
            : {
                deleteMany: {},
                ...(body.assignedUserId ? { create: { userId: body.assignedUserId } } : {}),
              },
      },
      include: { assignments: true, comments: true },
      where: { id: current.id },
    });
    await prisma.auditLog.create({
      data: { action: "TASK_UPDATED", actorId: req.auth!.id, entityId: task.id, entityType: "Task", message: `Task updated: ${task.title}.`, patientId: task.patientId },
    });
    res.json({ task });
  } catch (error) {
    next(error);
  }
});

tasksRouter.delete("/:taskId", async (req, res, next) => {
  try {
    const task = await loadAccessibleTask(String(req.params.taskId), req.auth!);
    assertResourceAccess(req.auth!.role === "SUPER_ADMIN" || req.auth!.role === "ADMIN" || task.createdById === req.auth!.id);
    await prisma.task.delete({ where: { id: task.id } });
    await prisma.auditLog.create({
      data: { action: "TASK_DELETED", actorId: req.auth!.id, entityId: task.id, entityType: "Task", message: `Task deleted: ${task.title}.`, patientId: task.patientId },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

tasksRouter.post("/:taskId/comments", async (req, res, next) => {
  try {
    const body = z.object({ body: z.string().trim().min(1) }).parse(req.body);
    const task = await prisma.task.findFirst({
      where: {
        id: String(req.params.taskId),
        ...(req.auth!.role === "SUPER_ADMIN" || req.auth!.role === "ADMIN"
          ? {}
          : { OR: [{ createdById: req.auth!.id }, { assignments: { some: { userId: req.auth!.id } } }] }),
      },
    });
    if (!task) throw new AppError(404, "Task not found.", "TASK_NOT_FOUND");
    const comment = await prisma.taskComment.create({
      data: { body: body.body, taskId: String(req.params.taskId), userId: req.auth!.id },
    });
    res.status(201).json({ comment });
  } catch (error) {
    next(error);
  }
});

teamsRouter.get("/", async (req, res, next) => {
  try {
    const query = listQuerySchema.extend({ organizationId: z.string().trim().optional() }).parse(req.query);
    const where: Prisma.TeamWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      AND: [
        ...(query.q
          ? [
              {
                OR: [
                  { name: { contains: query.q } },
                  { description: { contains: query.q } },
                ],
              },
            ]
          : []),
        ...(req.auth!.role === "SUPER_ADMIN" || req.auth!.role === "ADMIN"
          ? []
          : [{ OR: [{ createdById: req.auth!.id }, { members: { some: { userId: req.auth!.id } } }] }]),
      ],
    };
    const [total, teams] = await Promise.all([
      prisma.team.count({ where }),
      prisma.team.findMany({
        include: { members: true },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
    ]);
    res.json({ page: query.page, pageSize: query.pageSize, teams, total, totalPages: Math.ceil(total / query.pageSize) });
  } catch (error) {
    next(error);
  }
});

teamsRouter.get("/:teamId", async (req, res, next) => {
  try {
    const team = await loadAccessibleTeam(String(req.params.teamId), req.auth!);
    res.json({ team });
  } catch (error) {
    next(error);
  }
});

teamsRouter.post("/", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = z
      .object({
        description: z.string().trim().optional(),
        memberIds: z.array(z.string().trim()).default([]),
        name: z.string().trim().min(1),
        organizationId: z.string().trim().optional(),
      })
      .parse(req.body);
    const team = await prisma.team.create({
      data: {
        createdById: req.auth!.id,
        description: body.description,
        name: body.name,
        organizationId: body.organizationId,
        members: { create: Array.from(new Set([req.auth!.id, ...body.memberIds])).map((userId) => ({ role: "member", userId })) },
      },
      include: { members: true },
    });
    await prisma.auditLog.create({
      data: {
        action: "TEAM_CREATED",
        actorId: req.auth!.id,
        entityId: team.id,
        entityType: "Team",
        message: `Team created: ${team.name}.`,
        organizationId: team.organizationId,
      },
    });
    res.status(201).json({ team });
  } catch (error) {
    next(error);
  }
});

teamsRouter.patch("/:teamId", async (req, res, next) => {
  try {
    const current = await loadAccessibleTeam(String(req.params.teamId), req.auth!);
    assertResourceAccess(req.auth!.role === "SUPER_ADMIN" || req.auth!.role === "ADMIN" || current.createdById === req.auth!.id);
    const body = z
      .object({
        description: z.string().trim().nullable().optional(),
        memberIds: z.array(z.string().trim()).optional(),
        name: z.string().trim().min(1).optional(),
      })
      .parse(req.body);
    const team = await prisma.team.update({
      data: {
        description: body.description,
        name: body.name,
        members: body.memberIds
          ? {
              deleteMany: {},
              create: Array.from(new Set([current.createdById, ...body.memberIds])).map((userId) => ({ role: "member", userId })),
            }
          : undefined,
      },
      include: { members: true },
      where: { id: current.id },
    });
    await prisma.auditLog.create({
      data: { action: "TEAM_UPDATED", actorId: req.auth!.id, entityId: team.id, entityType: "Team", message: `Team updated: ${team.name}.`, organizationId: team.organizationId },
    });
    res.json({ team });
  } catch (error) {
    next(error);
  }
});

teamsRouter.delete("/:teamId", async (req, res, next) => {
  try {
    const team = await loadAccessibleTeam(String(req.params.teamId), req.auth!);
    assertResourceAccess(req.auth!.role === "SUPER_ADMIN" || req.auth!.role === "ADMIN" || team.createdById === req.auth!.id);
    await prisma.team.delete({ where: { id: team.id } });
    await prisma.auditLog.create({
      data: { action: "TEAM_DELETED", actorId: req.auth!.id, entityId: team.id, entityType: "Team", message: `Team deleted: ${team.name}.`, organizationId: team.organizationId },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

messagesRouter.get("/", async (req, res, next) => {
  try {
    const query = listQuerySchema
      .extend({
        caseId: z.string().trim().optional(),
        patientId: z.string().trim().optional(),
      })
      .parse(req.query);
    const where: Prisma.ConversationWhereInput = {
      ...(query.caseId ? { caseId: query.caseId } : {}),
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q } },
              { messages: { some: { body: { contains: query.q } } } },
            ],
          }
        : {}),
      ...(req.auth!.role === "SUPER_ADMIN" || req.auth!.role === "ADMIN"
        ? {}
        : { participants: { some: { userId: req.auth!.id } } }),
    };
    const [total, conversations] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.findMany({
        include: { messages: { orderBy: { createdAt: "desc" }, take: 20 }, participants: true },
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
    ]);
    res.json({ conversations, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) });
  } catch (error) {
    next(error);
  }
});

messagesRouter.get("/:conversationId", async (req, res, next) => {
  try {
    const conversation = await loadAccessibleConversation(String(req.params.conversationId), req.auth!);
    res.json({ conversation });
  } catch (error) {
    next(error);
  }
});

messagesRouter.post("/", async (req, res, next) => {
  try {
    const body = z
      .object({
        attachments: z.array(z.string().trim()).default([]),
        body: z.string().trim().min(1),
        caseId: z.string().trim().optional(),
        conversationId: z.string().trim().optional(),
        patientId: z.string().trim().optional(),
        recipientIds: z.array(z.string().trim()).default([]),
        title: z.string().trim().default("Clinical discussion"),
      })
      .parse(req.body);
    if (body.patientId) assertResourceAccess(await canAccessPatient(body.patientId, req.auth!));
    if (body.caseId) assertResourceAccess(await canAccessCase(body.caseId, req.auth!));
    const conversation = body.conversationId
      ? await prisma.conversation.findFirst({
          where: {
            id: body.conversationId,
            ...(req.auth!.role === "SUPER_ADMIN" || req.auth!.role === "ADMIN"
              ? {}
              : { participants: { some: { userId: req.auth!.id } } }),
          },
        })
      : await prisma.conversation.create({
          data: {
            caseId: body.caseId,
            patientId: body.patientId,
            title: body.title,
            participants: { create: Array.from(new Set([req.auth!.id, ...body.recipientIds])).map((userId) => ({ userId })) },
          },
        });
    if (!conversation) throw new AppError(404, "Conversation not found.", "CONVERSATION_NOT_FOUND");
    if (body.conversationId) {
      await prisma.conversation.update({ data: { updatedAt: new Date() }, where: { id: conversation.id } });
    }
    const message = await prisma.message.create({
      data: { attachments: body.attachments, body: body.body, conversationId: conversation.id, senderId: req.auth!.id },
    });
    await prisma.auditLog.create({
      data: {
        action: "MESSAGE_SENT",
        actorId: req.auth!.id,
        caseId: conversation.caseId,
        entityId: message.id,
        entityType: "Message",
        message: "Clinical message sent.",
        patientId: conversation.patientId,
      },
    });
    emitRealtime("notification.created", { conversationId: conversation.id, messageId: message.id }, body.recipientIds.map((id) => `user:${id}`));
    res.status(201).json({ conversation, message });
  } catch (error) {
    next(error);
  }
});

messagesRouter.post("/:conversationId/read", async (req, res, next) => {
  try {
    const conversation = await loadAccessibleConversation(String(req.params.conversationId), req.auth!);
    const receipts = await Promise.all(
      conversation.messages.map((message) =>
        prisma.messageReadReceipt.upsert({
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

messagesRouter.delete("/:conversationId", async (req, res, next) => {
  try {
    const conversation = await loadAccessibleConversation(String(req.params.conversationId), req.auth!);
    assertResourceAccess(
      req.auth!.role === "SUPER_ADMIN" ||
        req.auth!.role === "ADMIN" ||
        conversation.participants.some((participant) => participant.userId === req.auth!.id),
    );
    await prisma.conversation.delete({ where: { id: conversation.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

alertsRouter.get("/", async (req, res, next) => {
  try {
    const query = listQuerySchema
      .extend({
        category: z.enum(["CRITICAL_ECG", "HIGH_RISK_WORKER", "PENDING_REVIEW", "EXPIRING_CERTIFICATE", "SECURITY_INCIDENT"]).optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
        status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]).optional(),
      })
      .parse(req.query);
    const where: Prisma.AlertWhereInput = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.status ? { status: query.status } : {}),
      AND: [
        ...(query.q
          ? [
              {
                OR: [
                  { title: { contains: query.q } },
                  { message: { contains: query.q } },
                  { patientId: query.q },
                  { caseId: query.q },
                ],
              },
            ]
          : []),
        ...(req.auth!.role === "SUPER_ADMIN" || req.auth!.role === "ADMIN" ? [] : [{ OR: [{ userId: req.auth!.id }, { userId: null }] }]),
      ],
    };
    const [total, alerts] = await Promise.all([
      prisma.alert.count({ where }),
      prisma.alert.findMany({
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
    ]);
    res.json({ alerts, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) });
  } catch (error) {
    next(error);
  }
});

alertsRouter.get("/:alertId", async (req, res, next) => {
  try {
    const alert = await loadAccessibleAlert(String(req.params.alertId), req.auth!);
    res.json({ alert });
  } catch (error) {
    next(error);
  }
});

alertsRouter.post("/", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = z
      .object({
        caseId: z.string().trim().optional(),
        category: z.enum(["CRITICAL_ECG", "HIGH_RISK_WORKER", "PENDING_REVIEW", "EXPIRING_CERTIFICATE", "SECURITY_INCIDENT"]),
        message: z.string().trim().min(1),
        patientId: z.string().trim().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("HIGH"),
        title: z.string().trim().min(1),
        userId: z.string().trim().optional(),
      })
      .parse(req.body);
    if (body.patientId) assertResourceAccess(await canAccessPatient(body.patientId, req.auth!));
    if (body.caseId) assertResourceAccess(await canAccessCase(body.caseId, req.auth!));
    const alert = await prisma.alert.create({ data: body });
    await prisma.auditLog.create({
      data: {
        action: "ALERT_CREATED",
        actorId: req.auth!.id,
        caseId: alert.caseId,
        entityId: alert.id,
        entityType: "Alert",
        message: `Alert created: ${alert.title}.`,
        patientId: alert.patientId,
      },
    });
    emitRealtime("alert.created", alert, body.userId ? [`user:${body.userId}`] : []);
    res.status(201).json({ alert });
  } catch (error) {
    next(error);
  }
});

alertsRouter.patch("/:alertId", async (req, res, next) => {
  try {
    const current = await loadAccessibleAlert(String(req.params.alertId), req.auth!);
    const body = z
      .object({
        message: z.string().trim().min(1).optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
        status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]).optional(),
        title: z.string().trim().min(1).optional(),
      })
      .parse(req.body);
    const alert = await prisma.alert.update({
      data: {
        message: body.message,
        priority: body.priority,
        status: body.status,
        title: body.title,
        acknowledgedAt: body.status === "ACKNOWLEDGED" ? new Date() : undefined,
        resolvedAt: body.status === "RESOLVED" ? new Date() : undefined,
      },
      where: { id: current.id },
    });
    await prisma.auditLog.create({
      data: {
        action: "ALERT_UPDATED",
        actorId: req.auth!.id,
        caseId: alert.caseId,
        entityId: alert.id,
        entityType: "Alert",
        message: `Alert updated: ${alert.title}.`,
        patientId: alert.patientId,
      },
    });
    res.json({ alert });
  } catch (error) {
    next(error);
  }
});

alertsRouter.delete("/:alertId", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const alert = await loadAccessibleAlert(String(req.params.alertId), req.auth!);
    await prisma.alert.delete({ where: { id: alert.id } });
    await prisma.auditLog.create({
      data: {
        action: "ALERT_DELETED",
        actorId: req.auth!.id,
        caseId: alert.caseId,
        entityId: alert.id,
        entityType: "Alert",
        message: `Alert deleted: ${alert.title}.`,
        patientId: alert.patientId,
      },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
