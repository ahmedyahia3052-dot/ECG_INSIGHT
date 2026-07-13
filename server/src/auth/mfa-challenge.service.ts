/**
 * Login MFA challenge — short-lived signed token + TOTP / email OTP / recovery codes.
 */
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../middleware/error";
import { createAuthenticatedSession } from "../modules/authentication";
import {
  decryptField,
  generateTotpSecret,
  hashSecurityValue,
  verifyTotpCode,
} from "../utils/security-crypto";
import type { Request, Response } from "express";
import crypto from "node:crypto";

export type MfaChallengeClaims = {
  purpose: "mfa_login";
  rememberMe: boolean;
  methods: Array<"TOTP" | "EMAIL_OTP">;
  sub: string;
};

export function signMfaChallenge(input: {
  userId: string;
  rememberMe: boolean;
  methods: Array<"TOTP" | "EMAIL_OTP">;
}) {
  return jwt.sign(
    {
      purpose: "mfa_login",
      rememberMe: input.rememberMe,
      methods: input.methods,
    },
    env.JWT_SECRET,
    {
      audience: "ecg-insight-mfa",
      expiresIn: "5m",
      issuer: "ecg-insight-api",
      subject: input.userId,
    },
  );
}

export function verifyMfaChallengeToken(token: string): MfaChallengeClaims & { userId: string } {
  const claims = jwt.verify(token, env.JWT_SECRET, {
    audience: "ecg-insight-mfa",
    issuer: "ecg-insight-api",
  }) as MfaChallengeClaims & { sub: string };
  if (claims.purpose !== "mfa_login" || !claims.sub) {
    throw new AppError(401, "Invalid MFA challenge token.", "MFA_TOKEN_INVALID");
  }
  return {
    purpose: claims.purpose,
    rememberMe: Boolean(claims.rememberMe),
    methods: claims.methods ?? [],
    userId: claims.sub,
    sub: claims.sub,
  };
}

function emailOtpCode() {
  return String(crypto.randomInt(100_000, 999_999));
}

export async function buildMfaRequiredPayload(userId: string, rememberMe: boolean) {
  const methods = await prisma.userMFA.findMany({
    where: { userId, enabled: true },
    select: { type: true, id: true },
  });
  const types = methods.map((m) => m.type as "TOTP" | "EMAIL_OTP");
  if (types.length === 0) return null;

  let emailOtpPreview: string | undefined;
  if (types.includes("EMAIL_OTP")) {
    const emailMethod = methods.find((m) => m.type === "EMAIL_OTP");
    if (emailMethod) {
      const otp = emailOtpCode();
      await prisma.userMFA.update({
        where: { id: emailMethod.id },
        data: { emailOtpHash: hashSecurityValue(otp) },
      });
      if (env.NODE_ENV !== "production") {
        emailOtpPreview = otp;
      }
    }
  }

  const mfaToken = signMfaChallenge({ userId, rememberMe, methods: types });
  return {
    code: "MFA_REQUIRED" as const,
    mfaRequired: true as const,
    mfaToken,
    methods: types,
    message: "Multi-factor authentication is required to continue.",
    ...(emailOtpPreview ? { otp: emailOtpPreview } : {}),
  };
}

export async function verifyLoginMfa(
  body: { mfaToken: string; code: string; rememberMe?: boolean },
  req: Request,
  res: Response,
) {
  const claims = verifyMfaChallengeToken(body.mfaToken);
  const code = body.code.trim();
  const methods = await prisma.userMFA.findMany({
    where: { userId: claims.userId, enabled: true },
  });

  let accepted = false;

  for (const method of methods) {
    if (method.type === "TOTP" && verifyTotpCode(method.secretHash, code)) {
      accepted = true;
      await prisma.userMFA.update({
        where: { id: method.id },
        data: { lastUsedAt: new Date() },
      });
      break;
    }
    if (method.type === "EMAIL_OTP" && method.emailOtpHash === hashSecurityValue(code)) {
      accepted = true;
      await prisma.userMFA.update({
        where: { id: method.id },
        data: { emailOtpHash: null, lastUsedAt: new Date() },
      });
      break;
    }
  }

  if (!accepted) {
    const recovery = await prisma.mFARecoveryCode.findFirst({
      where: {
        userId: claims.userId,
        usedAt: null,
        codeHash: hashSecurityValue(code.toUpperCase()),
      },
    });
    if (recovery) {
      accepted = true;
      await prisma.mFARecoveryCode.update({
        where: { id: recovery.id },
        data: { usedAt: new Date() },
      });
    }
  }

  if (!accepted) {
    throw new AppError(401, "Invalid MFA code.", "MFA_INVALID");
  }

  return createAuthenticatedSession({
    rememberMe: body.rememberMe ?? claims.rememberMe,
    req,
    res,
    userId: claims.userId,
  });
}

/** Re-export unused helper to keep tree clean if TOTP secret generation needed elsewhere */
export { generateTotpSecret, decryptField };
