import type { Request, Response } from "express";
import { env, isProduction } from "../../../config/env";
import { createOpaqueToken } from "../../../utils/crypto";
import { CSRF_COOKIE, REFRESH_COOKIE } from "../domain/constants";

function cookieOptions(maxAgeSeconds?: number, httpOnly = true) {
  return {
    domain: env.COOKIE_DOMAIN,
    httpOnly,
    maxAge: maxAgeSeconds ? maxAgeSeconds * 1000 : undefined,
    path: "/",
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    secure: isProduction,
  };
}

function csrfCookieOptions(maxAgeSeconds?: number) {
  return cookieOptions(maxAgeSeconds, false);
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
  res.clearCookie(CSRF_COOKIE, csrfCookieOptions());
}

export function setRefreshCookie(res: Response, token: string, maxAgeSeconds: number) {
  res.cookie(REFRESH_COOKIE, token, cookieOptions(maxAgeSeconds));
  res.cookie(CSRF_COOKIE, createOpaqueToken(32), csrfCookieOptions(maxAgeSeconds));
}

export function readRefreshCookie(req: Request): string | null {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  return typeof refreshToken === "string" ? refreshToken : null;
}

export function sessionRequestMeta(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined,
  };
}

export function deviceNameFromRequest(req: Request) {
  return req.get("sec-ch-ua-platform") ?? undefined;
}
