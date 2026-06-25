import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../../middleware/auth";

export const preferencesRouter = Router();

preferencesRouter.use(requireAuth);

const preferenceSchema = z.object({
  compactDashboardDensity: z.boolean().optional(),
  criticalAlertSound: z.boolean().optional(),
  highContrastClinicalMode: z.boolean().optional(),
  reduceMotion: z.boolean().optional(),
  rememberLastPatientFilter: z.boolean().optional(),
  requireConfirmationForDestructiveActions: z.boolean().optional(),
});

function serializePreferences(preferences: {
  compactDashboardDensity: boolean;
  criticalAlertSound: boolean;
  highContrastClinicalMode: boolean;
  reduceMotion: boolean;
  rememberLastPatientFilter: boolean;
  requireConfirmationForDestructiveActions: boolean;
  updatedAt: Date;
  userId: string;
}) {
  return {
    compactDashboardDensity: preferences.compactDashboardDensity,
    criticalAlertSound: preferences.criticalAlertSound,
    highContrastClinicalMode: preferences.highContrastClinicalMode,
    reduceMotion: preferences.reduceMotion,
    rememberLastPatientFilter: preferences.rememberLastPatientFilter,
    requireConfirmationForDestructiveActions: preferences.requireConfirmationForDestructiveActions,
    updatedAt: preferences.updatedAt.toISOString(),
    userId: preferences.userId,
  };
}

async function ensurePreferences(userId: string) {
  return prisma.userPreference.upsert({
    create: { userId },
    update: {},
    where: { userId },
  });
}

preferencesRouter.get("/", async (req, res, next) => {
  try {
    const preferences = await ensurePreferences(req.auth!.id);
    res.json({ preferences: serializePreferences(preferences) });
  } catch (error) {
    next(error);
  }
});

preferencesRouter.patch("/", async (req, res, next) => {
  try {
    const body = preferenceSchema.parse(req.body);
    await ensurePreferences(req.auth!.id);
    const preferences = await prisma.userPreference.update({
      data: body,
      where: { userId: req.auth!.id },
    });
    await prisma.auditLog.create({
      data: {
        action: "PERMISSION_CHANGED",
        actorId: req.auth!.id,
        entityId: preferences.id,
        entityType: "UserPreference",
        message: "Workspace preferences updated.",
      },
    });
    res.json({ preferences: serializePreferences(preferences) });
  } catch (error) {
    next(error);
  }
});
