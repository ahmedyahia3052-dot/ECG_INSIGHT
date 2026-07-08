import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { AppError } from "./error";
import { hashSecurityValue } from "../utils/security-crypto";
import { log } from "../utils/logger";

const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const ipHits = new Map<string, { count: number; resetAt: number }>();
const userHits = new Map<string, { count: number; resetAt: number }>();

function isProbeRequest(req: Request) {
  return /^\/(live|liveness|ready|readiness|health|metrics)\/?$/i.test(req.path);
}

function securityLimits() {
  return { ipMax: env.API_SECURITY_IP_MAX, userMax: env.API_SECURITY_USER_MAX, windowMs: env.API_SECURITY_WINDOW_MS };
}

function hitCounter(key: string, store: Map<string, { count: number; resetAt: number }>, windowMs: number) {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs };
    store.set(key, next);
    return next;
  }
  existing.count += 1;
  return existing;
}

async function recordSecurityEvent(req: Request, eventType: "REQUEST_SIGNATURE_FAILED" | "CSRF_VALIDATION_FAILED" | "BRUTE_FORCE_ATTEMPT", message: string) {
  log("warn", message, {
    eventType,
    ipAddress: req.ip,
    path: req.originalUrl,
    requestId: req.requestId,
    userAgent: req.get("user-agent"),
  });
  try {
    await prisma.securityEvent.create({
      data: {
        eventType,
        ipAddress: req.ip,
        message,
        metadata: { method: req.method, path: req.originalUrl, requestId: req.requestId },
        severity: eventType === "BRUTE_FORCE_ATTEMPT" ? "HIGH" : "MEDIUM",
        userAgent: req.get("user-agent"),
      },
    });
  } catch {
    // Security event logging should never make the protected request fail differently.
  }
}

function requestSigningSecret() {
  return env.REQUEST_SIGNING_SECRET ?? env.JWT_SECRET;
}

function validSignature(req: Request) {
  const signature = req.get("x-request-signature");
  if (!signature) return true;
  const timestamp = req.get("x-request-timestamp");
  if (!timestamp || Math.abs(Date.now() - Number(timestamp)) > 5 * 60 * 1000) return false;
  const bodyDigest = hashSecurityValue(JSON.stringify(req.body ?? {}));
  const payload = `${req.method}:${req.originalUrl}:${timestamp}:${bodyDigest}`;
  const expected = crypto.createHmac("sha256", requestSigningSecret()).update(payload).digest("hex");
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function validCsrf(req: Request) {
  if (!mutatingMethods.has(req.method)) return true;
  if (!req.cookies?.ecg_refresh_token) return true;
  if (/^\/api\/auth\/(login|register|phone\/request-otp|phone\/verify|oauth\/login|refresh|logout)$/i.test(req.path)) return true;
  const csrfCookie = req.cookies?.ecg_csrf_token;
  const csrfHeader = req.get("x-csrf-token");
  if (!csrfCookie || !csrfHeader || String(csrfCookie).length !== csrfHeader.length) return false;
  return Boolean(csrfCookie && csrfHeader && crypto.timingSafeEqual(Buffer.from(String(csrfCookie)), Buffer.from(csrfHeader)));
}

export async function apiSecurityMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    if (isProbeRequest(req)) {
      next();
      return;
    }

    if (!isProbeRequest(req) && env.NODE_ENV === "production") {
      const { ipMax, userMax, windowMs } = securityLimits();
      const ipBudget = hitCounter(req.ip ?? "unknown", ipHits, windowMs);
      if (ipBudget.count > ipMax) {
        await recordSecurityEvent(req, "BRUTE_FORCE_ATTEMPT", "Per-IP throttle limit exceeded.");
        throw new AppError(429, "Too many requests from this network.", "IP_RATE_LIMITED");
      }

      const userKey = req.get("authorization")?.slice(0, 40);
      if (userKey) {
        const userBudget = hitCounter(userKey, userHits, windowMs);
        if (userBudget.count > userMax) {
          await recordSecurityEvent(req, "BRUTE_FORCE_ATTEMPT", "Per-user throttle limit exceeded.");
          throw new AppError(429, "Too many requests for this user.", "USER_RATE_LIMITED");
        }
      }
    }

    if (!validSignature(req)) {
      await recordSecurityEvent(req, "REQUEST_SIGNATURE_FAILED", "Request signature validation failed.");
      throw new AppError(401, "Request signature is invalid.", "REQUEST_SIGNATURE_INVALID");
    }

    if (!validCsrf(req)) {
      await recordSecurityEvent(req, "CSRF_VALIDATION_FAILED", "CSRF validation failed for cookie-authenticated request.");
      throw new AppError(403, "CSRF token is invalid.", "CSRF_INVALID");
    }

    next();
  } catch (error) {
    next(error);
  }
}
