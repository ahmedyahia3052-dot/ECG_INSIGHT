import { AppError } from "../../../middleware/error";
import { createOpaqueToken, hashPassword, hashToken, verifyPassword } from "../../../utils/crypto";
import { PASSWORD_MAX_AGE_DAYS } from "../domain/constants";
import { userAuthRepository } from "../repository/user-auth.repository";

export function assertPasswordPolicy(password: string) {
  const strongEnough =
    password.length >= 12 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
  if (!strongEnough) {
    throw new AppError(
      400,
      "Password must be at least 12 characters and include upper, lower, number, and symbol characters.",
      "PASSWORD_WEAK",
    );
  }
}

export async function assertPasswordNotReused(userId: string, password: string) {
  const recentPasswords = await userAuthRepository.recentPasswordHashes(userId);
  for (const historicalPassword of recentPasswords) {
    if (await verifyPassword(password, historicalPassword.passwordHash)) {
      throw new AppError(400, "Password was used recently. Choose a different password.", "PASSWORD_REUSED");
    }
  }
}

export async function hashNewPassword(password: string) {
  assertPasswordPolicy(password);
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
