import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { validateBody } from "../middleware/validate";
import { hashPassword, initialsForName } from "../utils/crypto";
import { signAccessToken } from "../utils/jwt";
import { fromApiRole, serializeUser } from "../utils/users";
import { createInternalUserSchema, updateUserStatusSchema } from "./schemas";

export const usersRouter = Router();

usersRouter.use(requireAuth);

function protectedOwner(user: { protectedOwner: boolean; role: string }) {
  return user.protectedOwner || user.role === "OWNER";
}

usersRouter.get("/", requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      include: { subscription: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ users: users.map(serializeUser) });
  } catch (error) {
    next(error);
  }
});

usersRouter.post(
  "/internal",
  requireRole("SUPER_ADMIN"),
  validateBody(createInternalUserSchema),
  async (req, res, next) => {
    try {
      const email = req.body.email.trim().toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw new AppError(409, "An account with this email already exists.", "EMAIL_EXISTS");
      }

      const user = await prisma.user.create({
        data: {
          avatarInitials: initialsForName(req.body.name),
          email,
          emailVerified: true,
          institution: req.body.institution ?? "ECG Insight Internal",
          isActive: true,
          licenseNumber: req.body.licenseNumber,
          name: req.body.name,
          passwordHash: await hashPassword(req.body.password),
          role: fromApiRole(req.body.role),
          specialization: req.body.specialization,
          subscription: {
            create: {
              status: "ACTIVE",
              tier: req.body.role === "student" ? "FREE" : "ENTERPRISE",
            },
          },
        },
        include: { subscription: true },
      });
      res.status(201).json({ user: serializeUser(user) });
    } catch (error) {
      next(error);
    }
  },
);

usersRouter.patch(
  "/:userId/status",
  requireRole("ADMIN"),
  validateBody(updateUserStatusSchema),
  async (req, res, next) => {
    try {
      const userId = String(req.params.userId);
      if (userId === req.auth!.id) {
        throw new AppError(400, "You cannot change your own activation status.", "SELF_STATUS");
      }

      const target = await prisma.user.findUnique({ where: { id: userId } });
      if (!target) {
        throw new AppError(404, "User not found.", "USER_NOT_FOUND");
      }
      if (protectedOwner(target)) {
        throw new AppError(403, "The protected owner account cannot be disabled or suspended.", "OWNER_IMMUTABLE");
      }
      if (target.role === "SUPER_ADMIN" && req.auth!.role !== "SUPER_ADMIN" && req.auth!.role !== "OWNER") {
        throw new AppError(403, "Only Super Admin or Owner can modify Super Admin accounts.", "FORBIDDEN");
      }

      const user = await prisma.user.update({
        data: { isActive: req.body.isActive },
        where: { id: userId },
        include: { subscription: true },
      });

      if (!req.body.isActive) {
        await prisma.session.updateMany({
          data: { revokedAt: new Date() },
          where: { userId, revokedAt: null },
        });
      }

      res.json({ user: serializeUser(user) });
    } catch (error) {
      next(error);
    }
  },
);

usersRouter.post("/:userId/impersonate", requireRole("SUPER_ADMIN"), async (req, res, next) => {
  try {
    const userId = String(req.params.userId);
    const target = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });
    if (!target) {
      throw new AppError(404, "User not found.", "USER_NOT_FOUND");
    }
    if (!target.isActive) {
      throw new AppError(400, "Cannot impersonate an inactive user.", "USER_INACTIVE");
    }
    if (protectedOwner(target) && req.auth!.role !== "OWNER") {
      throw new AppError(403, "The protected owner account cannot be impersonated by other admins.", "OWNER_IMMUTABLE");
    }

    const accessToken = signAccessToken({
      actorId: req.auth!.actorId ?? req.auth!.id,
      actorRole: req.auth!.actorRole ?? req.auth!.role,
      role: target.role,
      sessionId: req.auth!.sessionId,
      userId: target.id,
    });

    res.json({ accessToken, user: serializeUser(target) });
  } catch (error) {
    next(error);
  }
});
