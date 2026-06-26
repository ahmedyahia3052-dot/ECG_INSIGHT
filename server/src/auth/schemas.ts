import { z } from "zod";

export const registrationRoles = [
  "Doctor",
  "Cardiologist",
  "Resident Physician",
  "Medical Student",
  "Nurse",
  "Technician",
  "Occupational Health Physician",
  "Administrator",
] as const;

export const accountTypes = ["INDIVIDUAL", "ORGANIZATION"] as const;

export const organizationTypes = [
  "Hospital",
  "Clinic",
  "Company",
  "Occupational Health Center",
  "University",
  "Medical School",
  "Healthcare Network",
  "Government Institution",
] as const;

export const registerSchema = z.object({
  accountType: z.enum(accountTypes).default("INDIVIDUAL"),
  email: z.string().email().optional(),
  institution: z.string().trim().max(120).optional(),
  name: z.string().trim().min(2).max(120),
  organizationCity: z.string().trim().max(120).optional(),
  organizationCountry: z.string().trim().max(120).optional(),
  organizationName: z.string().trim().max(160).optional(),
  organizationType: z.enum(organizationTypes).optional(),
  password: z.string().min(8).max(128).optional(),
  phoneNumber: z.string().trim().min(8).max(24).optional(),
  role: z.enum(["admin", "corporate_client", "doctor", "student", "user"]).default("user"),
  registrationRole: z.enum(registrationRoles),
  specialization: z.string().trim().max(120).optional(),
}).refine((body) => Boolean(body.email || body.phoneNumber), { message: "Email or phone number is required." })
  .refine((body) => body.accountType === "INDIVIDUAL" || Boolean(body.organizationName && body.organizationType && body.organizationCountry && body.organizationCity), {
    message: "Organization name, type, country, and city are required for organization accounts.",
  });

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
