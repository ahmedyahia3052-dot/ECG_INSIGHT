import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { emitRealtime } from "../../realtime/realtime.service";
import { createNotification } from "../../utils/notifications";

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
    for (const item of pending) {
      const updated = await prisma.syncQueue.update({
        data: { lastError: null, retryCount: item.retryCount + 1, status: "COMPLETED", syncedAt: new Date() },
        where: { id: item.id },
      });
      completed.push(updated);
    }
    res.json({ completed });
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
    const tasks = await prisma.task.findMany({
      include: { assignments: true, comments: true },
      orderBy: { createdAt: "desc" },
      take: 100,
      where: {
        OR: [{ createdById: req.auth!.id }, { assignments: { some: { userId: req.auth!.id } } }],
      },
    });
    res.json({ tasks });
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

tasksRouter.post("/:taskId/comments", async (req, res, next) => {
  try {
    const body = z.object({ body: z.string().trim().min(1) }).parse(req.body);
    const comment = await prisma.taskComment.create({
      data: { body: body.body, taskId: String(req.params.taskId), userId: req.auth!.id },
    });
    res.status(201).json({ comment });
  } catch (error) {
    next(error);
  }
});

teamsRouter.get("/", async (_req, res, next) => {
  try {
    const teams = await prisma.team.findMany({ include: { members: true }, orderBy: { createdAt: "desc" }, take: 100 });
    res.json({ teams });
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
    res.status(201).json({ team });
  } catch (error) {
    next(error);
  }
});

messagesRouter.get("/", async (req, res, next) => {
  try {
    const conversations = await prisma.conversation.findMany({
      include: { messages: { orderBy: { createdAt: "desc" }, take: 20 }, participants: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
      where: { participants: { some: { userId: req.auth!.id } } },
    });
    res.json({ conversations });
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
    const conversation = body.conversationId
      ? await prisma.conversation.update({ data: { updatedAt: new Date() }, where: { id: body.conversationId } })
      : await prisma.conversation.create({
          data: {
            caseId: body.caseId,
            patientId: body.patientId,
            title: body.title,
            participants: { create: Array.from(new Set([req.auth!.id, ...body.recipientIds])).map((userId) => ({ userId })) },
          },
        });
    const message = await prisma.message.create({
      data: { attachments: body.attachments, body: body.body, conversationId: conversation.id, senderId: req.auth!.id },
    });
    emitRealtime("notification.created", { conversationId: conversation.id, messageId: message.id }, body.recipientIds.map((id) => `user:${id}`));
    res.status(201).json({ conversation, message });
  } catch (error) {
    next(error);
  }
});

alertsRouter.get("/", async (req, res, next) => {
  try {
    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      where: { OR: [{ userId: req.auth!.id }, { userId: null }] },
    });
    res.json({ alerts });
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
    const alert = await prisma.alert.create({ data: body });
    emitRealtime("alert.created", alert, body.userId ? [`user:${body.userId}`] : []);
    res.status(201).json({ alert });
  } catch (error) {
    next(error);
  }
});
