import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  institution: z.string().trim().max(120).optional(),
  name: z.string().trim().min(2).max(120),
  password: z.string().min(8).max(128),
  role: z.enum(["doctor", "student"]).default("student"),
  specialization: z.string().trim().max(120).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().default(false),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  newPassword: z.string().min(8).max(128),
  token: z.string().min(12),
});

export const verifyEmailSchema = z.object({
  email: z.string().email(),
  token: z.string().min(12),
});
