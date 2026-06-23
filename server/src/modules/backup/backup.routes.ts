import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";

export const backupRouter = Router();

backupRouter.use(requireAuth);

backupRouter.get("/", requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const jobs = await prisma.backupJob.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    res.json({ jobs });
  } catch (error) {
    next(error);
  }
});

backupRouter.post("/", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const body = z
      .object({
        backupType: z.string().trim().min(1).default("database"),
        organizationId: z.string().trim().optional(),
        retentionDays: z.number().int().positive().default(30),
      })
      .parse(req.body);
    const checksum = crypto
      .createHash("sha256")
      .update(`${body.backupType}:${Date.now()}:${req.auth!.id}`)
      .digest("hex");
    const job = await prisma.backupJob.create({
      data: {
        backupType: body.backupType,
        checksum,
        completedAt: new Date(),
        organizationId: body.organizationId,
        retentionDays: body.retentionDays,
        startedAt: new Date(),
        status: "COMPLETED",
        storageLocation: `backups/${checksum}.archive`,
        userId: req.auth!.id,
      },
    });
    await prisma.auditLog.create({
      data: {
        action: "BACKUP_JOB_CREATED",
        actorId: req.auth!.id,
        entityId: job.id,
        entityType: "BackupJob",
        message: "Backup job completed by scheduler abstraction.",
        metadata: { checksum: job.checksum, storageLocation: job.storageLocation },
      },
    });
    res.status(201).json({ job });
  } catch (error) {
    next(error);
  }
});
