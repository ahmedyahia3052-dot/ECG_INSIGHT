/**
 * WebAuthn / Passkeys — Face ID, Touch ID, Windows Hello, Android biometrics.
 * Requires WEBAUTHN_RP_ID (+ optional WEBAUTHN_ORIGIN). No fake assertions.
 */
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../middleware/error";
import { createAuthenticatedSession } from "../modules/authentication";
import type { Request, Response } from "express";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function rpConfig() {
  const rpID = env.WEBAUTHN_RP_ID?.trim();
  if (!rpID) {
    throw new AppError(
      503,
      "WebAuthn is not configured. Set WEBAUTHN_RP_ID (and WEBAUTHN_ORIGIN) on the API server.",
      "WEBAUTHN_NOT_CONFIGURED",
    );
  }
  const origin =
    env.WEBAUTHN_ORIGIN?.replace(/\/+$/, "") ??
    env.CLIENT_ORIGIN.split(",")[0].replace(/\/+$/, "");
  return {
    rpID,
    rpName: env.WEBAUTHN_RP_NAME || "ECG Insight",
    origin,
  };
}

export function webAuthnStatus() {
  const rpID = env.WEBAUTHN_RP_ID?.trim();
  return {
    available: Boolean(rpID),
    rpID: rpID || null,
    reason: rpID
      ? "WebAuthn / passkeys ready"
      : "Set WEBAUTHN_RP_ID and WEBAUTHN_ORIGIN on BelatedElasticLoop to enable Face ID, Touch ID, Windows Hello, and passkeys.",
  };
}

async function storeChallenge(input: {
  challenge: string;
  type: "registration" | "authentication";
  userId?: string;
  email?: string;
}) {
  await prisma.webAuthnChallenge.create({
    data: {
      challenge: input.challenge,
      type: input.type,
      userId: input.userId,
      email: input.email?.trim().toLowerCase(),
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });
}

async function consumeChallenge(input: {
  type: "registration" | "authentication";
  userId?: string;
  email?: string;
}) {
  const email = input.email?.trim().toLowerCase();
  const row = await prisma.webAuthnChallenge.findFirst({
    where: {
      type: input.type,
      expiresAt: { gt: new Date() },
      ...(input.userId ? { userId: input.userId } : {}),
      ...(email ? { email } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  if (!row) {
    throw new AppError(400, "WebAuthn challenge expired or missing. Try again.", "WEBAUTHN_CHALLENGE_INVALID");
  }
  await prisma.webAuthnChallenge.delete({ where: { id: row.id } }).catch(() => undefined);
  return row.challenge;
}

export async function registrationOptions(userId: string) {
  const { rpID, rpName } = rpConfig();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "User not found.", "USER_NOT_FOUND");

  const existing = await prisma.webAuthnCredential.findMany({ where: { userId } });
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email,
    userDisplayName: user.name,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: existing.map((cred) => ({
      id: cred.credentialId,
      transports: (cred.transports as AuthenticatorTransportFuture[] | null) ?? undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "platform",
    },
  });

  await storeChallenge({ challenge: options.challenge, type: "registration", userId });
  return options;
}

export async function verifyRegistration(userId: string, response: RegistrationResponseJSON, friendlyName?: string) {
  const { rpID, origin } = rpConfig();
  const expectedChallenge = await consumeChallenge({ type: "registration", userId });
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });
  if (!verification.verified || !verification.registrationInfo) {
    throw new AppError(400, "WebAuthn registration verification failed.", "WEBAUTHN_VERIFY_FAILED");
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  const created = await prisma.webAuthnCredential.create({
    data: {
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: credential.transports ?? [],
      friendlyName: friendlyName ?? "Passkey",
    },
  });

  return {
    credential: {
      id: created.id,
      friendlyName: created.friendlyName,
      deviceType: created.deviceType,
      createdAt: created.createdAt.toISOString(),
    },
  };
}

export async function authenticationOptions(email: string) {
  const { rpID } = rpConfig();
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) {
    throw new AppError(404, "No passkeys registered for this account.", "WEBAUTHN_USER_NOT_FOUND");
  }
  const credentials = await prisma.webAuthnCredential.findMany({ where: { userId: user.id } });
  if (credentials.length === 0) {
    throw new AppError(404, "No passkeys registered for this account.", "WEBAUTHN_NO_CREDENTIALS");
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials: credentials.map((cred) => ({
      id: cred.credentialId,
      transports: (cred.transports as AuthenticatorTransportFuture[] | null) ?? undefined,
    })),
  });

  await storeChallenge({
    challenge: options.challenge,
    type: "authentication",
    userId: user.id,
    email: normalized,
  });
  return options;
}

export async function verifyAuthentication(
  body: { email: string; response: AuthenticationResponseJSON; rememberMe?: boolean },
  req: Request,
  res: Response,
) {
  const { rpID, origin } = rpConfig();
  const normalized = body.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) throw new AppError(401, "WebAuthn authentication failed.", "WEBAUTHN_AUTH_FAILED");

  const expectedChallenge = await consumeChallenge({
    type: "authentication",
    userId: user.id,
    email: normalized,
  });

  const credentialId = body.response.id;
  const stored = await prisma.webAuthnCredential.findUnique({ where: { credentialId } });
  if (!stored || stored.userId !== user.id) {
    throw new AppError(401, "Unknown passkey.", "WEBAUTHN_UNKNOWN_CREDENTIAL");
  }

  const verification = await verifyAuthenticationResponse({
    response: body.response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: stored.credentialId,
      publicKey: new Uint8Array(stored.publicKey),
      counter: Number(stored.counter),
      transports: (stored.transports as AuthenticatorTransportFuture[] | null) ?? undefined,
    },
  });

  if (!verification.verified) {
    throw new AppError(401, "WebAuthn authentication verification failed.", "WEBAUTHN_AUTH_FAILED");
  }

  await prisma.webAuthnCredential.update({
    where: { id: stored.id },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      lastUsedAt: new Date(),
    },
  });

  return createAuthenticatedSession({
    rememberMe: body.rememberMe ?? true,
    req,
    res,
    userId: user.id,
  });
}

export async function listCredentials(userId: string) {
  const rows = await prisma.webAuthnCredential.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return {
    credentials: rows.map((row) => ({
      id: row.id,
      friendlyName: row.friendlyName,
      deviceType: row.deviceType,
      createdAt: row.createdAt.toISOString(),
      lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    })),
  };
}

export async function removeCredential(userId: string, credentialId: string) {
  const existing = await prisma.webAuthnCredential.findFirst({
    where: { id: credentialId, userId },
  });
  if (!existing) throw new AppError(404, "Credential not found.", "WEBAUTHN_CREDENTIAL_NOT_FOUND");
  await prisma.webAuthnCredential.delete({ where: { id: existing.id } });
  return { deleted: true };
}
