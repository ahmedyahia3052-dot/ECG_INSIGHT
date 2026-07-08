import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma";
import { AppError } from "../../../middleware/error";
import {
  createOpaqueToken,
  hashPassword,
  hashToken,
  initialsForName,
} from "../../../utils/crypto";
import { serializeUser } from "../../../utils/users";
import {
  CAPTCHA_FAILED_ATTEMPTS,
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_MAX_AGE_DAYS,
  PASSWORD_RESET_TTL_MS,
  PHONE_OTP_TTL_MS,
} from "../domain/constants";
import {
  fromAuthenticationApiRole,
  registrationRoleLabel,
  type AuthenticationApiRole,
} from "../domain/roles";
import { userAuthRepository } from "../repository/user-auth.repository";
import {
  assertPasswordNotReused,
  assertPasswordPolicy,
  createVerificationToken,
  hashNewPassword,
  hashOpaqueToken,
  storePasswordHistory,
  verifyPassword,
} from "./password.service";
import {
  createAuthenticatedSession,
  logoutAllUserSessions,
  logoutCurrentSession,
  rotateRefreshSession,
} from "./session.service";

function organizationTypeForRegistration(type?: string) {
  switch (type) {
    case "Hospital":
      return "HOSPITAL" as const;
    case "Clinic":
      return "CLINIC" as const;
    case "Company":
      return "COMPANY" as const;
    case "Government Institution":
      return "GOVERNMENT" as const;
    default:
      return "OTHER" as const;
  }
}

function organizationTypeFromAccountType(accountType?: string) {
  if (accountType === "HOSPITAL") return "Hospital";
  if (accountType === "CLINIC") return "Clinic";
  if (accountType === "COMPANY") return "Company";
  if (accountType === "ENTERPRISE_ORGANIZATION") return "Healthcare Organization";
  if (accountType === "UNIVERSITY") return "University";
  if (accountType === "RESEARCH_CENTER") return "Research Center";
  if (accountType === "HEALTHCARE_ORGANIZATION") return "Healthcare Organization";
  return undefined;
}

function requiresOrganization(accountType?: string) {
  return Boolean(accountType && accountType !== "INDIVIDUAL");
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

export class AuthenticationService {
  async register(
    body: {
      email?: string;
      accountType?: string;
      department?: string;
      employeeId?: string;
      institution?: string;
      name: string;
      organizationCity?: string;
      organizationCountry?: string;
      organizationEmail?: string;
      organizationName?: string;
      organizationType?: string;
      password?: string;
      phoneNumber?: string;
      positionTitle?: string;
      role: AuthenticationApiRole;
      registrationRole?: string;
      specialization?: string;
    },
    req: Request,
    res: Response,
  ) {
    if (body.email) assertPasswordPolicy(body.password ?? "");
    const phoneNumber = body.phoneNumber ? normalizePhone(body.phoneNumber) : undefined;
    const email = body.email?.trim().toLowerCase() ?? (phoneNumber ? phoneEmail(phoneNumber) : "");
    const existing = await userAuthRepository.findByEmail(email);
    if (existing) {
      throw new AppError(409, "An account with this email already exists.", "EMAIL_EXISTS");
    }

    const emailToken = createVerificationToken();
    const passwordHash = await hashPassword(body.password ?? createOpaqueToken(48));
    const user = await prisma.$transaction(async (tx) => {
      const organization =
        requiresOrganization(body.accountType)
          ? await tx.organization.create({
              data: {
                city: body.organizationCity,
                country: body.organizationCountry,
                email: body.organizationEmail ?? email,
                name: body.organizationName ?? body.institution ?? `${body.name} Organization`,
                type: organizationTypeForRegistration(
                  body.organizationType ?? organizationTypeFromAccountType(body.accountType),
                ),
              },
            })
          : null;

      const createdUser = await userAuthRepository.createInTransaction(tx, {
        accountType: (body.accountType as never) ?? "INDIVIDUAL",
        avatarInitials: initialsForName(body.name),
        department: body.department,
        email,
        emailVerificationExpiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
        emailVerificationTokenHash: hashOpaqueToken(emailToken),
        employeeId: body.employeeId,
        institution: body.institution ?? body.organizationName,
        name: body.name,
        ...(organization ? { organization: { connect: { id: organization.id } } } : {}),
        passwordHash,
        phoneNumber,
        positionTitle: body.positionTitle,
        registrationRole: registrationRoleLabel(body.role, body.registrationRole),
        role: fromAuthenticationApiRole(body.role),
        specialization: body.specialization ?? registrationRoleLabel(body.role, body.registrationRole),
        subscription: {
          create: {
            tier: "FREE",
            status: "ACTIVE",
          },
        },
      });

      await tx.passwordHistory.create({
        data: {
          expiresAt: new Date(Date.now() + PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000),
          passwordHash: createdUser.passwordHash,
          userId: createdUser.id,
        },
      });

      return createdUser;
    });

    const auth = await createAuthenticatedSession({
      rememberMe: true,
      req,
      res,
      userId: user.id,
    });

    return {
      accessToken: auth.accessToken,
      emailVerificationToken: emailToken,
      user: auth.user,
    };
  }

  async login(
    body: { email: string; password: string; rememberMe: boolean },
    req: Request,
    res: Response,
  ) {
    const user = await userAuthRepository.findByEmail(body.email);
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError(423, "Account is temporarily locked after failed login attempts.", "ACCOUNT_LOCKED");
    }

    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      if (user) {
        await userAuthRepository.recordFailedLogin(user, {
          ipAddress: req.ip,
          userAgent: req.get("user-agent") ?? undefined,
        });
      }
      const error = new AppError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
      if (user && user.failedLoginAttempts + 1 >= CAPTCHA_FAILED_ATTEMPTS) {
        (error as AppError & { details?: Record<string, unknown> }).details = { captchaRequired: true };
      }
      throw error;
    }

    if (!user.isActive) {
      throw new AppError(403, "Your account is inactive.", "USER_INACTIVE");
    }
    if (!user.emailVerified) {
      throw new AppError(403, "Email verification is required before login.", "USER_UNVERIFIED");
    }
    if (user.forcePasswordReset) {
      throw new AppError(403, "Password reset is required before login.", "PASSWORD_RESET_REQUIRED");
    }
    if (user.passwordChangedAt < new Date(Date.now() - PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000)) {
      await userAuthRepository.update(user.id, { forcePasswordReset: true });
      throw new AppError(403, "Password has expired and must be reset.", "PASSWORD_EXPIRED");
    }

    await userAuthRepository.clearLoginFailures(user.id);
    await userAuthRepository.recordLogin(user.id, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
    });

    return createAuthenticatedSession({
      rememberMe: body.rememberMe,
      req,
      res,
      userId: user.id,
    });
  }

  refresh(req: Request, res: Response) {
    return rotateRefreshSession(req, res);
  }

  logout(req: Request, res: Response) {
    return logoutCurrentSession(req, res);
  }

  logoutAll(userId: string, res: Response) {
    return logoutAllUserSessions(userId, res);
  }

  async resendVerification(emailInput: string) {
    const user = await userAuthRepository.findByEmail(emailInput);
    if (!user) return { emailVerificationToken: undefined };
    const emailVerificationToken = createVerificationToken();
    await userAuthRepository.setEmailVerificationToken(
      user.id,
      hashOpaqueToken(emailVerificationToken),
      new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    );
    return { emailVerificationToken };
  }

  async verifyEmail(body: { email: string; token: string }) {
    const user = await userAuthRepository.findByEmail(body.email);
    if (
      !user ||
      !user.emailVerificationTokenHash ||
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt <= new Date() ||
      user.emailVerificationTokenHash !== hashOpaqueToken(body.token)
    ) {
      throw new AppError(400, "Email verification token is invalid or expired.", "VERIFY_INVALID");
    }
    await userAuthRepository.markEmailVerified(user.id);
  }

  async requestPasswordReset(emailInput: string) {
    const user = await userAuthRepository.findByEmail(emailInput);
    const resetToken = createVerificationToken();
    if (user) {
      await userAuthRepository.setPasswordResetToken(
        user.id,
        hashOpaqueToken(resetToken),
        new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      );
    }
    return { resetToken: user ? resetToken : undefined };
  }

  async resetPassword(body: { email: string; newPassword: string; token: string }) {
    const user = await userAuthRepository.findByEmail(body.email);
    if (
      !user ||
      !user.passwordResetTokenHash ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt <= new Date() ||
      user.passwordResetTokenHash !== hashOpaqueToken(body.token)
    ) {
      throw new AppError(400, "Password reset token is invalid or expired.", "RESET_INVALID");
    }

    await assertPasswordNotReused(user.id, body.newPassword);
    const passwordHash = await hashNewPassword(body.newPassword);
    await userAuthRepository.update(user.id, {
      failedLoginAttempts: 0,
      forcePasswordReset: false,
      lockedUntil: null,
      passwordChangedAt: new Date(),
      passwordHash,
      passwordResetExpiresAt: null,
      passwordResetTokenHash: null,
      sessions: {
        updateMany: {
          data: { revokedAt: new Date() },
          where: { revokedAt: null },
        },
      },
    });
    await storePasswordHistory(user.id, passwordHash);
  }

  async changePassword(userId: string, body: { currentPassword: string; newPassword: string }) {
    const user = await userAuthRepository.findById(userId);
    if (!user || !(await verifyPassword(body.currentPassword, user.passwordHash))) {
      throw new AppError(400, "Current password is incorrect.", "CURRENT_PASSWORD_INVALID");
    }
    await assertPasswordNotReused(userId, body.newPassword);
    const passwordHash = await hashNewPassword(body.newPassword);
    await userAuthRepository.update(userId, {
      forcePasswordReset: false,
      passwordChangedAt: new Date(),
      passwordHash,
      sessions: { updateMany: { data: { revokedAt: new Date() }, where: { revokedAt: null } } },
    });
    await storePasswordHistory(userId, passwordHash);
  }

  async issueAuthResponse(input: {
    actorId?: string;
    actorRole?: Parameters<typeof createAuthenticatedSession>[0]["actorRole"];
    rememberMe: boolean;
    req: Request;
    res: Response;
    userId: string;
  }) {
    return createAuthenticatedSession(input);
  }

  async requestPhoneOtp(body: { name?: string; phoneNumber: string; purpose: "LOGIN" | "REGISTER" }) {
    const phoneNumber = normalizePhone(body.phoneNumber);
    let user = await userAuthRepository.findByPhone(phoneNumber);
    if (!user && body.purpose === "REGISTER") {
      user = await userAuthRepository.create({
        avatarInitials: initialsForName(body.name ?? phoneNumber),
        email: phoneEmail(phoneNumber),
        name: body.name ?? `Phone User ${phoneNumber.slice(-4)}`,
        passwordHash: await hashPassword(createOpaqueToken(48)),
        phoneNumber,
        role: "USER",
        subscription: { create: { status: "ACTIVE", tier: "FREE" } },
      });
    }
    if (!user) {
      throw new AppError(404, "Phone number is not registered.", "PHONE_NOT_REGISTERED");
    }
    const otp = randomOtp();
    const record = await prisma.phoneOtp.create({
      data: {
        expiresAt: new Date(Date.now() + PHONE_OTP_TTL_MS),
        otpHash: hashToken(otp),
        phoneNumber,
        purpose: body.purpose,
        userId: user.id,
      },
    });
    return { otp, otpId: record.id };
  }

  async verifyPhoneOtp(
    body: { otp: string; phoneNumber: string; rememberMe: boolean },
    req: Request,
    res: Response,
  ) {
    const phoneNumber = normalizePhone(body.phoneNumber);
    const otp = await prisma.phoneOtp.findFirst({
      orderBy: { createdAt: "desc" },
      where: { consumedAt: null, expiresAt: { gt: new Date() }, phoneNumber },
    });
    if (!otp || otp.otpHash !== hashToken(body.otp)) {
      if (otp) await prisma.phoneOtp.update({ data: { attempts: otp.attempts + 1 }, where: { id: otp.id } });
      throw new AppError(400, "Phone OTP is invalid or expired.", "PHONE_OTP_INVALID");
    }
    const user = await userAuthRepository.findById(otp.userId ?? "");
    if (!user) throw new AppError(404, "User not found.", "USER_NOT_FOUND");
    await prisma.phoneOtp.update({ data: { consumedAt: new Date() }, where: { id: otp.id } });
    await userAuthRepository.update(user.id, { phoneVerified: true });
    return createAuthenticatedSession({ rememberMe: body.rememberMe, req, res, userId: user.id });
  }

  async oauthLogin(
    body: {
      email?: string;
      name?: string;
      provider: "GOOGLE" | "APPLE" | "MICROSOFT";
      providerUserId: string;
      rememberMe: boolean;
    },
    req: Request,
    res: Response,
  ) {
    const existingIdentity = await prisma.oAuthIdentity.findUnique({
      include: { user: true },
      where: { provider_providerUserId: { provider: body.provider, providerUserId: body.providerUserId } },
    });
    if (existingIdentity) {
      return createAuthenticatedSession({
        rememberMe: body.rememberMe,
        req,
        res,
        userId: existingIdentity.userId,
      });
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
    return createAuthenticatedSession({ rememberMe: body.rememberMe, req, res, userId: user.id });
  }

  async setupOwnerPassword(body: { email: string; newPassword: string; username: string }) {
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
    const passwordHash = await hashNewPassword(body.newPassword);
    await userAuthRepository.update(owner.id, {
      forcePasswordReset: false,
      ownerPasswordSetupRequired: false,
      passwordChangedAt: new Date(),
      passwordHash,
    });
    await storePasswordHistory(owner.id, passwordHash);
  }
}

export const authenticationService = new AuthenticationService();

export function organizationTypeForRegistrationExport(type?: string) {
  return organizationTypeForRegistration(type);
}

export { serializeUser };
