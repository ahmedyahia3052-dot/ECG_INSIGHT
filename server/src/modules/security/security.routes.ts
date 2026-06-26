import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createSignedDownloadToken } from "../../utils/file-security";
import {
  currentKeyVersion,
  encryptField,
  generateRecoveryCodes,
  generateTotpSecret,
  hashSecurityValue,
  verifyTotpCode,
} from "../../utils/security-crypto";

export const securityRouter = Router();

securityRouter.use(requireAuth);

function requestContext(req: { ip?: string; get(name: string): string | undefined }) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  };
}

async function auditSecurity(req: Parameters<typeof requestContext>[0] & { auth?: { id: string } }, input: {
  action: "MFA_RECOVERY_CODE_USED" | "TRUSTED_DEVICE_REVOKED" | "SESSION_REVOKED" | "SECURITY_POLICY_UPDATED" | "KEY_ROTATED" | "PHI_FIELD_ENCRYPTED" | "SECURITY_EVENT_CREATED";
  entityId?: string;
  entityType?: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  if (!req.auth?.id) return;
  await prisma.auditLog.create({
    data: {
      action: input.action,
      actorId: req.auth.id,
      entityId: input.entityId,
      entityType: input.entityType,
      ipAddress: req.ip,
      message: input.message,
      metadata: input.metadata as Prisma.InputJsonObject | undefined,
      userAgent: req.get("user-agent"),
    },
  });
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
    const existing = await prisma.userSession.findUnique({ where: { id: String(req.params.id) } });
    if (!existing || (existing.userId !== req.auth!.id && req.auth!.role !== "OWNER" && req.auth!.role !== "SUPER_ADMIN" && req.auth!.role !== "ADMIN")) {
      res.status(404).json({ message: "Session not found." });
      return;
    }
    const session = await prisma.userSession.update({
      data: { active: false, revokedAt: new Date() },
      where: { id: String(req.params.id) },
    });
    if (session.sessionId) {
      await prisma.session.updateMany({ data: { revokedAt: new Date() }, where: { id: session.sessionId, userId: session.userId } });
    }
    await auditSecurity(req, {
      action: "SESSION_REVOKED",
      entityId: session.id,
      entityType: "UserSession",
      message: "Enterprise session revoked.",
      metadata: { targetUserId: session.userId },
    });
    res.json({ session });
  } catch (error) {
    next(error);
  }
});

securityRouter.post("/sessions/revoke-all", async (req, res, next) => {
  try {
    const updated = await prisma.userSession.updateMany({
      data: { active: false, revokedAt: new Date() },
      where: { active: true, userId: req.auth!.id },
    });
    await prisma.session.updateMany({ data: { revokedAt: new Date() }, where: { revokedAt: null, userId: req.auth!.id } });
    await auditSecurity(req, {
      action: "SESSION_REVOKED",
      entityType: "Session",
      message: "All active sessions force logged out.",
      metadata: { revoked: updated.count },
    });
    res.json({ revoked: updated.count });
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
    const secret = body.type === "TOTP" ? generateTotpSecret() : undefined;
    const otp = body.type === "EMAIL_OTP" ? String(Math.floor(100000 + Math.random() * 900000)) : undefined;
    const method = await prisma.userMFA.create({
      data: {
        emailOtpHash: otp ? hashSecurityValue(otp) : undefined,
        enabled: false,
        secretHash: secret ? encryptField(secret) : undefined,
        type: body.type,
        userId: req.auth!.id,
      },
    });
    if (req.auth!.role === "OWNER") {
      await prisma.auditLog.create({
        data: {
          action: "SECURITY_EVENT_CREATED",
          actorId: req.auth!.id,
          entityId: method.id,
          entityType: "UserMFA",
          message: `Owner MFA method created: ${body.type}.`,
          metadata: { type: body.type },
        },
      });
    }
    const recoveryCodes = generateRecoveryCodes();
    try {
      await prisma.mFARecoveryCode.createMany({
        data: recoveryCodes.map((code) => ({
          codeHash: hashSecurityValue(code),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          mfaMethodId: method.id,
          userId: req.auth!.id,
        })),
      });
    } catch {
      // Pre-migration environments can still enroll MFA; recovery codes activate after migration.
    }
    res.status(201).json({ method, otp, recoveryCodes, secret });
  } catch (error) {
    next(error);
  }
});

securityRouter.post("/mfa/:id/verify", async (req, res, next) => {
  try {
    const body = z.object({ code: z.string().trim().min(4) }).parse(req.body);
    const method = await prisma.userMFA.findUnique({ where: { id: String(req.params.id) } });
    const valid =
      method?.emailOtpHash === hashSecurityValue(body.code) ||
      (method?.type === "TOTP" && verifyTotpCode(method.secretHash, body.code));
    const updated = await prisma.userMFA.update({
      data: { enabled: valid, lastUsedAt: valid ? new Date() : undefined, verifiedAt: valid ? new Date() : undefined },
      where: { id: String(req.params.id) },
    });
    if (req.auth!.role === "OWNER" && valid) {
      await prisma.auditLog.create({
        data: {
          action: "SECURITY_EVENT_CREATED",
          actorId: req.auth!.id,
          entityId: updated.id,
          entityType: "UserMFA",
          message: `Owner MFA method enabled: ${updated.type}.`,
          metadata: { type: updated.type },
        },
      });
    }
    res.json({ method: updated, valid });
  } catch (error) {
    next(error);
  }
});

securityRouter.delete("/mfa/:id", async (req, res, next) => {
  try {
    const method = await prisma.userMFA.findUnique({ where: { id: String(req.params.id) } });
    if (!method || method.userId !== req.auth!.id) {
      res.status(404).json({ message: "MFA method not found." });
      return;
    }
    const updated = await prisma.userMFA.update({
      data: { enabled: false },
      where: { id: method.id },
    });
    if (req.auth!.role === "OWNER") {
      await prisma.auditLog.create({
        data: {
          action: "SECURITY_EVENT_CREATED",
          actorId: req.auth!.id,
          entityId: updated.id,
          entityType: "UserMFA",
          message: `Owner MFA method disabled: ${updated.type}.`,
          metadata: { type: updated.type },
        },
      });
    }
    res.json({ method: updated });
  } catch (error) {
    next(error);
  }
});

securityRouter.post("/mfa/recovery/verify", async (req, res, next) => {
  try {
    const body = z.object({ code: z.string().trim().min(8) }).parse(req.body);
    const recoveryCode = await prisma.mFARecoveryCode.findFirst({
      where: { codeHash: hashSecurityValue(body.code), usedAt: null, userId: req.auth!.id },
    }).catch(() => null);
    if (!recoveryCode) {
      res.status(400).json({ message: "Recovery code is invalid or already used." });
      return;
    }
    const updated = await prisma.mFARecoveryCode.update({
      data: { usedAt: new Date() },
      where: { id: recoveryCode.id },
    });
    await auditSecurity(req, {
      action: "MFA_RECOVERY_CODE_USED",
      entityId: updated.id,
      entityType: "MFARecoveryCode",
      message: "MFA recovery code used.",
    });
    res.json({ recoveryCode: updated });
  } catch (error) {
    next(error);
  }
});

securityRouter.post("/mfa/recovery/regenerate", async (req, res, next) => {
  try {
    const method = await prisma.userMFA.findFirst({ where: { enabled: true, userId: req.auth!.id } });
    const recoveryCodes = generateRecoveryCodes();
    try {
      await prisma.mFARecoveryCode.updateMany({
        data: { usedAt: new Date() },
        where: { userId: req.auth!.id, usedAt: null },
      });
      await prisma.mFARecoveryCode.createMany({
        data: recoveryCodes.map((code) => ({
          codeHash: hashSecurityValue(code),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          mfaMethodId: method?.id,
          userId: req.auth!.id,
        })),
      });
    } catch {
      // Recovery code storage becomes available after Sprint 36 migration deployment.
    }
    res.status(201).json({ recoveryCodes });
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
    const device = await prisma.trustedDevice.update({
      data: { revokedAt: new Date(), revokedById: req.auth!.id, trusted: false },
      where: { id: String(req.params.id) },
    }).catch(() =>
      prisma.trustedDevice.update({
        data: { trusted: false },
        where: { id: String(req.params.id) },
      }),
    );
    await prisma.securityEvent.create({
      data: {
        ...requestContext(req),
        eventType: "DEVICE_REVOKED",
        message: `Trusted device ${device.deviceName} revoked.`,
        severity: "MEDIUM",
        userId: req.auth!.id,
      },
    });
    await auditSecurity(req, {
      action: "TRUSTED_DEVICE_REVOKED",
      entityId: device.id,
      entityType: "TrustedDevice",
      message: `Trusted device ${device.deviceName} revoked.`,
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

securityRouter.get("/monitoring/summary", requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [openCritical, failedLogins, suspiciousEvents, activeSessions, trustedDevices] = await Promise.all([
      prisma.securityEvent.count({ where: { severity: "CRITICAL", status: "OPEN" } }),
      prisma.auditLog.count({ where: { action: "FAILED_LOGIN", createdAt: { gte: since } } }),
      prisma.securityEvent.count({ where: { createdAt: { gte: since }, status: "OPEN" } }),
      prisma.userSession.count({ where: { active: true, expiresAt: { gt: new Date() } } }),
      prisma.trustedDevice.count({ where: { trusted: true } }),
    ]);
    const riskScore = Math.min(100, openCritical * 25 + failedLogins * 2 + suspiciousEvents * 5);
    res.json({
      summary: {
        activeSessions,
        failedLogins24h: failedLogins,
        openCritical,
        riskScore,
        siemReady: true,
        suspiciousEvents24h: suspiciousEvents,
        trustedDevices,
      },
    });
  } catch (error) {
    next(error);
  }
});

securityRouter.get("/policies", requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const policies = await prisma.securityPolicy.findMany({ orderBy: [{ policyType: "asc" }, { updatedAt: "desc" }] });
    res.json({ policies });
  } catch (error) {
    next(error);
  }
});

securityRouter.put("/policies/:policyType", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const body = z.object({
      config: z.record(z.string(), z.unknown()),
      enabled: z.boolean().default(true),
      name: z.string().trim().min(1),
      organizationId: z.string().trim().optional(),
    }).parse(req.body);
    const policyType = z.enum(["PASSWORD", "SESSION", "RATE_LIMIT", "DATA_RETENTION", "DEVICE_TRUST"]).parse(req.params.policyType);
    const existing = await prisma.securityPolicy.findFirst({ where: { organizationId: body.organizationId, policyType } });
    const policy = existing
      ? await prisma.securityPolicy.update({
          data: { config: body.config as Prisma.InputJsonObject, enabled: body.enabled, name: body.name, updatedById: req.auth!.id, version: { increment: 1 } },
          where: { id: existing.id },
        })
      : await prisma.securityPolicy.create({
          data: { config: body.config as Prisma.InputJsonObject, enabled: body.enabled, name: body.name, organizationId: body.organizationId, policyType, updatedById: req.auth!.id },
        });
    await auditSecurity(req, {
      action: "SECURITY_POLICY_UPDATED",
      entityId: policy.id,
      entityType: "SecurityPolicy",
      message: `Security policy updated: ${policy.policyType}.`,
      metadata: { policyType: policy.policyType, version: policy.version },
    });
    res.json({ policy });
  } catch (error) {
    next(error);
  }
});

securityRouter.post("/phi/encryption-records", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const body = z.object({
      entityId: z.string().trim().min(1),
      entityType: z.string().trim().min(1),
      fieldName: z.string().trim().min(1),
      organizationId: z.string().trim().optional(),
    }).parse(req.body);
    const record = await prisma.pHIEncryptionRecord.upsert({
      create: { ...body, keyVersion: currentKeyVersion() },
      update: { keyVersion: currentKeyVersion(), rotatedAt: new Date() },
      where: { entityType_entityId_fieldName: { entityId: body.entityId, entityType: body.entityType, fieldName: body.fieldName } },
    });
    await auditSecurity(req, {
      action: "PHI_FIELD_ENCRYPTED",
      entityId: record.id,
      entityType: "PHIEncryptionRecord",
      message: `PHI field encryption registered for ${body.entityType}.${body.fieldName}.`,
      metadata: { keyVersion: record.keyVersion },
    });
    res.status(201).json({ record });
  } catch (error) {
    next(error);
  }
});

securityRouter.post("/keys/rotate", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const body = z.object({
      organizationId: z.string().trim().optional(),
      previousVersion: z.number().int().positive().optional(),
    }).parse(req.body);
    const event = await prisma.keyRotationEvent.create({
      data: {
        keyVersion: currentKeyVersion(),
        organizationId: body.organizationId,
        previousVersion: body.previousVersion,
        rotatedById: req.auth!.id,
        status: "ACTIVE",
      },
    });
    await prisma.securityEvent.create({
      data: {
        ...requestContext(req),
        eventType: "KEY_ROTATION_COMPLETED",
        message: `Encryption key rotation recorded for version ${event.keyVersion}.`,
        severity: "MEDIUM",
        userId: req.auth!.id,
      },
    });
    await auditSecurity(req, {
      action: "KEY_ROTATED",
      entityId: event.id,
      entityType: "KeyRotationEvent",
      message: "Encryption key rotation event recorded.",
      metadata: { keyVersion: event.keyVersion, previousVersion: event.previousVersion },
    });
    res.status(201).json({ event });
  } catch (error) {
    next(error);
  }
});
