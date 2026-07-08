import type { CaseManagementStatus, ECGCaseStatus } from "@prisma/client";

/** Sprint 87 unified case lifecycle (7 states). */
export const CLINICAL_CASE_LIFECYCLE = [
  "draft",
  "uploaded",
  "processing",
  "pending_review",
  "reviewed",
  "finalized",
  "archived",
] as const;

export type ClinicalCaseLifecycle = (typeof CLINICAL_CASE_LIFECYCLE)[number];

const LIFECYCLE_ORDER: Record<ClinicalCaseLifecycle, number> = {
  archived: 6,
  draft: 0,
  finalized: 5,
  pending_review: 3,
  processing: 2,
  reviewed: 4,
  uploaded: 1,
};

const FORWARD_TRANSITIONS: Record<ClinicalCaseLifecycle, ClinicalCaseLifecycle[]> = {
  archived: [],
  draft: ["uploaded", "archived"],
  finalized: ["archived"],
  pending_review: ["reviewed", "archived"],
  processing: ["pending_review", "archived"],
  reviewed: ["finalized", "archived"],
  uploaded: ["processing", "archived"],
};

export function lifecycleFromManagementStatus(status: CaseManagementStatus): ClinicalCaseLifecycle {
  switch (status) {
    case "ARCHIVED":
      return "archived";
    case "FINALIZED":
    case "SIGNED":
    case "CONFIRMED":
      return "finalized";
    case "REVIEWED":
      return "reviewed";
    case "PENDING_REVIEW":
      return "pending_review";
    case "PROCESSING":
      return "processing";
    case "UPLOADED":
      return "uploaded";
    default:
      return "draft";
  }
}

export function lifecycleFromCaseStatus(status: ECGCaseStatus): ClinicalCaseLifecycle {
  switch (status) {
    case "ARCHIVED":
      return "archived";
    case "FINALIZED":
    case "SIGNED":
    case "APPROVED":
      return "finalized";
    case "REVIEWED":
      return "reviewed";
    case "UNDER_REVIEW":
    case "AWAITING_SECOND_OPINION":
    case "ESCALATED":
    case "AI_COMPLETED":
      return "pending_review";
    case "PROCESSING":
      return "processing";
    case "UPLOADED":
      return "uploaded";
    default:
      return "draft";
  }
}

export function resolveClinicalLifecycle(input: {
  managementStatus: CaseManagementStatus;
  status: ECGCaseStatus;
}): ClinicalCaseLifecycle {
  const fromManagement = lifecycleFromManagementStatus(input.managementStatus);
  const fromCase = lifecycleFromCaseStatus(input.status);
  return LIFECYCLE_ORDER[fromManagement] >= LIFECYCLE_ORDER[fromCase] ? fromManagement : fromCase;
}

export function managementStatusForLifecycle(lifecycle: ClinicalCaseLifecycle): CaseManagementStatus {
  const map: Record<ClinicalCaseLifecycle, CaseManagementStatus> = {
    archived: "ARCHIVED",
    draft: "DRAFT",
    finalized: "FINALIZED",
    pending_review: "PENDING_REVIEW",
    processing: "PROCESSING",
    reviewed: "REVIEWED",
    uploaded: "UPLOADED",
  };
  return map[lifecycle];
}

export function ecgCaseStatusForLifecycle(lifecycle: ClinicalCaseLifecycle): ECGCaseStatus {
  const map: Record<ClinicalCaseLifecycle, ECGCaseStatus> = {
    archived: "ARCHIVED",
    draft: "NEW",
    finalized: "FINALIZED",
    pending_review: "UNDER_REVIEW",
    processing: "PROCESSING",
    reviewed: "REVIEWED",
    uploaded: "UPLOADED",
  };
  return map[lifecycle];
}

export function assertLifecycleTransition(from: ClinicalCaseLifecycle, to: ClinicalCaseLifecycle): void {
  if (from === to) return;
  if (to === "archived") return;
  const allowed = FORWARD_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid lifecycle transition: ${from} -> ${to}`);
  }
}

export function isCriticalCase(input: { priority: string; severity: string }): boolean {
  return input.priority === "CRITICAL" || input.severity === "CRITICAL";
}
