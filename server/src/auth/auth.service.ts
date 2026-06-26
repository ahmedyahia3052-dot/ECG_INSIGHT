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
const CAPTCHA_FAILED_ATTEMPTS = 3;

function assertPasswordPolicy(password: string) {
  const strongEnough =
    password.length >= 12 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
  if (!strongEnough) {
    throw new AppError(
      400,
      "Password must be at least 12 characters and include upper, lower, number, and symbol characters.",
      "PASSWORD_WEAK",
    );
  }
}

async function assertPasswordNotReused(userId: string, password: string) {
  const recentPasswords = await prisma.passwordHistory.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    where: { userId },
  });
  for (const historicalPassword of recentPasswords) {
    if (await verifyPassword(password, historicalPassword.passwordHash)) {
      throw new AppError(400, "Password was used recently. Choose a different password.", "PASSWORD_REUSED");
    }
  }
}

export async function setupOwnerPassword(body: { email: string; newPassword: string; username: string }) {
  assertPasswordPolicy(body.newPassword);
  const owner = await prisma.user.findFirst({
    where: {
      email: body.email.trim().toLowerCase(),
      protectedOwner: true,
      role: "OWNER",
      username: body.username.trim(),
    },
  });
  if (!owner || !owner.ownerPasswordSetupRequired) {
    throw new AppError(403, "Owner password setup is not available.", "OWNER_SETUP_FORBIDDEN");
  }
  await prisma.user.update({
    data: {
      forcePasswordReset: false,
      ownerPasswordSetupRequired: false,
      passwordChangedAt: new Date(),
      passwordHash: await hashPassword(body.newPassword),
    },
    where: { id: owner.id },
  });
  await prisma.passwordHistory.create({
    data: {
      expiresAt: new Date(Date.now() + PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000),
      passwordHash: await hashPassword(body.newPassword),
      userId: owner.id,
    },
  });
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

function normalizePhone(phoneNumber: string) {
  return phoneNumber.replace(/[^\d+]/g, "");
}

function phoneEmail(phoneNumber: string) {
  return `${normalizePhone(phoneNumber).replace(/\+/g, "")}@phone.ecginsight.local`;
}

function randomOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
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
      deviceName: req.get("sec-ch-ua-platform") ?? undefined,
      expiresAt,
      ipAddress: req.ip,
      lastActivityAt: new Date(),
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
  actorRole?: "OWNER" | "SUPER_ADMIN" | "ADMIN" | "DOCTOR" | "CORPORATE_CLIENT" | "USER" | "STUDENT";
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
    email?: string;
    institution?: string;
    name: string;
    password?: string;
    phoneNumber?: string;
    role: "corporate_client" | "doctor" | "student" | "user";
    specialization?: string;
  },
  req: Request,
  res: Response,
) {
  if (body.email) assertPasswordPolicy(body.password ?? "");
  const phoneNumber = body.phoneNumber ? normalizePhone(body.phoneNumber) : undefined;
  const email = body.email?.trim().toLowerCase() ?? (phoneNumber ? phoneEmail(phoneNumber) : "");
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
      passwordHash: await hashPassword(body.password ?? createOpaqueToken(48)),
      phoneNumber,
      role: fromApiRole(body.role),
      specialization: body.specialization,
      subscription: {
        create: {
          tier: "FREE",
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
      await prisma.auditLog.create({
        data: {
          action: "FAILED_LOGIN",
          actorId: user.id,
          ipAddress: req.ip,
          message: "Failed login attempt.",
          metadata: { failedLoginAttempts, locked: Boolean(lockedUntil) },
          userAgent: req.get("user-agent"),
        },
      });
    }
    const error = new AppError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
    if (user && user.failedLoginAttempts + 1 >= CAPTCHA_FAILED_ATTEMPTS) {
      (error as AppError & { details?: Record<string, unknown> }).details = { captchaRequired: true };
    }
    throw error;
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

export async function requestPhoneOtp(body: { name?: string; phoneNumber: string; purpose: "LOGIN" | "REGISTER" }) {
  const phoneNumber = normalizePhone(body.phoneNumber);
  let user = await prisma.user.findUnique({ where: { phoneNumber } });
  if (!user && body.purpose === "REGISTER") {
    user = await prisma.user.create({
      data: {
        avatarInitials: initialsForName(body.name ?? phoneNumber),
        email: phoneEmail(phoneNumber),
        name: body.name ?? `Phone User ${phoneNumber.slice(-4)}`,
        passwordHash: await hashPassword(createOpaqueToken(48)),
        phoneNumber,
        role: "USER",
        subscription: { create: { status: "ACTIVE", tier: "FREE" } },
      },
    });
  }
  if (!user) {
    throw new AppError(404, "Phone number is not registered.", "PHONE_NOT_REGISTERED");
  }
  const otp = randomOtp();
  const record = await prisma.phoneOtp.create({
    data: {
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      otpHash: hashToken(otp),
      phoneNumber,
      purpose: body.purpose,
      userId: user.id,
    },
  });
  return { otp, otpId: record.id };
}

export async function verifyPhoneOtp(body: { otp: string; phoneNumber: string; rememberMe: boolean }, req: Request, res: Response) {
  const phoneNumber = normalizePhone(body.phoneNumber);
  const otp = await prisma.phoneOtp.findFirst({
    orderBy: { createdAt: "desc" },
    where: { consumedAt: null, expiresAt: { gt: new Date() }, phoneNumber },
  });
  if (!otp || otp.otpHash !== hashToken(body.otp)) {
    if (otp) await prisma.phoneOtp.update({ data: { attempts: otp.attempts + 1 }, where: { id: otp.id } });
    throw new AppError(400, "Phone OTP is invalid or expired.", "PHONE_OTP_INVALID");
  }
  const user = await prisma.user.findUnique({ where: { id: otp.userId ?? "" }, include: { subscription: true } });
  if (!user) throw new AppError(404, "User not found.", "USER_NOT_FOUND");
  await prisma.phoneOtp.update({ data: { consumedAt: new Date() }, where: { id: otp.id } });
  await prisma.user.update({ data: { phoneVerified: true }, where: { id: user.id } });
  return issueAuthResponse({ rememberMe: body.rememberMe, req, res, userId: user.id });
}

export async function oauthLogin(
  body: { email?: string; name?: string; provider: "GOOGLE" | "APPLE" | "MICROSOFT"; providerUserId: string; rememberMe: boolean },
  req: Request,
  res: Response,
) {
  const existingIdentity = await prisma.oAuthIdentity.findUnique({
    include: { user: true },
    where: { provider_providerUserId: { provider: body.provider, providerUserId: body.providerUserId } },
  });
  if (existingIdentity) {
    return issueAuthResponse({ rememberMe: body.rememberMe, req, res, userId: existingIdentity.userId });
  }
  const email = body.email?.trim().toLowerCase() ?? `${body.provider.toLowerCase()}-${body.providerUserId}@oauth.ecginsight.local`;
  const user = await prisma.user.upsert({
    create: {
      avatarInitials: initialsForName(body.name ?? email),
      email,
      emailVerified: Boolean(body.email),
      name: body.name ?? email.split("@")[0] ?? "OAuth User",
      passwordHash: await hashPassword(createOpaqueToken(48)),
      role: "USER",
      subscription: { create: { status: "ACTIVE", tier: "FREE" } },
    },
    update: {},
    where: { email },
  });
  await prisma.oAuthIdentity.create({
    data: { email: body.email, provider: body.provider, providerUserId: body.providerUserId, userId: user.id },
  });
  return issueAuthResponse({ rememberMe: body.rememberMe, req, res, userId: user.id });
}

export async function resendVerificationEmail(emailInput: string) {
  const email = emailInput.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { emailVerificationToken: undefined };
  const emailVerificationToken = createOpaqueToken(32);
  await prisma.user.update({
    data: {
      emailVerificationExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      emailVerificationTokenHash: hashToken(emailVerificationToken),
    },
    where: { id: user.id },
  });
  return { emailVerificationToken };
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

export async function logoutAllSessions(userId: string, res: Response) {
  await prisma.session.updateMany({ data: { revokedAt: new Date() }, where: { userId, revokedAt: null } });
  await prisma.userSession.updateMany({ data: { active: false, revokedAt: new Date() }, where: { userId, active: true } });
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
  await assertPasswordNotReused(user.id, body.newPassword);

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

export async function changeOwnPassword(userId: string, body: { currentPassword: string; newPassword: string }) {
  assertPasswordPolicy(body.newPassword);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await verifyPassword(body.currentPassword, user.passwordHash))) {
    throw new AppError(400, "Current password is incorrect.", "CURRENT_PASSWORD_INVALID");
  }
  await assertPasswordNotReused(userId, body.newPassword);
  await prisma.user.update({
    data: {
      forcePasswordReset: false,
      passwordChangedAt: new Date(),
      passwordHash: await hashPassword(body.newPassword),
      sessions: { updateMany: { data: { revokedAt: new Date() }, where: { revokedAt: null } } },
    },
    where: { id: userId },
  });
  const updated = await prisma.user.findUnique({ where: { id: userId } });
  if (updated) {
    await prisma.passwordHistory.create({
      data: {
        expiresAt: new Date(Date.now() + PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000),
        passwordHash: updated.passwordHash,
        userId,
      },
    });
  }
}
