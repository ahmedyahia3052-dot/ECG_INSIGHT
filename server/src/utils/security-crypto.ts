import crypto from "node:crypto";
import { env } from "../config/env";

const KEY_VERSION = 1;

function keyMaterial(version = KEY_VERSION) {
  return crypto.createHash("sha256").update(`${env.JWT_SECRET}:phi:${version}`).digest();
}

export function hashSecurityValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function encryptField(value: string, version = KEY_VERSION) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyMaterial(version), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v${version}:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptField(payload: string) {
  if (!payload.startsWith("enc:v")) return payload;
  const [, versionToken, ivValue, tagValue, encryptedValue] = payload.split(":");
  const version = Number(versionToken?.replace("v", "") ?? KEY_VERSION);
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyMaterial(version), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function currentKeyVersion() {
  return KEY_VERSION;
}

export function generateTotpSecret() {
  return crypto.randomBytes(20).toString("base64url");
}

function totpCode(secret: string, stepOffset = 0) {
  const counter = Math.floor(Date.now() / 30_000) + stepOffset;
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  counterBuffer.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac("sha1", Buffer.from(secret, "base64url")).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export function verifyTotpCode(secretPayload: string | null | undefined, code: string) {
  if (!secretPayload) return false;
  const secret = decryptField(secretPayload);
  const normalized = code.trim();
  if (!/^\d{6}$/.test(normalized)) return false;
  return [-1, 0, 1].some((offset) => crypto.timingSafeEqual(Buffer.from(totpCode(secret, offset)), Buffer.from(normalized)));
}

export function generateRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => crypto.randomBytes(5).toString("hex").toUpperCase());
}
