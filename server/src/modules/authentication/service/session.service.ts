import type { Request, Response } from "express";
import type { Role } from "@prisma/client";
import { AppError } from "../../../middleware/error";
import { hashToken } from "../../../utils/crypto";
import { serializeUser } from "../../../utils/users";
import {
  INITIAL_TOKEN_VERSION,
  MAX_CONCURRENT_SESSIONS,
  NORMAL_SESSION_SECONDS,
  REMEMBER_SESSION_SECONDS,
} from "../domain/constants";
import { sessionRepository } from "../repository/session.repository";
import { userAuthRepository } from "../repository/user-auth.repository";
import {
  clearRefreshCookie,
  deviceNameFromRequest,
  readRefreshCookie,
  sessionRequestMeta,
  setRefreshCookie,
} from "./cookie.service";
import { issueAccessToken, issueRefreshToken, parseRefreshToken } from "./token.service";

function sessionDurationSeconds(rememberMe: boolean) {
  return rememberMe ? REMEMBER_SESSION_SECONDS : NORMAL_SESSION_SECONDS;
}

export async function createAuthenticatedSession(input: {
  actorId?: string;
  actorRole?: Role;
  rememberMe: boolean;
  req: Request;
  res: Response;
  userId: string;
}) {
  const user = await userAuthRepository.findById(input.userId);
  if (!user || !user.isActive) {
    throw new AppError(403, "User account is inactive or unavailable.", "USER_INACTIVE");
  }

  const expiresInSeconds = sessionDurationSeconds(input.rememberMe);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  const meta = sessionRequestMeta(input.req);

  const session = await sessionRepository.createPending({
    expiresAt,
    rememberMe: input.rememberMe,
    tokenVersion: INITIAL_TOKEN_VERSION,
    userId: input.userId,
    ...meta,
  });

  const refreshToken = issueRefreshToken({
    expiresInSeconds,
    sessionId: session.id,
    tokenVersion: INITIAL_TOKEN_VERSION,
    userId: input.userId,
  });

  await sessionRepository.attachRefreshHash(session.id, hashToken(refreshToken));
  await sessionRepository.registerEnterpriseSession({
    deviceName: deviceNameFromRequest(input.req),
    expiresAt,
    sessionId: session.id,
    userId: input.userId,
    ...meta,
  });

  const staleSessions = await sessionRepository.trimConcurrentSessions(input.userId, MAX_CONCURRENT_SESSIONS);
  await sessionRepository.deactivateSessions(staleSessions.map((record) => record.id));

  setRefreshCookie(input.res, refreshToken, expiresInSeconds);

  return {
    accessToken: issueAccessToken({
      actorId: input.actorId,
      actorRole: input.actorRole,
      role: user.role,
      sessionId: session.id,
      userId: user.id,
    }),
    sessionId: session.id,
    user: serializeUser(user),
  };
}

export async function rotateRefreshSession(req: Request, res: Response) {
  const refreshToken = readRefreshCookie(req);
  if (!refreshToken) {
    clearRefreshCookie(res);
    throw new AppError(401, "Refresh token is missing.", "REFRESH_MISSING");
  }

  let claims: ReturnType<typeof parseRefreshToken>;
  try {
    claims = parseRefreshToken(refreshToken);
  } catch {
    clearRefreshCookie(res);
    throw new AppError(401, "Refresh session is invalid.", "REFRESH_INVALID");
  }

  const session = await sessionRepository.findById(claims.sessionId);
  if (!session || session.expiresAt <= new Date() || session.revokedAt) {
    clearRefreshCookie(res);
    throw new AppError(401, "Refresh session is invalid.", "REFRESH_INVALID");
  }

  if (session.refreshTokenHash !== hashToken(refreshToken) || session.tokenVersion !== claims.tokenVersion) {
    await sessionRepository.revokeAllForUser(session.userId);
    clearRefreshCookie(res);
    throw new AppError(401, "Refresh token reuse detected.", "REFRESH_REUSE");
  }

  if (!session.user.isActive) {
    clearRefreshCookie(res);
    throw new AppError(403, "Your account is inactive.", "USER_INACTIVE");
  }

  const expiresInSeconds = sessionDurationSeconds(session.rememberMe);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  const nextTokenVersion = session.tokenVersion + 1;
  const meta = sessionRequestMeta(req);

  const rotatedSession = await sessionRepository.rotateSession({
    expiresAt,
    newRefreshTokenHash: "pending",
    rememberMe: session.rememberMe,
    replacedSessionId: session.id,
    tokenVersion: nextTokenVersion,
    userId: session.userId,
    ...meta,
  });

  const nextRefreshToken = issueRefreshToken({
    expiresInSeconds,
    sessionId: rotatedSession.id,
    tokenVersion: nextTokenVersion,
    userId: session.userId,
  });

  await sessionRepository.attachRefreshHash(rotatedSession.id, hashToken(nextRefreshToken));

  await sessionRepository.registerEnterpriseSession({
    deviceName: deviceNameFromRequest(req),
    expiresAt,
    sessionId: rotatedSession.id,
    userId: session.userId,
    ...meta,
  });

  setRefreshCookie(res, nextRefreshToken, expiresInSeconds);

  return {
    accessToken: issueAccessToken({
      role: session.user.role,
      sessionId: rotatedSession.id,
      userId: session.user.id,
    }),
    user: serializeUser(session.user),
  };
}

export async function logoutCurrentSession(req: Request, res: Response) {
  const refreshToken = readRefreshCookie(req);
  if (refreshToken) {
    try {
      const claims = parseRefreshToken(refreshToken);
      await sessionRepository.revoke(claims.sessionId);
      await userAuthRepository.recordLogout(claims.sub, sessionRequestMeta(req));
    } catch {
      // Invalid cookies are cleared below.
    }
  }
  clearRefreshCookie(res);
}

export async function logoutAllUserSessions(userId: string, res: Response) {
  await sessionRepository.revokeAllForUser(userId);
  clearRefreshCookie(res);
}
