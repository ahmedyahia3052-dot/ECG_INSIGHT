import type { Prisma, Role, User } from "@prisma/client";
import { prisma } from "../../../config/prisma";

export type UserWithAuthRelations = Prisma.UserGetPayload<{
  include: { organization: true; subscription: true };
}>;

export class UserAuthRepository {
  findByEmail(email: string) {
    return prisma.user.findUnique({
      include: { organization: true, subscription: true },
      where: { email: email.trim().toLowerCase() },
    });
  }

  findById(userId: string) {
    return prisma.user.findUnique({
      include: { organization: true, subscription: true },
      where: { id: userId },
    });
  }

  findByPhone(phoneNumber: string) {
    return prisma.user.findUnique({
      include: { organization: true, subscription: true },
      where: { phoneNumber },
    });
  }

  update(userId: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      data,
      include: { organization: true, subscription: true },
      where: { id: userId },
    });
  }

  create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
      include: { organization: true, subscription: true },
    });
  }

  createInTransaction(tx: Prisma.TransactionClient, data: Prisma.UserCreateInput) {
    return tx.user.create({
      data,
      include: { organization: true, subscription: true },
    });
  }

  recordFailedLogin(user: User, reqMeta: { ipAddress?: string; userAgent?: string; deviceId?: string }) {
    const failedLoginAttempts = user.failedLoginAttempts + 1;
    const lockedUntil =
      failedLoginAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    return prisma.$transaction([
      prisma.user.update({
        data: { failedLoginAttempts, lockedUntil },
        where: { id: user.id },
      }),
      prisma.auditLog.create({
        data: {
          action: "FAILED_LOGIN",
          actorId: user.id,
          ipAddress: reqMeta.ipAddress,
          message: "Failed login attempt.",
          metadata: { failedLoginAttempts, locked: Boolean(lockedUntil) },
          userAgent: reqMeta.userAgent,
        },
      }),
      prisma.loginHistory.create({
        data: {
          deviceId: reqMeta.deviceId,
          failureReason: "INVALID_CREDENTIALS",
          ipAddress: reqMeta.ipAddress,
          organizationId: user.organizationId ?? undefined,
          success: false,
          userAgent: reqMeta.userAgent,
          userId: user.id,
        },
      }),
      ...(lockedUntil
        ? [
            prisma.securityEvent.create({
              data: {
                eventType: "MULTIPLE_FAILED_LOGINS",
                ipAddress: reqMeta.ipAddress,
                message: "Account locked after repeated failed login attempts.",
                severity: "HIGH",
                userAgent: reqMeta.userAgent,
                userId: user.id,
              },
            }),
          ]
        : []),
    ]);
  }

  clearLoginFailures(userId: string) {
    return prisma.user.update({
      data: { failedLoginAttempts: 0, lockedUntil: null },
      where: { id: userId },
    });
  }

  setEmailVerificationToken(userId: string, tokenHash: string, expiresAt: Date) {
    return prisma.user.update({
      data: { emailVerificationExpiresAt: expiresAt, emailVerificationTokenHash: tokenHash },
      where: { id: userId },
    });
  }

  setPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    return prisma.user.update({
      data: { passwordResetExpiresAt: expiresAt, passwordResetTokenHash: tokenHash },
      where: { id: userId },
    });
  }

  clearPasswordResetToken(userId: string) {
    return prisma.user.update({
      data: { passwordResetExpiresAt: null, passwordResetTokenHash: null },
      where: { id: userId },
    });
  }

  markEmailVerified(userId: string) {
    return prisma.user.update({
      data: {
        emailVerificationExpiresAt: null,
        emailVerificationTokenHash: null,
        emailVerified: true,
      },
      where: { id: userId },
    });
  }

  revokeAllSessions(userId: string) {
    return prisma.$transaction([
      prisma.session.updateMany({
        data: { revokedAt: new Date() },
        where: { revokedAt: null, userId },
      }),
      prisma.userSession.updateMany({
        data: { active: false, revokedAt: new Date() },
        where: { active: true, userId },
      }),
    ]);
  }

  recordPasswordHistory(userId: string, passwordHash: string, expiresAt: Date) {
    return prisma.passwordHistory.create({
      data: { expiresAt, passwordHash, userId },
    });
  }

  recentPasswordHashes(userId: string, take = 5) {
    return prisma.passwordHistory.findMany({
      orderBy: { createdAt: "desc" },
      take,
      where: { userId },
    });
  }

  async recordLogin(
    userId: string,
    reqMeta: { ipAddress?: string; userAgent?: string; deviceId?: string; organizationId?: string | null },
  ) {
    await prisma.$transaction([
      prisma.auditLog.create({
        data: {
          action: "LOGIN",
          actorId: userId,
          ipAddress: reqMeta.ipAddress,
          message: "User logged in.",
          userAgent: reqMeta.userAgent,
        },
      }),
      prisma.loginHistory.create({
        data: {
          deviceId: reqMeta.deviceId,
          ipAddress: reqMeta.ipAddress,
          organizationId: reqMeta.organizationId ?? undefined,
          success: true,
          userAgent: reqMeta.userAgent,
          userId,
        },
      }),
    ]);
  }

  listLoginHistory(userId: string, take = 50) {
    return prisma.loginHistory.findMany({
      orderBy: { createdAt: "desc" },
      take,
      where: { userId },
    });
  }

  recordLogout(userId: string, reqMeta: { ipAddress?: string; userAgent?: string }) {
    return prisma.auditLog.create({
      data: {
        action: "LOGOUT",
        actorId: userId,
        ipAddress: reqMeta.ipAddress,
        message: "User logged out.",
        userAgent: reqMeta.userAgent,
      },
    });
  }
}

export const userAuthRepository = new UserAuthRepository();
