import type { AIAnalysisResult } from "@/services/ai";
import type { DigitalEcg } from "@/services/ecgProcessing";

import type { ClinicalAlert, ClinicalAlertSeverity, ClinicalWorkflowContext } from "./types";

export function buildClinicalAlerts(ctx: ClinicalWorkflowContext): ClinicalAlert[] {
  const alerts: ClinicalAlert[] = [];
  const d = ctx.digitalEcg;
  const analysis = ctx.analysis;

  if (analysis?.severity === "critical" || analysis?.severity === "severe") {
    alerts.push({
      id: "critical-ecg",
      label: "Critical ECG",
      message: analysis.diagnosis ?? "Critical finding requires immediate review.",
      severity: "critical",
    });
  }

  if (analysis?.urgentActions?.length) {
    for (const action of analysis.urgentActions.slice(0, 3)) {
      alerts.push({ id: `urgent-${action}`, label: "Urgent Review", message: action, severity: "critical" });
    }
  }

  const quality = d?.quality?.score;
  if (quality != null && quality < 55) {
    alerts.push({
      id: "poor-signal",
      label: "Poor Signal",
      message: `Digitization quality ${quality}/100 — verify measurements before signing.`,
      severity: "warning",
    });
  }

  if (d?.validation?.warnings?.length) {
    alerts.push({
      id: "lead-issues",
      label: "Lead Issues",
      message: d.validation.warnings.slice(0, 2).join("; "),
      severity: "warning",
    });
  }

  const hasMeasurements = (ctx.measurementCount ?? 0) > 0 || !!d?.measurementEngine;
  if (d?.status === "available" && !hasMeasurements) {
    alerts.push({
      id: "incomplete-measurements",
      label: "Incomplete Measurements",
      message: "Automatic measurements not confirmed — review intervals before report.",
      severity: "warning",
    });
  }

  if (analysis && ctx.caseRecord.reviewedBy && analysis.severity === "critical") {
    alerts.push({
      id: "ai-disagreement",
      label: "AI Disagreement",
      message: "Critical AI finding pending physician confirmation.",
      severity: "warning",
    });
  }

  if (!alerts.length && analysis?.diagnosis) {
    alerts.push({
      id: "workflow-ready",
      label: "Workflow Ready",
      message: `${analysis.diagnosis} — continue clinical review when ready.`,
      severity: "info",
    });
  }

  return alerts;
}

export function highestAlertSeverity(alerts: ClinicalAlert[]): ClinicalAlertSeverity | null {
  if (alerts.some((a) => a.severity === "critical")) return "critical";
  if (alerts.some((a) => a.severity === "warning")) return "warning";
  if (alerts.length) return "info";
  return null;
}
