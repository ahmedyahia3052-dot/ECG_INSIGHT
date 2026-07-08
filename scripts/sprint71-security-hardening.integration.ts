import fs from "node:fs";

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

function assertContains(path: string, needles: string[]) {
  const content = read(path);
  for (const needle of needles) {
    if (!content.includes(needle)) {
      throw new Error(`${path} is missing required Sprint 71 marker: ${needle}`);
    }
  }
}

assertContains("server/src/middleware/auth-rate-limit.ts", [
  "authRateLimitMiddleware",
  "AUTH_RATE_LIMIT_MAX",
]);

assertContains("server/src/utils/auth-response-safety.ts", [
  "redactAuthSecrets",
  "resetToken",
  "emailVerificationToken",
]);

assertContains("server/src/utils/upload-security.ts", [
  "assertUploadContentMatchesMime",
  "INVALID_FILE_CONTENT",
]);

assertContains("server/src/utils/upload-access.ts", [
  "assertEcgFileDownloadAccess",
  "resolveAuthorizedSignedDownloadPath",
  "INVALID_FILE_PATH",
]);

assertContains("server/src/uploads/uploads.routes.ts", [
  "assertUploadContentMatchesMime",
  "assertEcgFileDownloadAccess",
  "canAccessCase",
]);

assertContains("server/src/modules/security/security.routes.ts", [
  "resolveAuthorizedSignedDownloadPath",
]);

assertContains("server/src/modules/audit/audit.routes.ts", [
  "clientAuditActionSchema",
  "PATIENT_VIEWED",
  "REPORT_VIEWED",
  "REPORT_DOWNLOADED",
]);

assertContains("server/src/realtime/realtime.service.ts", [
  "socketAllowedOrigins",
  "socket.data.auth?.id === userId",
]);

assertContains("server/src/users/users.routes.ts", [
  "IMPERSONATION_STARTED",
]);

assertContains("server/src/config/env.ts", [
  "PHI_ENCRYPTION_KEY",
  "REQUEST_SIGNING_SECRET",
  "DOWNLOAD_TOKEN_SECRET",
  "AUTH_RATE_LIMIT_MAX",
]);

assertContains("SPRINT71_ENTERPRISE_SECURITY_REPORT.md", [
  "Enterprise Security Report",
  "Authentication",
  "Authorization",
  "Recommendations",
]);

console.log("Sprint 71 enterprise security hardening integration markers: PASS");
