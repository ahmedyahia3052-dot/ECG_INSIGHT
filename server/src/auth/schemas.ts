import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().optional(),
  institution: z.string().trim().max(120).optional(),
  name: z.string().trim().min(2).max(120),
  password: z.string().min(8).max(128).optional(),
  phoneNumber: z.string().trim().min(8).max(24).optional(),
  role: z.enum(["admin", "corporate_client", "doctor", "student", "user"]).default("user"),
  specialization: z.string().trim().max(120).optional(),
}).refine((body) => Boolean(body.email || body.phoneNumber), { message: "Email or phone number is required." });

export const loginSchema = z.object({
  email: z.string().email(),
  captchaToken: z.string().optional(),
  password: z.string().min(1),
  rememberMe: z.boolean().default(false),
});

export const requestPhoneOtpSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phoneNumber: z.string().trim().min(8).max(24),
  purpose: z.enum(["LOGIN", "REGISTER"]).default("LOGIN"),
});

export const verifyPhoneOtpSchema = z.object({
  otp: z.string().trim().min(4).max(8),
  phoneNumber: z.string().trim().min(8).max(24),
  rememberMe: z.boolean().default(true),
});

export const oauthLoginSchema = z.object({
  email: z.string().email().optional(),
  idToken: z.string().trim().optional(),
  name: z.string().trim().min(2).max(120).optional(),
  provider: z.enum(["GOOGLE", "APPLE", "MICROSOFT"]),
  providerUserId: z.string().trim().min(2).max(200),
  rememberMe: z.boolean().default(true),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  newPassword: z.string().min(8).max(128),
  token: z.string().min(12),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const updateProfileSchema = z.object({
  institution: z.string().trim().max(120).nullable().optional(),
  name: z.string().trim().min(2).max(120).optional(),
  specialization: z.string().trim().max(120).nullable().optional(),
});

export const ownerPasswordSetupSchema = z.object({
  email: z.string().email(),
  newPassword: z.string().min(12).max(128),
  username: z.string().trim().min(2).max(120),
});

export const verifyEmailSchema = z.object({
  email: z.string().email(),
  token: z.string().min(12),
});
