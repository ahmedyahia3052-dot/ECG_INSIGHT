/**
 * Sprint 57 — Enterprise Report Engine unit tests.
 */
import { buildFhirBundle } from "../server/src/modules/enterprise-report-engine/fhir-export";
import { computeContentHash, computeVerificationHash, verifyReportIntegrity } from "../server/src/modules/enterprise-report-engine/security";
import { ENTERPRISE_REPORT_TEMPLATES, REPORT_TYPE_LABELS, defaultTemplateForType, templateBySlug } from "../server/src/modules/enterprise-report-engine/templates";
import type { EnterpriseReportDocument } from "../server/src/modules/enterprise-report-engine/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const sampleDocument: EnterpriseReportDocument = {
  ai: {
    confidence: "88%",
    diagnosis: "Normal sinus rhythm",
    recommendations: ["Routine follow-up"],
    urgency: "ROUTINE",
  },
  attachments: {},
  branding: {
    primaryColor: "#0F766E",
    reportFooter: "ECG Insight",
    reportHeader: "Test Hospital",
    secondaryColor: "#134E4A",
    watermark: "TEST",
  },
  contentHash: "",
  doctor: {
    finalDiagnosis: "Normal ECG",
    interpretation: "No acute abnormality",
    recommendation: ["Continue current management"],
  },
  ecg: {
    heartRate: "72 bpm",
    pr: "160 ms",
    qrs: "92 ms",
    qt: "390 ms",
    qtc: "410 ms",
    rhythm: "Sinus rhythm",
  },
  generatedAt: new Date().toISOString(),
  header: {
    doctorLicense: "MD-12345",
    doctorName: "Dr. Test",
    hospitalName: "Test Hospital",
    reportDate: new Date().toISOString(),
    reportNumber: "RPT-TEST-001",
    reportUuid: "uuid-test-001",
  },
  patient: {
    patientId: "PAT-001",
    patientName: "John Doe",
    studyDate: "2026-07-08",
  },
  readOnly: false,
  reportId: "report-1",
  reportNumber: "RPT-TEST-001",
  reportType: "HOSPITAL",
  reportUuid: "uuid-test-001",
  sections: ["header", "patient", "ecg", "ai", "doctor"],
  status: "draft",
  templateCategory: "HOSPITAL",
  templateSlug: "hospital-standard",
  updatedAt: new Date().toISOString(),
  verificationHash: "",
};

sampleDocument.contentHash = computeContentHash(sampleDocument);
sampleDocument.verificationHash = computeVerificationHash(sampleDocument.reportUuid, sampleDocument.contentHash, "token-abc");

assert(ENTERPRISE_REPORT_TEMPLATES.length >= 9, "Expected at least 9 enterprise report templates");
assert(templateBySlug("hospital-standard")?.reportType === "HOSPITAL", "Hospital template type mismatch");
assert(defaultTemplateForType("EMERGENCY").reportType === "EMERGENCY", "Emergency default template mismatch");
assert(REPORT_TYPE_LABELS.AI_DIAGNOSTIC === "AI Diagnostic Report", "Report type label mismatch");

const integrity = verifyReportIntegrity(sampleDocument.contentHash, sampleDocument.verificationHash, sampleDocument, "token-abc");
assert(integrity.valid, "Verification hash should validate");
assert(!integrity.tampered, "Document should not be tampered");

const tampered = { ...sampleDocument, doctor: { ...sampleDocument.doctor, finalDiagnosis: "Changed diagnosis" } };
const tamperCheck = verifyReportIntegrity(sampleDocument.contentHash, sampleDocument.verificationHash, tampered, "token-abc");
assert(tamperCheck.tampered, "Tampered document should be detected");

const fhir = buildFhirBundle(sampleDocument);
assert(fhir.resourceType === "Bundle", "FHIR bundle resource type");
assert(fhir.entry.length >= 2, "FHIR bundle should include patient and diagnostic report");
assert(fhir.entry.some((entry) => entry.resource.resourceType === "DiagnosticReport"), "FHIR DiagnosticReport missing");

console.log("Sprint 57 Enterprise Report Engine unit tests: PASS");
