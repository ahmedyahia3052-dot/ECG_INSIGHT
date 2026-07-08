/** Sprint 87 clinical case management OpenAPI contract markers. */
export const CLINICAL_CASE_MANAGEMENT_OPENAPI_TAG = "clinical-case-management";

export const CLINICAL_CASE_MANAGEMENT_OPENAPI_PATHS = [
  { method: "GET", path: "/clinical-case-management/cases/:caseId", summary: "Get case with unified lifecycle state" },
  { method: "POST", path: "/clinical-case-management/cases/:caseId/lifecycle", summary: "Transition case lifecycle" },
  { method: "GET", path: "/clinical-case-management/cases/:caseId/timeline", summary: "Unified timeline (events + audit)" },
  { method: "GET", path: "/clinical-case-management/cases/:caseId/events", summary: "Case events (CaseHistory)" },
  { method: "GET", path: "/clinical-case-management/cases/:caseId/audit", summary: "Audit history" },
  { method: "GET", path: "/clinical-case-management/cases/:caseId/status-history", summary: "Status change history" },
  { method: "POST", path: "/clinical-case-management/cases/:caseId/notes", summary: "Add clinical/doctor/internal note" },
  { method: "POST", path: "/clinical-case-management/cases/:caseId/reviewer", summary: "Assign reviewer" },
  { method: "POST", path: "/clinical-case-management/cases/:caseId/reassign", summary: "Reassign case reviewer" },
  { method: "POST", path: "/clinical-case-management/cases/:caseId/lock", summary: "Acquire review lock" },
  { method: "POST", path: "/clinical-case-management/cases/:caseId/versions/:versionId/restore", summary: "Restore case version" },
] as const;
