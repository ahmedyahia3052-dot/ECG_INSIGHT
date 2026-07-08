/** Sprint 83 authentication OpenAPI contract markers for inventory generation. */
export const AUTHENTICATION_OPENAPI_TAG = "authentication";

export const AUTHENTICATION_OPENAPI_PATHS = [
  { method: "POST", path: "/auth/register", summary: "Register enterprise account with Argon2 password hashing" },
  { method: "POST", path: "/auth/login", summary: "Authenticate and issue JWT access + rotating refresh cookie" },
  { method: "POST", path: "/auth/refresh", summary: "Rotate refresh token and issue new access token" },
  { method: "POST", path: "/auth/logout", summary: "Secure logout — revoke current session and clear cookies" },
  { method: "POST", path: "/auth/logout-all", summary: "Revoke all active sessions for authenticated user" },
  { method: "POST", path: "/auth/forgot-password", summary: "Request password reset token" },
  { method: "POST", path: "/auth/reset-password", summary: "Reset password and revoke all sessions" },
  { method: "POST", path: "/auth/verify-email", summary: "Verify email address" },
  { method: "POST", path: "/auth/resend-verification", summary: "Resend email verification token" },
  { method: "POST", path: "/auth/change-password", summary: "Change password for authenticated user" },
] as const;

export const AUTHENTICATION_RBAC_ROLES = [
  "Super Admin",
  "Organization Admin",
  "Doctor",
  "Technician",
  "Student",
] as const;
