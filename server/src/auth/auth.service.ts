import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { env, isProduction } from "../config/env";
import { AppError } from "../middleware/error";
import {
  createOpaqueToken,
  hashPassword,
  hashToken,
  initialsForName,
  verifyPassword,
} from "../utils/crypto";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { fromApiRole, serializeUser } from "../utils/users";

const REFRESH_COOKIE = "ecg_refresh_token";
const NORMAL_SESSION_SECONDS = 60 * 60 * 24;
const REMEMBER_SESSION_SECONDS = 60 * 60 * 24 * 30;
const TOKEN_VERSION = 1;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const PASSWORD_MAX_AGE_DAYS = 90;
const MAX_CONCURRENT_SESSIONS = 5;

function assertPasswordPolicy(password: string) {
  const strongEnough =
    password.length >= 10 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
  if (!strongEnough) {
    throw new AppError(
      400,
      "Password must be at least 10 characters and include upper, lower, number, and symbol characters.",
      "PASSWORD_WEAK",
    );
  }
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
}

function cookieOptions(maxAgeSeconds?: number) {
  return {
    domain: env.COOKIE_DOMAIN,
    httpOnly: true,
    maxAge: maxAgeSeconds ? maxAgeSeconds * 1000 : undefined,
    path: "/",
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    secure: isProduction,
  };
}

function setRefreshCookie(res: Response, token: string, maxAgeSeconds: number) {
  res.cookie(REFRESH_COOKIE, token, cookieOptions(maxAgeSeconds));
}

function sessionMeta(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined,
  };
}

async function createSession(userId: string, rememberMe: boolean, req: Request, res: Response) {
  const expiresInSeconds = rememberMe ? REMEMBER_SESSION_SECONDS : NORMAL_SESSION_SECONDS;
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  const session = await prisma.session.create({
    data: {
      expiresAt,
      refreshTokenHash: "pending",
      rememberMe,
      userId,
      ...sessionMeta(req),
    },
  });

  const refreshToken = signRefreshToken({
    expiresInSeconds,
    sessionId: session.id,
    tokenVersion: TOKEN_VERSION,
    userId,
  });

  await prisma.session.update({
    data: { refreshTokenHash: hashToken(refreshToken) },
    where: { id: session.id },
  });
  await prisma.userSession.create({
    data: {
      active: true,
      expiresAt,
      ipAddress: req.ip,
      sessionId: session.id,
      userAgent: req.get("user-agent"),
      userId,
    },
  });
  const staleSessions = await prisma.userSession.findMany({
    orderBy: { lastActivityAt: "desc" },
    skip: MAX_CONCURRENT_SESSIONS,
    where: { active: true, userId },
  });
  if (staleSessions.length) {
    await prisma.userSession.updateMany({
      data: { active: false, revokedAt: new Date() },
      where: { id: { in: staleSessions.map((sessionRecord) => sessionRecord.id) } },
    });
  }

  setRefreshCookie(res, refreshToken, expiresInSeconds);
  return session;
}

export async function issueAuthResponse(input: {
  actorId?: string;
  actorRole?: "SUPER_ADMIN" | "ADMIN" | "DOCTOR" | "STUDENT";
  req: Request;
  res: Response;
  rememberMe: boolean;
  userId: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    include: { subscription: true },
  });
  if (!user || !user.isActive) {
    throw new AppError(403, "User account is inactive or unavailable.", "USER_INACTIVE");
  }

  const session = await createSession(user.id, input.rememberMe, input.req, input.res);
  const accessToken = signAccessToken({
    actorId: input.actorId,
    actorRole: input.actorRole,
    role: user.role,
    sessionId: session.id,
    userId: user.id,
  });

  return {
    accessToken,
    user: serializeUser(user),
  };
}

export async function registerUser(
  body: {
    email: string;
    institution?: string;
    name: string;
    password: string;
    role: "doctor" | "student";
    specialization?: string;
  },
  req: Request,
  res: Response,
) {
  assertPasswordPolicy(body.password);
  const email = body.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, "An account with this email already exists.", "EMAIL_EXISTS");
  }

  const emailToken = createOpaqueToken(32);
  const user = await prisma.user.create({
    data: {
      avatarInitials: initialsForName(body.name),
      email,
      emailVerificationExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      emailVerificationTokenHash: hashToken(emailToken),
      institution: body.institution,
      name: body.name,
      passwordHash: await hashPassword(body.password),
      role: fromApiRole(body.role),
      specialization: body.specialization,
      subscription: {
        create: {
          tier: body.role === "doctor" ? "PROFESSIONAL" : "FREE",
          status: "ACTIVE",
        },
      },
    },
    include: { subscription: true },
  });
  await prisma.passwordHistory.create({
    data: {
      expiresAt: new Date(Date.now() + PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000),
      passwordHash: user.passwordHash,
      userId: user.id,
    },
  });

  const session = await createSession(user.id, true, req, res);
  return {
    accessToken: signAccessToken({
      role: user.role,
      sessionId: session.id,
      userId: user.id,
    }),
    emailVerificationToken: emailToken,
    user: serializeUser(user),
  };
}

export async function loginUser(
  body: { email: string; password: string; rememberMe: boolean },
  req: Request,
  res: Response,
) {
  const user = await prisma.user.findUnique({
    where: { email: body.email.trim().toLowerCase() },
    include: { subscription: true },
  });
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(423, "Account is temporarily locked after failed login attempts.", "ACCOUNT_LOCKED");
  }
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    if (user) {
      const failedLoginAttempts = user.failedLoginAttempts + 1;
      const lockedUntil =
        failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await prisma.user.update({
        data: { failedLoginAttempts, lockedUntil },
        where: { id: user.id },
      });
      if (lockedUntil) {
        await prisma.securityEvent.create({
          data: {
            eventType: "MULTIPLE_FAILED_LOGINS",
            ipAddress: req.ip,
            message: "Account locked after repeated failed login attempts.",
            severity: "HIGH",
            userAgent: req.get("user-agent"),
            userId: user.id,
          },
        });
      }
    }
    throw new AppError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
  }
  if (!user.isActive) {
    throw new AppError(403, "User account is deactivated.", "USER_INACTIVE");
  }
  if (user.forcePasswordReset) {
    throw new AppError(403, "Password reset is required before login.", "PASSWORD_RESET_REQUIRED");
  }
  if (user.passwordChangedAt < new Date(Date.now() - PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000)) {
    await prisma.user.update({ data: { forcePasswordReset: true }, where: { id: user.id } });
    throw new AppError(403, "Password has expired and must be reset.", "PASSWORD_EXPIRED");
  }
  await prisma.user.update({
    data: { failedLoginAttempts: 0, lockedUntil: null },
    where: { id: user.id },
  });
  await prisma.auditLog.create({
    data: {
      action: "LOGIN",
      actorId: user.id,
      ipAddress: req.ip,
      message: "User logged in.",
      userAgent: req.get("user-agent"),
    },
  });

  const session = await createSession(user.id, body.rememberMe, req, res);
  return {
    accessToken: signAccessToken({
      role: user.role,
      sessionId: session.id,
      userId: user.id,
    }),
    user: serializeUser(user),
  };
}

export async function refreshSession(req: Request, res: Response) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (!refreshToken || typeof refreshToken !== "string") {
    throw new AppError(401, "Refresh token is missing.", "REFRESH_MISSING");
  }

  const claims = verifyRefreshToken(refreshToken);
  const session = await prisma.session.findUnique({
    where: { id: claims.sessionId },
    include: { user: { include: { subscription: true } } },
  });

  if (!session || session.expiresAt <= new Date() || session.revokedAt) {
    clearRefreshCookie(res);
    throw new AppError(401, "Refresh session is invalid.", "REFRESH_INVALID");
  }

  if (session.refreshTokenHash !== hashToken(refreshToken)) {
    await prisma.session.update({
      data: { revokedAt: new Date() },
      where: { id: session.id },
    });
    clearRefreshCookie(res);
    throw new AppError(401, "Refresh token reuse detected.", "REFRESH_REUSE");
  }

  if (!session.user.isActive) {
    clearRefreshCookie(res);
    throw new AppError(403, "User account is deactivated.", "USER_INACTIVE");
  }

  const expiresInSeconds = session.rememberMe ? REMEMBER_SESSION_SECONDS : NORMAL_SESSION_SECONDS;
  const nextRefreshToken = signRefreshToken({
    expiresInSeconds,
    sessionId: session.id,
    tokenVersion: TOKEN_VERSION,
    userId: session.userId,
  });

  await prisma.session.update({
    data: {
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
      refreshTokenHash: hashToken(nextRefreshToken),
      ...sessionMeta(req),
    },
    where: { id: session.id },
  });
  setRefreshCookie(res, nextRefreshToken, expiresInSeconds);

  return {
    accessToken: signAccessToken({
      role: session.user.role,
      sessionId: session.id,
      userId: session.user.id,
    }),
    user: serializeUser(session.user),
  };
}

export async function logoutSession(req: Request, res: Response) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (typeof refreshToken === "string") {
    try {
      const claims = verifyRefreshToken(refreshToken);
      await prisma.session.updateMany({
        data: { revokedAt: new Date() },
        where: { id: claims.sessionId },
      });
      await prisma.userSession.updateMany({
        data: { active: false, revokedAt: new Date() },
        where: { sessionId: claims.sessionId },
      });
      await prisma.auditLog.create({
        data: {
          action: "LOGOUT",
          actorId: claims.sub,
          ipAddress: req.ip,
          message: "User logged out.",
          userAgent: req.get("user-agent"),
        },
      });
    } catch {
      // Invalid refresh cookies are cleared below.
    }
  }
  clearRefreshCookie(res);
}

export async function requestPasswordReset(emailInput: string) {
  const email = emailInput.trim().toLowerCase();
  const resetToken = createOpaqueToken(32);
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.user.update({
      data: {
        passwordResetExpiresAt: new Date(Date.now() + 1000 * 60 * 30),
        passwordResetTokenHash: hashToken(resetToken),
      },
      where: { id: user.id },
    });
  }

  return { resetToken: user ? resetToken : undefined };
}

export async function resetPassword(body: {
  email: string;
  newPassword: string;
  token: string;
}) {
  assertPasswordPolicy(body.newPassword);
  const user = await prisma.user.findUnique({
    where: { email: body.email.trim().toLowerCase() },
  });

  if (
    !user ||
    !user.passwordResetTokenHash ||
    !user.passwordResetExpiresAt ||
    user.passwordResetExpiresAt <= new Date() ||
    user.passwordResetTokenHash !== hashToken(body.token)
  ) {
    throw new AppError(400, "Password reset token is invalid or expired.", "RESET_INVALID");
  }

  await prisma.user.update({
    data: {
      failedLoginAttempts: 0,
      forcePasswordReset: false,
      lockedUntil: null,
      passwordChangedAt: new Date(),
      passwordHash: await hashPassword(body.newPassword),
      passwordResetExpiresAt: null,
      passwordResetTokenHash: null,
      sessions: {
        updateMany: {
          data: { revokedAt: new Date() },
          where: { revokedAt: null },
        },
      },
    },
    where: { id: user.id },
  });
  const updated = await prisma.user.findUnique({ where: { id: user.id } });
  if (updated) {
    await prisma.passwordHistory.create({
      data: {
        expiresAt: new Date(Date.now() + PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000),
        passwordHash: updated.passwordHash,
        userId: updated.id,
      },
    });
  }
}

export async function verifyEmail(body: { email: string; token: string }) {
  const user = await prisma.user.findUnique({
    where: { email: body.email.trim().toLowerCase() },
  });

  if (
    !user ||
    !user.emailVerificationTokenHash ||
    !user.emailVerificationExpiresAt ||
    user.emailVerificationExpiresAt <= new Date() ||
    user.emailVerificationTokenHash !== hashToken(body.token)
  ) {
    throw new AppError(400, "Email verification token is invalid or expired.", "VERIFY_INVALID");
  }

  await prisma.user.update({
    data: {
      emailVerificationExpiresAt: null,
      emailVerificationTokenHash: null,
      emailVerified: true,
    },
    where: { id: user.id },
  });
}
