import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  listProviderAdminViews,
  testProviderConnection,
  upsertProviderConfig,
  type OAuthProvider,
} from "./auth-provider-config.service";
import { reconfigureOAuthPassport } from "./oauth-passport";
import { webAuthnStatus } from "./webauthn.service";

export const authAdminRouter = Router();

authAdminRouter.use(requireAuth, requireRole("OWNER", "SUPER_ADMIN", "ADMIN"));

authAdminRouter.get("/auth-providers", async (_req, res, next) => {
  try {
    const [oauth, webauthn] = await Promise.all([listProviderAdminViews(), Promise.resolve(webAuthnStatus())]);
    res.json({ ...oauth, webauthn });
  } catch (error) {
    next(error);
  }
});

const upsertSchema = z.object({
  enabled: z.boolean(),
  clientId: z.string().trim().min(1).max(500).optional(),
  clientSecret: z.string().trim().min(1).max(2000).optional(),
  redirectUri: z.string().url().optional(),
  scopes: z.array(z.string().trim().min(1)).optional(),
  appleTeamId: z.string().trim().optional(),
  appleKeyId: z.string().trim().optional(),
  applePrivateKey: z.string().trim().optional(),
});

authAdminRouter.put("/auth-providers/:provider", validateBody(upsertSchema), async (req, res, next) => {
  try {
    const provider = String(req.params.provider).toUpperCase() as OAuthProvider;
    const allowed: OAuthProvider[] = ["GOOGLE", "APPLE", "MICROSOFT", "FACEBOOK", "LINKEDIN"];
    if (!allowed.includes(provider)) {
      res.status(400).json({ message: "Unknown provider." });
      return;
    }
    await upsertProviderConfig(provider, req.body, req.auth?.id);
    await reconfigureOAuthPassport();
    res.json(await listProviderAdminViews());
  } catch (error) {
    next(error);
  }
});

authAdminRouter.post("/auth-providers/:provider/test", async (req, res, next) => {
  try {
    const provider = String(req.params.provider).toUpperCase() as OAuthProvider;
    res.json(await testProviderConnection(provider));
  } catch (error) {
    next(error);
  }
});
