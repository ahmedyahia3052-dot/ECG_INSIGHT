import { AppError } from "../../../middleware/error";
import { createOpaqueToken, hashPassword, hashToken, verifyPassword } from "../../../utils/crypto";
import { PASSWORD_MAX_AGE_DAYS } from "../domain/constants";
import { userAuthRepository } from "../repository/user-auth.repository";
import { getAuthModuleSettings } from "../../../auth/auth-settings.service";

export async function assertPasswordPolicy(password: string) {
  const settings = await getAuthModuleSettings();
  const min = settings.passwordMinLength;
  const checks = [
    password.length >= min,
    !settings.passwordRequireUppercase || /[A-Z]/.test(password),
    !settings.passwordRequireLowercase || /[a-z]/.test(password),
    !settings.passwordRequireNumber || /\d/.test(password),
    !settings.passwordRequireSymbol || /[^A-Za-z0-9]/.test(password),
  ];
  if (checks.some((ok) => !ok)) {
    throw new AppError(
      400,
      `Password must be at least ${min} characters and satisfy the configured complexity policy.`,
      "PASSWORD_WEAK",
    );
  }
}

export async function assertPasswordNotReused(userId: string, password: string) {
  const settings = await getAuthModuleSettings();
  const recentPasswords = await userAuthRepository.recentPasswordHashes(
    userId,
    settings.passwordHistoryCount,
  );
  for (const historicalPassword of recentPasswords) {
    if (await verifyPassword(password, historicalPassword.passwordHash)) {
      throw new AppError(400, "Password was used recently. Choose a different password.", "PASSWORD_REUSED");
    }
  }
}

export async function hashNewPassword(password: string) {
  await assertPasswordPolicy(password);
  return hashPassword(password);
}

export function createVerificationToken() {
  return createOpaqueToken(32);
}

export function hashOpaqueToken(token: string) {
  return hashToken(token);
}

export async function storePasswordHistory(userId: string, passwordHash: string) {
  return userAuthRepository.recordPasswordHistory(
    userId,
    passwordHash,
    new Date(Date.now() + PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000),
  );
}

export { verifyPassword };
