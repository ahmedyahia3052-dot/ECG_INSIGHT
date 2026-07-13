import { Router } from "express";
import { prisma } from "../config/prisma";
import { authRateLimitMiddleware } from "../middleware/auth-rate-limit";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { redactAuthSecrets } from "../utils/auth-response-safety";
import { serializeUser } from "../utils/users";
import { completeOAuth, oauthProviderStatuses, startOAuth } from "./oauth-passport";
import { verifyOAuthIdToken } from "./oauth-token-verify";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  mfaVerifySchema,
  oauthLoginSchema,
  ownerPasswordSetupSchema,
  requestPhoneOtpSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyPhoneOtpSchema,
  verifyEmailSchema,
  webAuthnLoginOptionsSchema,
  webAuthnLoginVerifySchema,
  webAuthnRegisterVerifySchema,
} from "./schemas";
import {
  changeOwnPassword,
  loginUser,
  logoutSession,
  logoutAllSessions,
  oauthLogin,
  refreshSession,
  registerUser,
  requestPhoneOtp,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  setupOwnerPassword,
  organizationTypeForRegistration,
  verifyPhoneOtp,
  verifyEmail,
} from "./auth.service";
import { verifyLoginMfa } from "./mfa-challenge.service";
import {
  authenticationOptions,
  listCredentials,
  registrationOptions,
  removeCredential,
  verifyAuthentication,
  verifyRegistration,
  webAuthnStatus,
} from "./webauthn.service";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";

export const authRouter = Router();

authRouter.use(authRateLimitMiddleware);

authRouter.get("/email-availability", async (req, res, next) => {
  try {
    const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ available: false, message: "Valid email is required." });
      return;
    }
    const existing = await prisma.user.findUnique({ select: { id: true }, where: { email } });
    res.json({ available: !existing });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/register", validateBody(registerSchema), async (req, res, next) => {
  try {
    const payload = await registerUser(req.body, req, res);
    res.status(201).json(redactAuthSecrets(payload));
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    res.json(await loginUser(req.body, req, res));
  } catch (error) {
    next(error);
  }
});

authRouter.post("/phone/request-otp", validateBody(requestPhoneOtpSchema), async (req, res, next) => {
  try {
    res.status(201).json(redactAuthSecrets(await requestPhoneOtp(req.body)));
  } catch (error) {
    next(error);
  }
});

authRouter.post("/phone/verify", validateBody(verifyPhoneOtpSchema), async (req, res, next) => {
  try {
    res.json(await verifyPhoneOtp(req.body, req, res));
  } catch (error) {
    next(error);
  }
});

authRouter.get("/oauth/providers", async (_req, res, next) => {
  try {
    res.json({ providers: await oauthProviderStatuses() });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/oauth/google", startOAuth("GOOGLE"));
authRouter.get("/oauth/google/callback", ...completeOAuth("GOOGLE"));
authRouter.get("/oauth/apple", startOAuth("APPLE"));
authRouter.get("/oauth/apple/callback", ...completeOAuth("APPLE"));
authRouter.get("/oauth/microsoft", startOAuth("MICROSOFT"));
authRouter.get("/oauth/microsoft/callback", ...completeOAuth("MICROSOFT"));
authRouter.get("/oauth/facebook", startOAuth("FACEBOOK"));
authRouter.get("/oauth/facebook/callback", ...completeOAuth("FACEBOOK"));
authRouter.get("/oauth/linkedin", startOAuth("LINKEDIN"));
authRouter.get("/oauth/linkedin/callback", ...completeOAuth("LINKEDIN"));

authRouter.get("/google", startOAuth("GOOGLE"));
authRouter.get("/google/callback", ...completeOAuth("GOOGLE"));
authRouter.get("/apple", startOAuth("APPLE"));
authRouter.get("/apple/callback", ...completeOAuth("APPLE"));
authRouter.get("/microsoft", startOAuth("MICROSOFT"));
authRouter.get("/microsoft/callback", ...completeOAuth("MICROSOFT"));
authRouter.get("/facebook", startOAuth("FACEBOOK"));
authRouter.get("/facebook/callback", ...completeOAuth("FACEBOOK"));
authRouter.get("/linkedin", startOAuth("LINKEDIN"));
authRouter.get("/linkedin/callback", ...completeOAuth("LINKEDIN"));

authRouter.post("/oauth/login", validateBody(oauthLoginSchema), async (req, res, next) => {
  try {
    const verified = await verifyOAuthIdToken({
      provider: req.body.provider,
      idToken: req.body.idToken,
      providerUserId: req.body.providerUserId,
      email: req.body.email,
    });
    res.json(
      await oauthLogin(
        {
          ...req.body,
          email: verified.email ?? req.body.email,
          providerUserId: verified.providerUserId,
        },
        req,
        res,
      ),
    );
  } catch (error) {
    next(error);
  }
});

authRouter.post("/mfa/verify", validateBody(mfaVerifySchema), async (req, res, next) => {
  try {
    res.json(await verifyLoginMfa(req.body, req, res));
  } catch (error) {
    next(error);
  }
});

authRouter.get("/webauthn/status", (_req, res) => {
  res.json(webAuthnStatus());
});

authRouter.post("/webauthn/register/options", requireAuth, async (req, res, next) => {
  try {
    res.json(await registrationOptions(req.auth!.id));
  } catch (error) {
    next(error);
  }
});

authRouter.post("/webauthn/register/verify", requireAuth, validateBody(webAuthnRegisterVerifySchema), async (req, res, next) => {
  try {
    res.json(
      await verifyRegistration(
        req.auth!.id,
        req.body.response as RegistrationResponseJSON,
        req.body.friendlyName,
      ),
    );
  } catch (error) {
    next(error);
  }
});

authRouter.post("/webauthn/login/options", validateBody(webAuthnLoginOptionsSchema), async (req, res, next) => {
  try {
    res.json(await authenticationOptions(req.body.email));
  } catch (error) {
    next(error);
  }
});

authRouter.post("/webauthn/login/verify", validateBody(webAuthnLoginVerifySchema), async (req, res, next) => {
  try {
    res.json(
      await verifyAuthentication(
        {
          email: req.body.email,
          rememberMe: req.body.rememberMe,
          response: req.body.response as AuthenticationResponseJSON,
        },
        req,
        res,
      ),
    );
  } catch (error) {
    next(error);
  }
});

authRouter.get("/webauthn/credentials", requireAuth, async (req, res, next) => {
  try {
    res.json(await listCredentials(req.auth!.id));
  } catch (error) {
    next(error);
  }
});

authRouter.delete("/webauthn/credentials/:id", requireAuth, async (req, res, next) => {
  try {
    const credentialId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    res.json(await removeCredential(req.auth!.id, credentialId));
  } catch (error) {
    next(error);
  }
});

authRouter.post("/owner/setup-password", validateBody(ownerPasswordSetupSchema), async (req, res, next) => {
  try {
    await setupOwnerPassword(req.body);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    await logoutSession(req, res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout-all", requireAuth, async (req, res, next) => {
  try {
    await logoutAllSessions(req.auth!.id, res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    res.json(await refreshSession(req, res));
  } catch (error) {
    next(error);
  }
});

authRouter.post(
  "/forgot-password",
  validateBody(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      const { resetToken } = await requestPasswordReset(req.body.email);
      res.json(
        redactAuthSecrets({
          message: "If an account exists, password reset instructions have been generated.",
          resetToken,
        }),
      );
    } catch (error) {
      next(error);
    }
  },
);

authRouter.post("/reset-password", validateBody(resetPasswordSchema), async (req, res, next) => {
  try {
    await resetPassword(req.body);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

authRouter.post("/verify-email", validateBody(verifyEmailSchema), async (req, res, next) => {
  try {
    await verifyEmail(req.body);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

authRouter.post("/resend-verification", validateBody(resendVerificationSchema), async (req, res, next) => {
  try {
    res.json(redactAuthSecrets(await resendVerificationEmail(req.body.email)));
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.id },
      include: { organization: true, subscription: true },
    });
    res.json({ user: user ? serializeUser(user) : null });
  } catch (error) {
    next(error);
  }
});

authRouter.patch("/me", requireAuth, validateBody(updateProfileSchema), async (req, res, next) => {
  try {
    const user = await prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id: req.auth!.id } });
      const hasOrganizationUpdate = req.body.organizationName !== undefined || req.body.organizationCountry !== undefined || req.body.organizationEmail !== undefined || req.body.organizationType !== undefined;
      let organizationId = current?.organizationId ?? null;

      if (hasOrganizationUpdate && current) {
        if (organizationId) {
          await tx.organization.update({
            data: {
              country: req.body.organizationCountry,
              email: req.body.organizationEmail,
              name: req.body.organizationName ?? undefined,
              type: req.body.organizationType ? organizationTypeForRegistration(req.body.organizationType) : undefined,
            },
            where: { id: organizationId },
          });
        } else if (req.body.organizationName) {
          const organization = await tx.organization.create({
            data: {
              country: req.body.organizationCountry ?? undefined,
              email: req.body.organizationEmail ?? current.email,
              name: req.body.organizationName,
              type: organizationTypeForRegistration(req.body.organizationType ?? undefined),
            },
          });
          organizationId = organization.id;
        }
      }

      return tx.user.update({
        data: {
          department: req.body.department,
          employeeId: req.body.employeeId,
          institution: req.body.institution ?? req.body.organizationName,
          name: req.body.name,
          organizationId,
          positionTitle: req.body.positionTitle,
          specialization: req.body.specialization,
        },
        include: { organization: true, subscription: true },
        where: { id: req.auth!.id },
      });
    });
    res.json({ user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/change-password", requireAuth, validateBody(changePasswordSchema), async (req, res, next) => {
  try {
    await changeOwnPassword(req.auth!.id, req.body);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
