import fs from "node:fs";

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

function assertContains(path: string, needles: string[]) {
  const content = read(path);
  for (const needle of needles) {
    if (!content.includes(needle)) {
      throw new Error(`${path} is missing required Sprint 36 marker: ${needle}`);
    }
  }
}

assertContains("prisma/schema.prisma", [
  "model MFARecoveryCode",
  "model SecurityPolicy",
  "model PHIEncryptionRecord",
  "model KeyRotationEvent",
  "FAILED_LOGIN",
  "REQUEST_SIGNATURE_FAILED",
  "CSRF_VALIDATION_FAILED",
]);

assertContains("prisma/migrations/20260626203000_sprint36_security_hardening/migration.sql", [
  "CREATE TABLE IF NOT EXISTS \"MFARecoveryCode\"",
  "CREATE TABLE IF NOT EXISTS \"SecurityPolicy\"",
  "CREATE TABLE IF NOT EXISTS \"PHIEncryptionRecord\"",
  "CREATE TABLE IF NOT EXISTS \"KeyRotationEvent\"",
]);

assertContains("server/src/auth/auth.service.ts", [
  "assertPasswordNotReused",
  "FAILED_LOGIN",
  "Refresh token reuse detected.",
  "MAX_CONCURRENT_SESSIONS",
]);

assertContains("server/src/middleware/api-security.ts", [
  "REQUEST_SIGNATURE_FAILED",
  "CSRF_VALIDATION_FAILED",
  "Per-IP throttle limit exceeded.",
  "Per-user throttle limit exceeded.",
]);

assertContains("server/src/modules/security/security.routes.ts", [
  "/mfa/recovery/verify",
  "/monitoring/summary",
  "/policies",
  "/phi/encryption-records",
  "/keys/rotate",
]);

assertContains("server/src/modules/compliance/compliance.routes.ts", [
  "/patients/:patientId/export",
  "/retention-policies",
  "DATA_EXPORTED",
  "DATA_DELETED",
]);

assertContains("artifacts/ecg-insight/components/enterprise/EnterpriseUI.tsx", [
  "ProtectedRoute",
  "EnterpriseShell",
  "/settings",
  "/admin-dashboard",
  "/owner/licenses",
]);

assertContains("artifacts/ecg-insight/app/(protected)/settings.tsx", [
  "Workspace Settings",
  "High Contrast Clinical Mode",
  "Reduce Motion",
]);

assertContains("SPRINT_36_SECURITY_HARDENING_REPORT.md", [
  "Enterprise Authentication Hardening",
  "API Security",
  "Data Protection",
  "Compliance Platform",
  "Security Monitoring",
]);

console.log("Sprint 36 security hardening integration checks passed.");
