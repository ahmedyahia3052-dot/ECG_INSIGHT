import type { ECGCase, ECGCaseStatus } from "@prisma/client";
import { AppError } from "../middleware/error";

const allowedTransitions: Record<ECGCaseStatus, ECGCaseStatus[]> = {
  PENDING: ["UPLOADED"],
  UPLOADED: ["PROCESSING"],
  PROCESSING: ["AI_COMPLETED"],
  AI_COMPLETED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["APPROVED", "REJECTED"],
  REVIEWED: [],
  APPROVED: ["FINALIZED"],
  REJECTED: ["FINALIZED"],
  FINALIZED: [],
};

export function isReadOnlyCaseStatus(status: ECGCaseStatus) {
  return status === "FINALIZED";
}

export function isTerminalCaseStatus(status: ECGCaseStatus) {
  return status === "FINALIZED";
}

export function canTransitionCaseStatus(from: ECGCaseStatus, to: ECGCaseStatus) {
  return from === to || allowedTransitions[from].includes(to);
}

export function assertCaseStatusTransition(from: ECGCaseStatus, to: ECGCaseStatus) {
  if (canTransitionCaseStatus(from, to)) return;
  throw new AppError(
    409,
    `Invalid ECG case workflow transition from ${from} to ${to}.`,
    "INVALID_CASE_STATUS_TRANSITION",
  );
}

export function assertCaseEditable(ecgCase: Pick<ECGCase, "status">) {
  if (!isReadOnlyCaseStatus(ecgCase.status)) return;
  throw new AppError(409, "Finalized ECG cases are read-only.", "CASE_READ_ONLY");
}

export function assertCaseCanAcceptAnalysis(ecgCase: Pick<ECGCase, "status">) {
  if (isTerminalCaseStatus(ecgCase.status) || ecgCase.status === "APPROVED" || ecgCase.status === "REJECTED" || ecgCase.status === "UNDER_REVIEW" || ecgCase.status === "AI_COMPLETED") {
    throw new AppError(
      409,
      "This ECG case cannot be re-analyzed. Create a new revision to run analysis again.",
      "CASE_ANALYSIS_LOCKED",
    );
  }
}

export function statusTimestampPatch(status: ECGCaseStatus, actorId: string) {
  return {
    approvedAt: status === "APPROVED" ? new Date() : undefined,
    finalizedAt: status === "FINALIZED" ? new Date() : undefined,
    rejectedAt: status === "REJECTED" ? new Date() : undefined,
    reviewedAt: ["UNDER_REVIEW", "REVIEWED", "APPROVED", "REJECTED", "FINALIZED"].includes(status)
      ? new Date()
      : undefined,
    reviewedById: ["UNDER_REVIEW", "REVIEWED", "APPROVED", "REJECTED", "FINALIZED"].includes(status)
      ? actorId
      : undefined,
  };
}
