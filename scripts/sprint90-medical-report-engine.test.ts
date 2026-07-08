import assert from "node:assert/strict";
import { MEDICAL_REPORT_ENGINE_VERSION, MEDICAL_REPORT_SECTIONS } from "../server/src/modules/medical-report-engine/types";
import { lifecycleFromStatus, serializeMeasurements } from "../server/src/modules/medical-report-engine/dto";
import { buildPrintLayout, describePdfArchitecture } from "../server/src/modules/medical-report-engine/exporters";
import { toMedicalReportDto } from "../server/src/modules/medical-report-engine/report-builder";
import {
  isDraftStatus,
  isFinalStatus,
  validateDraftReportUpdate,
  validateFinalizeReport,
  validateSignReport,
} from "../server/src/modules/medical-report-engine/validators";
import type { EnterpriseReportDocument } from "../server/src/modules/enterprise-report-engine/types";

assert.equal(MEDICAL_REPORT_ENGINE_VERSION, "sprint90-medical-report-v1");
assert.equal(MEDICAL_REPORT_SECTIONS.length, 10);
assert.ok(MEDICAL_REPORT_SECTIONS.includes("aiFindings"));
assert.ok(MEDICAL_REPORT_SECTIONS.includes("signature"));

assert.equal(lifecycleFromStatus("DRAFT"), "draft");
assert.equal(isDraftStatus("UNDER_REVIEW"), true);
assert.equal(isFinalStatus("FINALIZED"), true);

const draftValidation = validateDraftReportUpdate({ status: "DRAFT" }, { aiFindings: "AI summary" });
assert.equal(draftValidation.valid, true);

const badDraft = validateDraftReportUpdate({ status: "FINALIZED" }, { recommendations: ["ok"] });
assert.equal(badDraft.valid, false);

const finalizeValidation = validateFinalizeReport({
  finalPhysicianImpression: "Normal ECG",
  physicianName: "Dr. Smith",
  recommendations: [],
  rhythmInterpretation: "Sinus rhythm",
  status: "UNDER_REVIEW",
});
assert.equal(finalizeValidation.valid, true);

const signValidation = validateSignReport({ electronicSignaturePath: null, status: "FINALIZED" });
assert.equal(signValidation.valid, false);

const measurements = serializeMeasurements({
  heartRate: 72,
  prInterval: 160,
  qrsDuration: 90,
});
assert.equal(measurements?.heartRate, 72);

const dto = toMedicalReportDto({
  acquisitionDate: new Date("2026-07-09"),
  aiFindings: "AI: Normal sinus rhythm",
  authorId: "u1",
  caseId: "c1",
  clinicalIndication: "Routine screening",
  contentHash: "abc",
  contractorName: null,
  createdAt: new Date("2026-07-09"),
  deletedAt: null,
  departmentName: null,
  differentialDiagnosis: [],
  ecgMeasurements: { heartRate: 72 },
  electronicSignaturePath: null,
  finalPhysicianImpression: "Normal ECG",
  finalizedAt: null,
  finalizedById: null,
  generatedAt: new Date("2026-07-09"),
  htmlStoragePath: null,
  id: "r1",
  medicalIntelligenceReportId: null,
  organizationName: null,
  occupationalReportSection: null,
  patientId: "p1",
  pdfStoragePath: null,
  physicianLicenseNumber: "MD-1",
  physicianName: "Dr. Smith",
  physicianSpecialty: "Cardiology",
  qrCodeData: "qr-data",
  recommendations: ["Follow-up in 12 months"],
  referringPhysician: null,
  reportNumber: "RPT-TEST-001",
  reportingDate: new Date("2026-07-09"),
  reportType: "PROFESSIONAL_ECG",
  reportUuid: "uuid-1",
  rhythmInterpretation: "Sinus rhythm",
  severityClassification: "NORMAL",
  signedAt: null,
  signedById: null,
  status: "DRAFT",
  templateCategory: null,
  templateId: null,
  updatedAt: new Date("2026-07-09"),
  urgentActions: [],
  verificationHash: "hash",
  verificationToken: "token",
  verificationUrl: "/verify/token",
  attachmentManifest: null,
  brandingSnapshot: null,
});
assert.equal(dto.isDraft, true);
assert.equal(dto.impression, "Normal ECG");
assert.equal(dto.signature.status, "pending");

const sampleDocument: EnterpriseReportDocument = {
  ai: { diagnosis: "NSR", confidence: "90%" },
  attachments: {},
  branding: { primaryColor: "#000", secondaryColor: "#111", watermark: "ECG" },
  contentHash: "hash",
  doctor: { finalDiagnosis: "Normal ECG" },
  ecg: { heartRate: "72 bpm", pr: "160 ms" },
  generatedAt: new Date().toISOString(),
  header: {
    doctorName: "Dr. Smith",
    hospitalName: "Test Hospital",
    reportDate: new Date().toISOString(),
    reportNumber: "RPT-TEST-001",
    reportUuid: "uuid-1",
  },
  patient: { patientName: "John Doe" },
  readOnly: false,
  reportId: "r1",
  reportNumber: "RPT-TEST-001",
  reportType: "PROFESSIONAL_ECG",
  reportUuid: "uuid-1",
  sections: ["header", "patient", "ecg", "ai", "doctor"],
  status: "draft",
  updatedAt: new Date().toISOString(),
  verificationHash: "vhash",
};

const layout = buildPrintLayout(sampleDocument);
assert.equal(layout.pageSize, "A4");
assert.equal(layout.orientation, "portrait");

const architecture = describePdfArchitecture("RPT-TEST-001");
assert.equal(architecture.stages.length, 6);
assert.ok(architecture.stages.some((stage) => stage.stage === "encode_pdf"));

console.log("Sprint 90 Medical Report Engine unit tests: PASS");
