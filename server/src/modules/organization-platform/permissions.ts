/** Sprint 55 — Enterprise permission keys. */
export const ENTERPRISE_PERMISSIONS = [
  "patient.create",
  "patient.delete",
  "patient.view",
  "ecg.analyze",
  "ecg.upload",
  "report.approve",
  "report.export_pdf",
  "ai.view",
  "ai.manage",
  "billing.manage",
  "user.manage",
  "user.invite",
  "device.manage",
  "audit.access",
  "organization.manage",
  "department.manage",
  "branch.manage",
  "branding.manage",
  "subscription.manage",
  "settings.manage",
  "notification.manage",
] as const;

export type EnterprisePermission = (typeof ENTERPRISE_PERMISSIONS)[number];

export const SYSTEM_ROLE_DEFINITIONS = [
  { slug: "developer", name: "Developer", permissions: ENTERPRISE_PERMISSIONS as unknown as string[] },
  { slug: "super_admin", name: "Super Admin", permissions: ENTERPRISE_PERMISSIONS as unknown as string[] },
  {
    slug: "organization_admin",
    name: "Organization Admin",
    permissions: [
      "patient.create", "patient.delete", "patient.view", "ecg.analyze", "ecg.upload",
      "report.approve", "report.export_pdf", "ai.view", "billing.manage", "user.manage",
      "user.invite", "device.manage", "audit.access", "organization.manage",
      "department.manage", "branch.manage", "branding.manage", "subscription.manage",
      "settings.manage", "notification.manage",
    ],
  },
  {
    slug: "medical_director",
    name: "Medical Director",
    permissions: ["patient.view", "ecg.analyze", "report.approve", "report.export_pdf", "ai.view", "audit.access"],
  },
  { slug: "consultant", name: "Consultant", permissions: ["patient.view", "ecg.analyze", "report.approve", "ai.view"] },
  { slug: "doctor", name: "Doctor", permissions: ["patient.create", "patient.view", "ecg.analyze", "ecg.upload", "report.export_pdf", "ai.view"] },
  { slug: "resident", name: "Resident", permissions: ["patient.view", "ecg.analyze", "ai.view"] },
  { slug: "technician", name: "Technician", permissions: ["patient.view", "ecg.upload", "ecg.analyze"] },
  { slug: "nurse", name: "Nurse", permissions: ["patient.view", "ecg.upload"] },
  { slug: "reception", name: "Reception", permissions: ["patient.create", "patient.view"] },
  { slug: "auditor", name: "Auditor", permissions: ["audit.access", "patient.view"] },
  { slug: "researcher", name: "Researcher", permissions: ["patient.view", "ecg.analyze", "ai.view", "report.export_pdf"] },
  { slug: "student", name: "Student", permissions: ["patient.view", "ai.view"] },
  { slug: "viewer", name: "Viewer", permissions: ["patient.view"] },
] as const;

export const DEPARTMENT_PRESETS = [
  "CARDIOLOGY",
  "EMERGENCY",
  "ICU",
  "CCU",
  "INTERNAL_MEDICINE",
  "OCCUPATIONAL_MEDICINE",
  "OUTPATIENT_CLINIC",
  "ADMINISTRATION",
] as const;

export const SUBSCRIPTION_PLAN_LIMITS = {
  FREE: { storageLimitMb: 1024, aiCreditsMonthly: 10, ecgAnalysisLimit: 25, teamLimit: 3 },
  BASIC: { storageLimitMb: 5120, aiCreditsMonthly: 50, ecgAnalysisLimit: 100, teamLimit: 10 },
  PROFESSIONAL: { storageLimitMb: 20480, aiCreditsMonthly: 200, ecgAnalysisLimit: 500, teamLimit: 50 },
  ENTERPRISE: { storageLimitMb: 102400, aiCreditsMonthly: 2000, ecgAnalysisLimit: 10000, teamLimit: 500 },
  LIFETIME: { storageLimitMb: 512000, aiCreditsMonthly: 10000, ecgAnalysisLimit: 100000, teamLimit: 1000 },
  CLINIC: { storageLimitMb: 10240, aiCreditsMonthly: 100, ecgAnalysisLimit: 300, teamLimit: 25 },
  HOSPITAL: { storageLimitMb: 51200, aiCreditsMonthly: 500, ecgAnalysisLimit: 2000, teamLimit: 200 },
  UNLIMITED: { storageLimitMb: 999999, aiCreditsMonthly: 99999, ecgAnalysisLimit: 999999, teamLimit: 9999 },
} as const;
