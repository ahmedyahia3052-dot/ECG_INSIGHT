import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { validateBody } from "../middleware/validate";
import { fromApiTier, serializeUser, toApiTier } from "../utils/users";
import { updateSubscriptionSchema } from "./schemas";

export const subscriptionsRouter = Router();

subscriptionsRouter.use(requireAuth);

subscriptionsRouter.get("/", requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      include: { user: true },
      orderBy: { updatedAt: "desc" },
    });

    res.json({
      subscriptions: subscriptions.map((subscription) => ({
        id: subscription.id,
        status: subscription.status,
        tier: toApiTier(subscription.tier),
        user: serializeUser({
          ...subscription.user,
          subscription: { tier: subscription.tier },
        }),
        userId: subscription.userId,
      })),
    });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.patch(
  "/:userId",
  requireRole("SUPER_ADMIN"),
  validateBody(updateSubscriptionSchema),
  async (req, res, next) => {
    try {
      const userId = String(req.params.userId);
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new AppError(404, "User not found.", "USER_NOT_FOUND");
      }

      const subscription = await prisma.subscription.upsert({
        create: {
          status: req.body.status ?? "ACTIVE",
          tier: fromApiTier(req.body.tier),
          userId: user.id,
        },
        update: {
          status: req.body.status,
          tier: fromApiTier(req.body.tier),
        },
        where: { userId: user.id },
      });

      res.json({
        subscription: {
          id: subscription.id,
          status: subscription.status,
          tier: toApiTier(subscription.tier),
          userId: subscription.userId,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);
