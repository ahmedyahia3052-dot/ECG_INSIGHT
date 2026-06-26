import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { serializeUser } from "../utils/users";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  oauthLoginSchema,
  ownerPasswordSetupSchema,
  requestPhoneOtpSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyPhoneOtpSchema,
  verifyEmailSchema,
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
  verifyPhoneOtp,
  verifyEmail,
} from "./auth.service";

export const authRouter = Router();

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
    res.status(201).json(payload);
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
    res.status(201).json(await requestPhoneOtp(req.body));
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

authRouter.post("/oauth/login", validateBody(oauthLoginSchema), async (req, res, next) => {
  try {
    res.json(await oauthLogin(req.body, req, res));
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
      res.json({
        message: "If an account exists, password reset instructions have been generated.",
        resetToken,
      });
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
    res.json(await resendVerificationEmail(req.body.email));
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.id },
      include: { subscription: true },
    });
    res.json({ user: user ? serializeUser(user) : null });
  } catch (error) {
    next(error);
  }
});

authRouter.patch("/me", requireAuth, validateBody(updateProfileSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      data: {
        institution: req.body.institution,
        name: req.body.name,
        specialization: req.body.specialization,
      },
      include: { subscription: true },
      where: { id: req.auth!.id },
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
