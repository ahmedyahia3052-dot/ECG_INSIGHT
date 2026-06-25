import type { ECGCase, ECGCaseStatus } from "@prisma/client";
import { AppError } from "../middleware/error";

const allowedTransitions: Record<ECGCaseStatus, ECGCaseStatus[]> = {
  PENDING: ["UPLOADED", "PROCESSING", "UNDER_REVIEW"],
  UPLOADED: ["PROCESSING", "AI_COMPLETED", "UNDER_REVIEW", "REJECTED"],
  PROCESSING: ["AI_COMPLETED", "UNDER_REVIEW", "REJECTED"],
  AI_COMPLETED: ["UNDER_REVIEW", "REVIEWED", "APPROVED", "REJECTED"],
  UNDER_REVIEW: ["REVIEWED", "APPROVED", "REJECTED"],
  REVIEWED: ["APPROVED", "REJECTED"],
  APPROVED: ["FINALIZED"],
  REJECTED: [],
  FINALIZED: [],
};

export function isReadOnlyCaseStatus(status: ECGCaseStatus) {
  return status === "FINALIZED";
}

export function isTerminalCaseStatus(status: ECGCaseStatus) {
  return status === "FINALIZED" || status === "REJECTED";
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
  if (isTerminalCaseStatus(ecgCase.status) || ecgCase.status === "APPROVED") {
    throw new AppError(
      409,
      "Approved, rejected, or finalized ECG cases cannot be re-analyzed.",
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
