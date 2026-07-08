import { buildFhirBundle } from "../enterprise-report-engine/fhir-export";
import { composeEnterpriseReportDocument } from "../enterprise-report-engine/composer";
import { renderEnterpriseReportHtml } from "../enterprise-report-engine/html-renderer";
import { renderEnterpriseReportPdf } from "../enterprise-report-engine/pdf-renderer";
import type { EnterpriseReportDocument } from "../enterprise-report-engine/types";
import type {
  MedicalReportDto,
  MedicalReportFhirExportDto,
  MedicalReportJsonExportDto,
  PdfArchitectureDto,
  PrintLayoutDto,
} from "./dto";
import { MEDICAL_REPORT_ENGINE_VERSION } from "./types";

export function buildPrintLayout(document: EnterpriseReportDocument): PrintLayoutDto {
  return {
    columns: 2,
    marginsMm: { bottom: 18, left: 14, right: 14, top: 18 },
    orientation: "portrait",
    pageSize: "A4",
    sections: ["header", "patient", "measurements", "aiFindings", "physicianInterpretation", "impression", "recommendations", "signature", "verification", "disclaimer"],
    watermark: document.readOnly ? "FINAL · READ ONLY" : document.branding.watermark,
  };
}

export function describePdfArchitecture(reportNumber: string): PdfArchitectureDto {
  return {
    engineVersion: MEDICAL_REPORT_ENGINE_VERSION,
    outputFormats: ["pdf", "html", "svg", "png"],
    renderer: "enterprise-vector-pdf-v1",
    stages: [
      { description: "Load ClinicalReport and compose enterprise document model", outputArtifact: "EnterpriseReportDocument", stage: "compose_document" },
      { description: "Apply print layout margins, watermark, and section ordering", outputArtifact: "PrintLayoutDto", stage: "apply_print_layout" },
      { description: "Render semantic HTML for browser print and archival", outputArtifact: `${reportNumber}.html`, stage: "render_html" },
      { description: "Render SVG intermediate for raster exports", outputArtifact: `${reportNumber}.svg`, stage: "render_svg" },
      { description: "Encode vector PDF pages with verification footer", outputArtifact: `${reportNumber}.pdf`, stage: "encode_pdf" },
      { description: "Persist HTML/PDF paths on ClinicalReport record", outputArtifact: "uploads/enterprise-reports/", stage: "persist_artifacts" },
    ],
    storageTargets: ["uploads/enterprise-reports", "uploads/reports"],
  };
}

export async function exportMedicalReportJson(
  reportId: string,
  dto: MedicalReportDto,
  baseUrl = "",
): Promise<MedicalReportJsonExportDto> {
  const document = await composeEnterpriseReportDocument(reportId, baseUrl);
  return {
    document: {
      ...dto,
      aiFindings: {
        ...dto.aiFindings,
        confidence: document.ai.confidence,
        diagnosis: document.ai.diagnosis,
        supportingFindings: document.ai.supportingFindings,
      },
      impression: dto.impression ?? document.doctor.finalDiagnosis,
      measurements: {
        ...dto.measurements,
        heartRate: parseMeasurementNumber(document.ecg.heartRate) ?? dto.measurements?.heartRate,
        prInterval: parseMeasurementNumber(document.ecg.pr) ?? dto.measurements?.prInterval,
        qrsDuration: parseMeasurementNumber(document.ecg.qrs) ?? dto.measurements?.qrsDuration,
        qtInterval: parseMeasurementNumber(document.ecg.qt) ?? dto.measurements?.qtInterval,
        qtcInterval: parseMeasurementNumber(document.ecg.qtc) ?? dto.measurements?.qtcInterval,
      },
      recommendations: dto.recommendations.length ? dto.recommendations : (document.ai.recommendations ?? []),
    },
    engineVersion: MEDICAL_REPORT_ENGINE_VERSION,
    exportedAt: new Date().toISOString(),
    format: "json",
  };
}

export async function exportMedicalReportFhir(
  reportId: string,
  baseUrl = "",
): Promise<MedicalReportFhirExportDto> {
  const document = await composeEnterpriseReportDocument(reportId, baseUrl);
  return {
    bundle: buildFhirBundle(document),
    engineVersion: MEDICAL_REPORT_ENGINE_VERSION,
    exportedAt: new Date().toISOString(),
    format: "fhir",
  };
}

export async function renderMedicalReportPrintHtml(reportId: string, baseUrl = "") {
  const document = await composeEnterpriseReportDocument(reportId, baseUrl);
  const html = renderEnterpriseReportHtml(document);
  return html.replace("</body>", "<script>window.addEventListener('load',()=>window.print());</script></body>");
}

export async function renderMedicalReportPdfBuffer(reportId: string, baseUrl = "") {
  const document = await composeEnterpriseReportDocument(reportId, baseUrl);
  return renderEnterpriseReportPdf(document, document.branding.watermark);
}

function parseMeasurementNumber(value?: string) {
  if (!value) return undefined;
  const match = value.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}
