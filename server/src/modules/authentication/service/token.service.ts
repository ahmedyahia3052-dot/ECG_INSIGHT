import type { Role } from "@prisma/client";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../../utils/jwt";

export function issueAccessToken(input: {
  actorId?: string;
  actorRole?: Role;
  role: Role;
  sessionId: string;
  userId: string;
}) {
  return signAccessToken(input);
}

export function issueRefreshToken(input: {
  expiresInSeconds: number;
  sessionId: string;
  tokenVersion: number;
  userId: string;
}) {
  return signRefreshToken(input);
}

export function parseRefreshToken(token: string) {
  return verifyRefreshToken(token);
}

export { verifyAccessToken } from "../../../utils/jwt";
