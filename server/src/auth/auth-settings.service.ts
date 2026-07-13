/**
 * Global authentication module settings (SecurityPolicy SESSION named "auth_module_v1").
 * Defaults keep internal auth production-ready; OAuth stays admin-configured separately.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export type AuthModuleSettings = {
  emailVerificationRequired: boolean;
  mfaRequired: boolean;
  rememberMeEnabled: boolean;
  passkeysEnabled: boolean;
  biometricsEnabled: boolean;
  sessionLifetimeSeconds: number;
  rememberMeLifetimeSeconds: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  passwordHistoryCount: number;
};

export const DEFAULT_AUTH_MODULE_SETTINGS: AuthModuleSettings = {
  emailVerificationRequired: true,
  mfaRequired: false,
  rememberMeEnabled: true,
  passkeysEnabled: true,
  biometricsEnabled: true,
  sessionLifetimeSeconds: 60 * 60 * 24,
  rememberMeLifetimeSeconds: 60 * 60 * 24 * 30,
  passwordMinLength: 12,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumber: true,
  passwordRequireSymbol: true,
  passwordHistoryCount: 5,
};

const POLICY_NAME = "auth_module_v1";

function asSettings(config: unknown): AuthModuleSettings {
  const raw = (config && typeof config === "object" ? config : {}) as Partial<AuthModuleSettings>;
  return { ...DEFAULT_AUTH_MODULE_SETTINGS, ...raw };
}

export async function getAuthModuleSettings(): Promise<AuthModuleSettings> {
  const row = await prisma.securityPolicy.findFirst({
    where: { enabled: true, name: POLICY_NAME, policyType: "SESSION" },
    orderBy: { updatedAt: "desc" },
  });
  if (!row) return { ...DEFAULT_AUTH_MODULE_SETTINGS };
  return asSettings(row.config);
}

export async function upsertAuthModuleSettings(
  patch: Partial<AuthModuleSettings>,
  updatedById: string,
): Promise<AuthModuleSettings> {
  const current = await getAuthModuleSettings();
  const next = asSettings({ ...current, ...patch });
  const existing = await prisma.securityPolicy.findFirst({
    where: { name: POLICY_NAME, policyType: "SESSION" },
  });
  const config = next as unknown as Prisma.InputJsonValue;
  if (existing) {
    await prisma.securityPolicy.update({
      where: { id: existing.id },
      data: { config, enabled: true, updatedById, version: { increment: 1 } },
    });
  } else {
    await prisma.securityPolicy.create({
      data: {
        config,
        enabled: true,
        name: POLICY_NAME,
        policyType: "SESSION",
        updatedById,
      },
    });
  }
  return next;
}
