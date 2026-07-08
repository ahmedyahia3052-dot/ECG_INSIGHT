import type { Prisma, Session } from "@prisma/client";
import { prisma } from "../../../config/prisma";

export type SessionWithUser = Prisma.SessionGetPayload<{
  include: { user: { include: { organization: true; subscription: true } } };
}>;

export class SessionRepository {
  findById(sessionId: string) {
    return prisma.session.findUnique({
      include: { user: { include: { organization: true, subscription: true } } },
      where: { id: sessionId },
    });
  }

  createPending(input: {
    expiresAt: Date;
    ipAddress?: string;
    rememberMe: boolean;
    tokenVersion?: number;
    userAgent?: string;
    userId: string;
  }) {
    return prisma.session.create({
      data: {
        expiresAt: input.expiresAt,
        ipAddress: input.ipAddress,
        refreshTokenHash: "pending",
        rememberMe: input.rememberMe,
        tokenVersion: input.tokenVersion ?? 1,
        userAgent: input.userAgent,
        userId: input.userId,
      },
    });
  }

  attachRefreshHash(sessionId: string, refreshTokenHash: string) {
    return prisma.session.update({
      data: { refreshTokenHash },
      where: { id: sessionId },
    });
  }

  rotateSession(input: {
    expiresAt: Date;
    ipAddress?: string;
    newRefreshTokenHash: string;
    rememberMe: boolean;
    replacedSessionId: string;
    tokenVersion: number;
    userAgent?: string;
    userId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const nextSession = await tx.session.create({
        data: {
          expiresAt: input.expiresAt,
          ipAddress: input.ipAddress,
          refreshTokenHash: input.newRefreshTokenHash,
          rememberMe: input.rememberMe,
          tokenVersion: input.tokenVersion,
          userAgent: input.userAgent,
          userId: input.userId,
        },
      });

      await tx.session.update({
        data: { replacedById: nextSession.id, revokedAt: new Date() },
        where: { id: input.replacedSessionId },
      });

      await tx.userSession.updateMany({
        data: { active: false, revokedAt: new Date() },
        where: { sessionId: input.replacedSessionId },
      });

      return nextSession;
    });
  }

  updateActiveSession(
    sessionId: string,
    data: Pick<Session, "expiresAt" | "refreshTokenHash" | "tokenVersion"> & {
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    return prisma.session.update({
      data: {
        expiresAt: data.expiresAt,
        ipAddress: data.ipAddress,
        refreshTokenHash: data.refreshTokenHash,
        tokenVersion: data.tokenVersion,
        userAgent: data.userAgent,
      },
      where: { id: sessionId },
    });
  }

  revoke(sessionId: string) {
    return prisma.$transaction([
      prisma.session.update({
        data: { revokedAt: new Date() },
        where: { id: sessionId },
      }),
      prisma.userSession.updateMany({
        data: { active: false, revokedAt: new Date() },
        where: { sessionId },
      }),
    ]);
  }

  revokeAllForUser(userId: string) {
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

  registerEnterpriseSession(input: {
    deviceName?: string;
    expiresAt: Date;
    ipAddress?: string;
    sessionId: string;
    userAgent?: string;
    userId: string;
  }) {
    return prisma.userSession.create({
      data: {
        active: true,
        deviceName: input.deviceName,
        expiresAt: input.expiresAt,
        ipAddress: input.ipAddress,
        lastActivityAt: new Date(),
        sessionId: input.sessionId,
        userAgent: input.userAgent,
        userId: input.userId,
      },
    });
  }

  trimConcurrentSessions(userId: string, maxSessions: number) {
    return prisma.userSession.findMany({
      orderBy: { lastActivityAt: "desc" },
      skip: maxSessions,
      where: { active: true, userId },
    });
  }

  deactivateSessions(sessionIds: string[]) {
    if (!sessionIds.length) return Promise.resolve({ count: 0 });
    return prisma.userSession.updateMany({
      data: { active: false, revokedAt: new Date() },
      where: { id: { in: sessionIds } },
    });
  }
}

export const sessionRepository = new SessionRepository();
