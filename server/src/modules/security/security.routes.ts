import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createSignedDownloadToken } from "../../utils/file-security";

export const securityRouter = Router();

securityRouter.use(requireAuth);

function hashValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function requestContext(req: { ip?: string; get(name: string): string | undefined }) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  };
}

securityRouter.get("/sessions", async (req, res, next) => {
  try {
    const sessions = await prisma.userSession.findMany({
      orderBy: { lastActivityAt: "desc" },
      take: 100,
      where: req.auth!.role === "SUPER_ADMIN" || req.auth!.role === "ADMIN" ? {} : { userId: req.auth!.id },
    });
    res.json({ sessions });
  } catch (error) {
    next(error);
  }
});

securityRouter.post("/sessions/register", async (req, res, next) => {
  try {
    const body = z.object({ deviceFingerprint: z.string().trim().optional() }).parse(req.body);
    const session = await prisma.userSession.create({
      data: {
        ...requestContext(req),
        active: true,
        deviceFingerprint: body.deviceFingerprint,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        userId: req.auth!.id,
      },
    });
    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
});

securityRouter.post("/sessions/:id/revoke", async (req, res, next) => {
  try {
    const session = await prisma.userSession.update({
      data: { active: false, revokedAt: new Date() },
      where: { id: String(req.params.id) },
    });
    res.json({ session });
  } catch (error) {
    next(error);
  }
});

securityRouter.get("/mfa", async (req, res, next) => {
  try {
    const methods = await prisma.userMFA.findMany({ where: { userId: req.auth!.id } });
    res.json({ methods });
  } catch (error) {
    next(error);
  }
});

securityRouter.post("/mfa", async (req, res, next) => {
  try {
    const body = z.object({ code: z.string().trim().optional(), type: z.enum(["EMAIL_OTP", "TOTP"]) }).parse(req.body);
    const secret = body.type === "TOTP" ? crypto.randomBytes(20).toString("hex") : undefined;
    const otp = body.type === "EMAIL_OTP" ? String(Math.floor(100000 + Math.random() * 900000)) : undefined;
    const method = await prisma.userMFA.create({
      data: {
        emailOtpHash: otp ? hashValue(otp) : undefined,
        enabled: false,
        secretHash: secret ? hashValue(secret) : undefined,
        type: body.type,
        userId: req.auth!.id,
      },
    });
    res.status(201).json({ method, otp, secret });
  } catch (error) {
    next(error);
  }
});

securityRouter.post("/mfa/:id/verify", async (req, res, next) => {
  try {
    const body = z.object({ code: z.string().trim().min(4) }).parse(req.body);
    const method = await prisma.userMFA.findUnique({ where: { id: String(req.params.id) } });
    const valid =
      method?.emailOtpHash === hashValue(body.code) ||
      (method?.type === "TOTP" && body.code.length >= 6);
    const updated = await prisma.userMFA.update({
      data: { enabled: valid, lastUsedAt: valid ? new Date() : undefined, verifiedAt: valid ? new Date() : undefined },
      where: { id: String(req.params.id) },
    });
    res.json({ method: updated, valid });
  } catch (error) {
    next(error);
  }
});

securityRouter.get("/devices", async (req, res, next) => {
  try {
    const devices = await prisma.trustedDevice.findMany({
      orderBy: { lastSeenAt: "desc" },
      where: { userId: req.auth!.id },
    });
    res.json({ devices });
  } catch (error) {
    next(error);
  }
});

securityRouter.post("/devices", async (req, res, next) => {
  try {
    const body = z.object({ deviceFingerprint: z.string().trim().min(8), deviceName: z.string().trim().min(1) }).parse(req.body);
    const device = await prisma.trustedDevice.upsert({
      create: {
        ...requestContext(req),
        deviceFingerprint: body.deviceFingerprint,
        deviceName: body.deviceName,
        trusted: true,
        userId: req.auth!.id,
      },
      update: { ipAddress: req.ip, lastSeenAt: new Date(), trusted: true },
      where: { userId_deviceFingerprint: { deviceFingerprint: body.deviceFingerprint, userId: req.auth!.id } },
    });
    res.status(201).json({ device });
  } catch (error) {
    next(error);
  }
});

securityRouter.post("/devices/:id/revoke", async (req, res, next) => {
  try {
    const device = await prisma.trustedDevice.update({ data: { trusted: false }, where: { id: String(req.params.id) } });
    await prisma.securityEvent.create({
      data: {
        ...requestContext(req),
        eventType: "DEVICE_REVOKED",
        message: `Trusted device ${device.deviceName} revoked.`,
        severity: "MEDIUM",
        userId: req.auth!.id,
      },
    });
    res.json({ device });
  } catch (error) {
    next(error);
  }
});

securityRouter.get("/events", requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const events = await prisma.securityEvent.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    res.json({ events });
  } catch (error) {
    next(error);
  }
});

securityRouter.post("/events", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const body = z.object({
      eventType: z.enum(["MULTIPLE_FAILED_LOGINS", "PRIVILEGE_ESCALATION", "SUSPICIOUS_ACCESS", "BRUTE_FORCE_ATTEMPT", "UNUSUAL_IP_ACCESS", "DEVICE_REVOKED"]),
      message: z.string().trim().min(1),
      severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
      userId: z.string().trim().optional(),
    }).parse(req.body);
    const event = await prisma.securityEvent.create({
      data: { ...requestContext(req), ...body },
    });
    res.status(201).json({ event });
  } catch (error) {
    next(error);
  }
});

securityRouter.get("/permissions", requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const permissions = await prisma.permission.findMany({
      include: { rolePermissions: true },
      orderBy: { key: "asc" },
    });
    res.json({ permissions });
  } catch (error) {
    next(error);
  }
});

securityRouter.post("/permissions", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const body = z
      .object({
        description: z.string().trim().min(1),
        key: z.string().trim().min(1),
        role: z.string().trim().min(1),
      })
      .parse(req.body);
    const permission = await prisma.permission.upsert({
      create: { description: body.description, key: body.key },
      update: { description: body.description },
      where: { key: body.key },
    });
    const rolePermission = await prisma.rolePermission.upsert({
      create: { assignedById: req.auth!.id, permissionId: permission.id, role: body.role },
      update: { assignedById: req.auth!.id },
      where: { role_permissionId: { permissionId: permission.id, role: body.role } },
    });
    await prisma.auditLog.create({
      data: {
        action: "PERMISSION_CHANGED",
        actorId: req.auth!.id,
        entityId: rolePermission.id,
        entityType: "RolePermission",
        message: `Permission ${permission.key} assigned to ${body.role}.`,
      },
    });
    res.status(201).json({ permission, rolePermission });
  } catch (error) {
    next(error);
  }
});

securityRouter.post("/file/signed-url", async (req, res, next) => {
  try {
    const body = z.object({ path: z.string().trim().min(1) }).parse(req.body);
    res.json({ token: createSignedDownloadToken(body.path) });
  } catch (error) {
    next(error);
  }
});
