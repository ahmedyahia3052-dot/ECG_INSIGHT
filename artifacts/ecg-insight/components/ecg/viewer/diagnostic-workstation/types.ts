import type { EcgLeadId } from "../types";

export type DiagnosticPanelId =
  | "ai-findings"
  | "axis"
  | "clinical-notes"
  | "differential"
  | "intervals"
  | "live-measurements"
  | "morphology"
  | "recommendations"
  | "rhythm"
  | "st-analysis";

export type DiagnosticReportLinkTarget = {
  annotationId?: string;
  beatIndex?: number;
  caliperId?: string;
  findingCode?: string;
  lead: EcgLeadId;
  measurementKind?: string;
};

export type DiagnosticCompareSync = {
  beatSync: boolean;
  differenceHighlight: boolean;
  leadSync: boolean;
};

export type DiagnosticLeadToolsState = {
  isolatedLead: EcgLeadId | null;
  leadMagnifier: boolean;
  leadOrder: EcgLeadId[];
  pinnedLeads: EcgLeadId[];
};
