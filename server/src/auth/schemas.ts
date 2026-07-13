import { z } from "zod";

export const registrationRoles = [
  "Doctor",
  "Cardiologist",
  "Electrophysiologist",
  "Resident",
  "Resident Physician",
  "Medical Student",
  "General Practitioner",
  "Nurse",
  "Technician",
  "Administrator",
  "Researcher",
  "Occupational Physician",
  "Occupational Health Physician",
  "Consultant",
] as const;

export const accountTypes = [
  "INDIVIDUAL",
  "HOSPITAL",
  "CLINIC",
  "HEALTHCARE_ORGANIZATION",
  "COMPANY",
  "ENTERPRISE_ORGANIZATION",
  "UNIVERSITY",
  "RESEARCH_CENTER",
  "ORGANIZATION",
] as const;

export const organizationTypes = [
  "Hospital",
  "Clinic",
  "Company",
  "Occupational Health Center",
  "University",
  "Medical School",
  "Healthcare Network",
  "Healthcare Organization",
  "Research Center",
  "Government Institution",
] as const;

export const registerSchema = z.object({
  accountType: z.enum(accountTypes).default("INDIVIDUAL"),
  department: z.string().trim().max(120).optional(),
  employeeId: z.string().trim().max(80).optional(),
  email: z.string().email().optional(),
  institution: z.string().trim().max(120).optional(),
  name: z.string().trim().min(2).max(120),
  organizationCity: z.string().trim().max(120).optional(),
  organizationCountry: z.string().trim().max(120).optional(),
  organizationEmail: z.string().email().optional(),
  organizationName: z.string().trim().max(160).optional(),
  organizationType: z.enum(organizationTypes).optional(),
  password: z.string().min(8).max(128).optional(),
  phoneNumber: z.string().trim().min(8).max(24).optional(),
  positionTitle: z.string().trim().max(120).optional(),
  role: z.enum(["admin", "corporate_client", "doctor", "organization_admin", "student", "technician", "user"]).default("user"),
  registrationRole: z.enum(registrationRoles).optional(),
  specialization: z.string().trim().max(120).optional(),
}).refine((body) => Boolean(body.email || body.phoneNumber), { message: "Email or phone number is required." })
  .refine((body) => body.accountType === "INDIVIDUAL" || Boolean(body.organizationName && body.organizationCountry && body.organizationEmail && body.department && body.employeeId && body.positionTitle), {
    message: "Organization name, department, employee ID, position, organization email, and country are required for non-individual accounts.",
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
  idToken: z.string().trim().min(20),
  name: z.string().trim().min(2).max(120).optional(),
  provider: z.enum(["GOOGLE", "APPLE", "MICROSOFT", "FACEBOOK", "LINKEDIN"]),
  providerUserId: z.string().trim().min(2).max(200),
  rememberMe: z.boolean().default(true),
});

export const mfaVerifySchema = z.object({
  code: z.string().trim().min(4).max(32),
  mfaToken: z.string().min(20),
  rememberMe: z.boolean().optional(),
});

export const webAuthnLoginOptionsSchema = z.object({
  email: z.string().email(),
});

export const webAuthnLoginVerifySchema = z.object({
  email: z.string().email(),
  rememberMe: z.boolean().default(true),
  response: z.record(z.string(), z.unknown()),
});

export const webAuthnRegisterVerifySchema = z.object({
  friendlyName: z.string().trim().max(80).optional(),
  response: z.record(z.string(), z.unknown()),
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
  department: z.string().trim().max(120).nullable().optional(),
  employeeId: z.string().trim().max(80).nullable().optional(),
  institution: z.string().trim().max(120).nullable().optional(),
  name: z.string().trim().min(2).max(120).optional(),
  organizationCountry: z.string().trim().max(120).nullable().optional(),
  organizationEmail: z.string().email().nullable().optional(),
  organizationName: z.string().trim().max(160).nullable().optional(),
  organizationType: z.enum(organizationTypes).nullable().optional(),
  positionTitle: z.string().trim().max(120).nullable().optional(),
  specialization: z.string().trim().max(120).nullable().optional(),
});

export const updateEmailSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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

export const authModuleSettingsSchema = z.object({
  emailVerificationRequired: z.boolean().optional(),
  mfaRequired: z.boolean().optional(),
  rememberMeEnabled: z.boolean().optional(),
  passkeysEnabled: z.boolean().optional(),
  biometricsEnabled: z.boolean().optional(),
  sessionLifetimeSeconds: z.number().int().min(300).max(60 * 60 * 24 * 90).optional(),
  rememberMeLifetimeSeconds: z.number().int().min(3600).max(60 * 60 * 24 * 365).optional(),
  passwordMinLength: z.number().int().min(8).max(128).optional(),
  passwordRequireUppercase: z.boolean().optional(),
  passwordRequireLowercase: z.boolean().optional(),
  passwordRequireNumber: z.boolean().optional(),
  passwordRequireSymbol: z.boolean().optional(),
  passwordHistoryCount: z.number().int().min(1).max(24).optional(),
});
