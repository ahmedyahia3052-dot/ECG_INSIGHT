export const MEDICAL_REPORT_ENGINE_VERSION = "sprint90-medical-report-v1" as const;

export const MEDICAL_REPORT_SECTIONS = [
  "header",
  "patient",
  "measurements",
  "aiFindings",
  "physicianInterpretation",
  "impression",
  "recommendations",
  "signature",
  "verification",
  "disclaimer",
] as const;

export type MedicalReportSectionKey = (typeof MEDICAL_REPORT_SECTIONS)[number];

export type MedicalReportLifecycle = "draft" | "under_review" | "finalized" | "signed" | "archived";

export type PdfRenderStage =
  | "compose_document"
  | "apply_print_layout"
  | "render_html"
  | "render_svg"
  | "encode_pdf"
  | "persist_artifacts";
