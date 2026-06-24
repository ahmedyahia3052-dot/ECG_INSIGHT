import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import bcrypt from "bcryptjs";

export async function hashPassword(password: string): Promise<string> {
  try {
    return await argon2.hash(password, { type: argon2.argon2id });
  } catch {
    return bcrypt.hash(password, 12);
  }
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith("$argon2")) {
    return argon2.verify(hash, password);
  }
  return bcrypt.compare(password, hash);
}

export function createOpaqueToken(byteLength = 48): string {
  return randomBytes(byteLength).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function initialsForName(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return initials || "U";
}
