import type {
  ClinicalWorkflowContext,
  ClinicalWorkflowNavigation,
  ClinicalWorkflowStep,
  ClinicalWorkflowStepId,
  ClinicalWorkflowStepStatus,
  CaseTimelineEvent,
} from "./types";
import { WORKFLOW_STEP_ORDER } from "./types";

function hasDigitized(ctx: ClinicalWorkflowContext) {
  return ctx.digitalEcg?.status === "available" && (ctx.digitalEcg.leads?.length ?? 0) > 0;
}

function hasImage(ctx: ClinicalWorkflowContext) {
  return !!(ctx.caseRecord.imagePath || ctx.caseRecord.originalFileUrl || ctx.caseRecord.files?.length);
}

function stepComplete(id: ClinicalWorkflowStepId, ctx: ClinicalWorkflowContext): boolean {
  const d = ctx.digitalEcg;
  const reports = ctx.reports ?? [];
  const signedReport = reports.find((r) => r.status === "signed" || r.status === "archived");
  const anyReport = reports.length > 0;

  switch (id) {
    case "patient":
      return !!ctx.caseRecord.patientId;
    case "upload":
      return hasImage(ctx);
    case "image-quality":
      return hasImage(ctx) && (d?.quality?.score != null || !!d?.calibration?.confidence);
    case "image-processing":
      return !!d?.preprocessing || hasDigitized(ctx);
    case "grid-detection":
      return !!d?.calibration?.gridDetected || hasDigitized(ctx);
    case "lead-detection":
      return (d?.leads?.length ?? 0) > 0 || hasDigitized(ctx);
    case "digitization":
      return hasDigitized(ctx);
    case "signal-reconstruction":
      return hasDigitized(ctx) && (d?.leads?.some((lead) => (lead.samples?.length ?? 0) > 0) ?? false);
    case "measurements":
      return (ctx.measurementCount ?? 0) > 0 || !!d?.measurementEngine || !!d?.measurements;
    case "ai-review":
      return !!ctx.analysis?.diagnosis;
    case "clinical-review":
      return !!ctx.caseRecord.reviewedBy || ctx.caseRecord.status === "reviewed" || ctx.caseRecord.status === "signed";
    case "comparison":
      return !!ctx.hasCompareStudy;
    case "doctor-notes":
      return !!(ctx.clinicalNotes?.trim() || ctx.caseRecord.clinicalNotes || ctx.caseRecord.clinicalComments);
    case "final-report":
      return anyReport || reports.some((r) => r.status === "finalized" || r.status === "signed" || r.status === "under_review");
    case "digital-signature":
      return !!signedReport || !!ctx.caseRecord.reviewedBy || ctx.caseRecord.status === "signed";
    case "export":
      return !!ctx.exported || !!signedReport;
    default:
      return false;
  }
}

function viewModeForStep(id: ClinicalWorkflowStepId): ClinicalWorkflowNavigation {
  switch (id) {
    case "patient":
      return { patientTab: true };
    case "upload":
    case "image-quality":
      return { viewMode: "image" };
    case "image-processing":
    case "grid-detection":
      return { viewMode: "processed" };
    case "lead-detection":
    case "digitization":
    case "signal-reconstruction":
      return { viewMode: "waveform" };
    case "measurements":
      return { measurementsTab: true, viewMode: "measurement" };
    case "ai-review":
      return { aiTab: true, viewMode: "ai-review" };
    case "clinical-review":
      return { aiTab: true, openReview: true, viewMode: "ai-review" };
    case "comparison":
      return { compareMode: true, historyTab: true, viewMode: "compare" };
    case "doctor-notes":
      return { notesTab: true, patientTab: true };
    case "final-report":
    case "digital-signature":
      return { reportsTab: true, viewMode: "report" };
    case "export":
      return { reportsTab: true, viewMode: "report" };
    default:
      return {};
  }
}

function viewModeMatchesStep(id: ClinicalWorkflowStepId, ctx: ClinicalWorkflowContext): boolean {
  const mode = ctx.currentViewMode;
  switch (id) {
    case "patient":
      return false;
    case "upload":
    case "image-quality":
      return mode === "image";
    case "image-processing":
    case "grid-detection":
      return mode === "processed";
    case "lead-detection":
    case "digitization":
    case "signal-reconstruction":
      return mode === "waveform";
    case "measurements":
      return mode === "measurement";
    case "ai-review":
    case "clinical-review":
      return mode === "ai-review" || mode === "overlay";
    case "comparison":
      return mode === "compare";
    case "doctor-notes":
      return false;
    case "final-report":
    case "digital-signature":
    case "export":
      return mode === "report";
    default:
      return false;
  }
}

export function buildWorkflowSteps(ctx: ClinicalWorkflowContext): ClinicalWorkflowStep[] {
  let foundCurrent = false;
  return WORKFLOW_STEP_ORDER.map((def, index) => {
    const complete = stepComplete(def.id, ctx);
    const isView = viewModeMatchesStep(def.id, ctx);
    const priorComplete = index === 0 || stepComplete(WORKFLOW_STEP_ORDER[index - 1]!.id, ctx);

    let status: ClinicalWorkflowStepStatus;
    if (ctx.digitizing && def.id === "digitization") {
      status = "current";
      foundCurrent = true;
    } else if (complete && isView) {
      status = "current";
    } else if (complete) {
      status = "complete";
    } else if (!foundCurrent && priorComplete) {
      status = "current";
      foundCurrent = true;
    } else {
      status = "pending";
    }

    const disabled = !priorComplete && !complete && def.id !== "patient" && def.id !== "upload";
    if (disabled) status = status === "current" ? "pending" : "disabled";

    return { disabled, id: def.id, label: def.label, shortLabel: def.shortLabel, status };
  });
}

export function canNavigateToStep(step: ClinicalWorkflowStep) {
  return !step.disabled || step.status === "complete";
}

export function navigateWorkflowStep(id: ClinicalWorkflowStepId): ClinicalWorkflowNavigation {
  return viewModeForStep(id);
}

export function workflowProgress(steps: ClinicalWorkflowStep[]) {
  const complete = steps.filter((s) => s.status === "complete").length;
  return Math.round((complete / Math.max(steps.length, 1)) * 100);
}

export function buildCaseTimelineEvents(ctx: ClinicalWorkflowContext): CaseTimelineEvent[] {
  const events: CaseTimelineEvent[] = [];
  const push = (id: string, label: string, done: boolean, timestamp?: string) => {
    events.push({ id, label, status: done ? "complete" : "pending", timestamp });
  };
  push("upload", "ECG Upload", stepComplete("upload", ctx), ctx.caseRecord.uploadDate);
  push("quality", "Image Quality Check", stepComplete("image-quality", ctx));
  push("digitize", "Digitization", stepComplete("digitization", ctx), ctx.digitalEcg?.extractionTimestamp);
  push("signal", "Signal Reconstruction", stepComplete("signal-reconstruction", ctx));
  push("measure", "Measurements", stepComplete("measurements", ctx));
  push("ai", "AI Analysis", stepComplete("ai-review", ctx), ctx.analysis?.createdAt);
  push("review", "Clinical Review", stepComplete("clinical-review", ctx), ctx.caseRecord.reviewedAt ?? undefined);
  push("notes", "Doctor Notes", stepComplete("doctor-notes", ctx));
  const report = ctx.reports?.[0];
  push("report", "Final Report", stepComplete("final-report", ctx), report?.generatedAt);
  push("sign", "Digital Signature", stepComplete("digital-signature", ctx), report?.signedAt);
  push("export", "Export", stepComplete("export", ctx));
  const firstPending = events.find((e) => e.status === "pending");
  if (firstPending) firstPending.status = "current";
  return events;
}

export function smartToolGroupForViewMode(mode: string): string[] {
  switch (mode) {
    case "image":
    case "processed":
      return ["FILE", "VIEW", "DIGITIZE", "EXPORT"];
    case "waveform":
      return ["FILE", "DIGITIZE", "MEASURE", "EXPORT"];
    case "measurement":
      return ["FILE", "MEASURE", "VIEW", "EXPORT"];
    case "ai-review":
    case "overlay":
      return ["FILE", "AI", "MEASURE", "EXPORT"];
    case "compare":
      return ["FILE", "COMPARE", "VIEW", "EXPORT"];
    case "report":
      return ["FILE", "REPORT", "EXPORT"];
    default:
      return ["FILE", "VIEW", "EXPORT", "REPORT"];
  }
}
