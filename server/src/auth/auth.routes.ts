import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { serializeUser } from "../utils/users";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./schemas";
import {
  loginUser,
  logoutSession,
  refreshSession,
  registerUser,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
} from "./auth.service";

export const authRouter = Router();

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

authRouter.post("/logout", async (req, res, next) => {
  try {
    await logoutSession(req, res);
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
