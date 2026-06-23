import type { Role } from "@prisma/client";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env";

export interface AccessTokenClaims extends JwtPayload {
  actorId?: string;
  actorRole?: Role;
  role: Role;
  sessionId: string;
  sub: string;
}

export interface RefreshTokenClaims extends JwtPayload {
  sessionId: string;
  sub: string;
  tokenVersion: number;
}

export function signAccessToken(input: {
  actorId?: string;
  actorRole?: Role;
  role: Role;
  sessionId: string;
  userId: string;
}): string {
  return jwt.sign(
    {
      actorId: input.actorId,
      actorRole: input.actorRole,
      role: input.role,
      sessionId: input.sessionId,
    },
    env.JWT_SECRET,
    {
      audience: "ecg-insight",
      expiresIn: "15m",
      issuer: "ecg-insight-api",
      subject: input.userId,
    },
  );
}

export function signRefreshToken(input: {
  expiresInSeconds: number;
  sessionId: string;
  userId: string;
  tokenVersion: number;
}): string {
  return jwt.sign(
    {
      sessionId: input.sessionId,
      tokenVersion: input.tokenVersion,
    },
    env.JWT_REFRESH_SECRET,
    {
      audience: "ecg-insight",
      expiresIn: input.expiresInSeconds,
      issuer: "ecg-insight-api",
      subject: input.userId,
    },
  );
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  return jwt.verify(token, env.JWT_SECRET, {
    audience: "ecg-insight",
    issuer: "ecg-insight-api",
  }) as AccessTokenClaims;
}

export function verifyRefreshToken(token: string): RefreshTokenClaims {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    audience: "ecg-insight",
    issuer: "ecg-insight-api",
  }) as RefreshTokenClaims;
}
