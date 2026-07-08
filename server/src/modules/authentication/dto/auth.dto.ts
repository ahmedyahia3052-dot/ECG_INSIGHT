/** Re-export DTO validation schemas for the authentication module. */
export {
  accountTypes,
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  oauthLoginSchema,
  organizationTypes,
  ownerPasswordSetupSchema,
  registerSchema,
  registrationRoles,
  requestPhoneOtpSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
  verifyPhoneOtpSchema,
} from "../../../auth/schemas";

export type { AuthenticationApiRole } from "../domain/roles";
