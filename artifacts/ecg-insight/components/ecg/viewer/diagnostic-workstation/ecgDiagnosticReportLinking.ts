import type { CardiologistStructuredFinding } from "../ai-cardiologist/types";
import type { EcgClinicalMeasurement } from "../measurementTypes";
import type { EcgLeadId } from "../types";
import { STANDARD_ECG_LEADS } from "../types";
import type { DiagnosticReportLinkTarget } from "./types";

const MEASUREMENT_KIND_BY_CODE: Record<string, string> = {
  af: "rr_interval",
  atrial_fibrillation: "rr_interval",
  lbbb: "qrs_duration",
  long_qt: "qtc_bazett",
  pac: "pr_interval",
  prolonged_pr: "pr_interval",
  pvc: "qrs_duration",
  rbbb: "qrs_duration",
  st_depression: "st_segment",
  st_elevation: "st_segment",
  stemi: "st_segment",
};

export function resolveReportLinkFromFinding(
  finding: CardiologistStructuredFinding,
  measurements: EcgClinicalMeasurement[] = [],
): DiagnosticReportLinkTarget {
  const lead = (finding.affectedLeads[0] ?? "II") as EcgLeadId;
  const measurementKind = MEASUREMENT_KIND_BY_CODE[finding.code];
  const measurement = measurementKind
    ? measurements.find((item) => item.kind === measurementKind && !item.hidden)
    : undefined;

  return {
    annotationId: finding.id,
    beatIndex: estimateBeatIndex(finding.code),
    caliperId: measurement?.caliperId,
    findingCode: finding.code,
    lead,
    measurementKind: measurement?.kind ?? measurementKind,
  };
}

function estimateBeatIndex(code: string): number | undefined {
  if (code.includes("pvc") || code.includes("pac")) return 2;
  if (code.includes("af") || code.includes("arrhythmia")) return 0;
  return undefined;
}

export function reorderLeads(order: EcgLeadId[], fromLead: EcgLeadId, toLead: EcgLeadId): EcgLeadId[] {
  const next = [...order];
  const fromIndex = next.indexOf(fromLead);
  const toIndex = next.indexOf(toLead);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return next;
  next.splice(fromIndex, 1);
  next.splice(toIndex, 0, fromLead);
  return next;
}

export function togglePinnedLead(pinned: EcgLeadId[], lead: EcgLeadId): EcgLeadId[] {
  return pinned.includes(lead) ? pinned.filter((item) => item !== lead) : [...pinned, lead];
}

export function defaultLeadOrder(): EcgLeadId[] {
  return [...STANDARD_ECG_LEADS];
}
