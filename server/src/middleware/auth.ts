import type { Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { AppError } from "./error";
import { verifyAccessToken } from "../utils/jwt";

const roleRank: Record<Role, number> = {
  ADMIN: 3,
  DOCTOR: 2,
  OWNER: 5,
  STUDENT: 1,
  SUPER_ADMIN: 4,
};

function bearerToken(req: Request): string | null {
  const header = req.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = bearerToken(req);
    if (!token) {
      throw new AppError(401, "Authentication required.", "AUTH_REQUIRED");
    }

    const claims = verifyAccessToken(token);
    const session = await prisma.session.findUnique({
      where: { id: claims.sessionId },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new AppError(401, "Session is no longer valid.", "SESSION_INVALID");
    }

    if (!session.user.isActive) {
      throw new AppError(403, "User account is deactivated.", "USER_INACTIVE");
    }

    req.auth = {
      actorId: claims.actorId,
      actorRole: claims.actorRole,
      id: claims.sub,
      role: claims.role,
      sessionId: claims.sessionId,
    };
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, "Invalid access token.", "TOKEN_INVALID"));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      next(new AppError(401, "Authentication required.", "AUTH_REQUIRED"));
      return;
    }

    const effectiveRole = req.auth.role;
    const actorRole = req.auth.actorRole;
    const hasSuperAdminActor =
      actorRole === "OWNER" || actorRole === "SUPER_ADMIN" || effectiveRole === "OWNER" || effectiveRole === "SUPER_ADMIN";
    const hasRequiredRole = roles.some((role) => roleRank[effectiveRole] >= roleRank[role]);

    if (!hasSuperAdminActor && !hasRequiredRole) {
      next(new AppError(403, "Insufficient permissions.", "FORBIDDEN"));
      return;
    }

    next();
  };
}
