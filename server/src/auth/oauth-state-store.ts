/**
 * Durable OAuth state + PKCE store (works with passport session:false).
 */
import crypto from "node:crypto";
import type { Request } from "express";
import { prisma } from "../config/prisma";

const TTL_MS = 10 * 60 * 1000;

type StoreCallback = (err: Error | null, state?: string) => void;
type VerifyCallback = (err: Error | null, ok?: boolean, state?: unknown) => void;

export const oauthStateStore = {
  store(req: Request, metaOrCb: unknown, maybeCb?: StoreCallback) {
    const callback = (typeof metaOrCb === "function" ? metaOrCb : maybeCb) as StoreCallback;
    const meta = typeof metaOrCb === "function" ? {} : ((metaOrCb as Record<string, unknown>) ?? {});
    void (async () => {
      try {
        const state = crypto.randomBytes(24).toString("base64url");
        const codeVerifier =
          typeof meta.code_verifier === "string"
            ? meta.code_verifier
            : crypto.randomBytes(32).toString("base64url");
        const nonce = crypto.randomBytes(16).toString("base64url");
        await prisma.oAuthState.create({
          data: {
            state,
            codeVerifier,
            nonce,
            provider: typeof req.query.provider === "string" ? req.query.provider : null,
            expiresAt: new Date(Date.now() + TTL_MS),
          },
        });
        // Attach nonce for Apple strategies that read from request.
        (req as Request & { oauthNonce?: string }).oauthNonce = nonce;
        callback(null, state);
      } catch (error) {
        callback(error instanceof Error ? error : new Error("Unable to store OAuth state."));
      }
    })();
  },

  verify(req: Request, state: string, metaOrCb: unknown, maybeCb?: VerifyCallback) {
    const callback = (typeof metaOrCb === "function" ? metaOrCb : maybeCb) as VerifyCallback;
    void (async () => {
      try {
        if (!state) {
          callback(null, false);
          return;
        }
        const row = await prisma.oAuthState.findUnique({ where: { state } });
        if (!row || row.expiresAt <= new Date()) {
          if (row) await prisma.oAuthState.delete({ where: { id: row.id } }).catch(() => undefined);
          callback(null, false);
          return;
        }
        await prisma.oAuthState.delete({ where: { id: row.id } }).catch(() => undefined);
        (req as Request & { oauthNonce?: string; oauthCodeVerifier?: string }).oauthNonce = row.nonce ?? undefined;
        (req as Request & { oauthCodeVerifier?: string }).oauthCodeVerifier = row.codeVerifier ?? undefined;
        callback(null, true, { code_verifier: row.codeVerifier, nonce: row.nonce });
      } catch (error) {
        callback(error instanceof Error ? error : new Error("Unable to verify OAuth state."));
      }
    })();
  },
};
