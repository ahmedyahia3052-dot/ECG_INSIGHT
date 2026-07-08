export { medicalReportEngineRouter } from "./medical-report.routes";
export {
  createDraftMedicalReport,
  exportReportAsFhir,
  exportReportAsJson,
  finalizeMedicalReport,
  getMedicalReport,
  getMedicalReportEngineHealth,
  getMedicalReportPdfArchitecture,
  getMedicalReportPrintLayout,
  getMedicalReportVersions,
  listMedicalReports,
  signMedicalReport,
  submitMedicalReportForReview,
  updateDraftMedicalReport,
  verifyMedicalReportQr,
} from "./medical-report.service";
export { MEDICAL_REPORT_ENGINE_VERSION, MEDICAL_REPORT_SECTIONS } from "./types";
export type { MedicalReportDto, PdfArchitectureDto, PrintLayoutDto } from "./dto";
