import crypto from "node:crypto";
import fs from "node:fs/promises";
import { env } from "../config/env";

export async function sha256File(filePath: string) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function createSignedDownloadToken(path: string, expiresInSeconds = 300) {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${path}:${expiresAt}`;
  const signature = crypto.createHmac("sha256", env.JWT_SECRET).update(payload).digest("hex");
  return Buffer.from(JSON.stringify({ expiresAt, path, signature })).toString("base64url");
}

export function verifySignedDownloadToken(token: string) {
  const parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as {
    expiresAt: number;
    path: string;
    signature: string;
  };
  if (parsed.expiresAt < Math.floor(Date.now() / 1000)) return null;
  const expected = crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(`${parsed.path}:${parsed.expiresAt}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(parsed.signature), Buffer.from(expected)) ? parsed.path : null;
}

export async function scanFileForThreats(filePath: string) {
  const buffer = await fs.readFile(filePath);
  const signature = buffer.toString("utf8", 0, Math.min(buffer.length, 2048)).toLowerCase();
  return {
    clean: !signature.includes("eicar") && !signature.includes("<script"),
    scanner: "local-abstraction",
  };
}
