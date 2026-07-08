import type { ReportStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import {
  assertCanEditReport,
  assertCanFinalize,
  canManageReport,
  createReportVersion,
  generateClinicalReport,
} from "../reports/reports.service";
import { generateEnterpriseReport, verifyEnterpriseReport } from "../enterprise-report-engine/enterprise-report.service";
import { recordReportHistory } from "../enterprise-report-engine/history.service";
import type { MedicalReportDto } from "./dto";
import {
  buildPrintLayout,
  describePdfArchitecture,
  exportMedicalReportFhir,
  exportMedicalReportJson,
  renderMedicalReportPdfBuffer,
  renderMedicalReportPrintHtml,
} from "./exporters";
import { composeEnterpriseReportDocument } from "../enterprise-report-engine/composer";
import {
  assertReportExists,
  createReportVersionRecord,
  finalizeReportRecord,
  findReportById,
  findReportByUuid,
  getPhysicianSignature,
  listReportVersions,
  listReports,
  mapReportsToDto,
  signReportRecord,
  submitReportForReviewRecord,
  updateDraftReportRecord,
} from "./repository";
import { enrichMedicalReportDto, toMedicalReportDto } from "./report-builder";
import type { UpdateDraftReportInput } from "./schemas";
import { MEDICAL_REPORT_ENGINE_VERSION } from "./types";
import { validateDraftReportUpdate, validateFinalizeReport, validateSignReport } from "./validators";

const statusMap: Record<string, ReportStatus> = {
  archived: "ARCHIVED",
  draft: "DRAFT",
  finalized: "FINALIZED",
  signed: "SIGNED",
  under_review: "UNDER_REVIEW",
};

export async function createDraftMedicalReport(input: {
  authorId: string;
  baseUrl?: string;
  caseId: string;
  clinicalIndication?: string;
  reportType?: Parameters<typeof generateEnterpriseReport>[0]["reportType"];
  templateSlug?: string;
}) {
  const result = input.templateSlug || input.reportType
    ? await generateEnterpriseReport({
        authorId: input.authorId,
        baseUrl: input.baseUrl,
        caseId: input.caseId,
        reportType: input.reportType,
        templateSlug: input.templateSlug,
      })
    : { report: await generateClinicalReport(input.caseId, input.authorId) };

  if (input.clinicalIndication) {
    const updated = await prisma.clinicalReport.update({
      data: { clinicalIndication: input.clinicalIndication, status: "DRAFT" },
      include: { versions: { orderBy: { versionNumber: "desc" } } },
      where: { id: result.report.id },
    });
    await recordReportHistory(updated.id, "draft_created", input.authorId, "Medical report draft created.");
    return toMedicalReportDto(updated);
  }

  await recordReportHistory(result.report.id, "draft_created", input.authorId, "Medical report draft created.");
  const loaded = await findReportById(result.report.id);
  return toMedicalReportDto(assertReportExists(loaded));
}

export async function updateDraftMedicalReport(
  reportId: string,
  patch: UpdateDraftReportInput,
  auth: { id: string; role: Parameters<typeof assertCanEditReport>[0]["role"] },
) {
  const report = assertReportExists(await findReportById(reportId));
  assertCanEditReport(auth, report);
  const validation = validateDraftReportUpdate(report, patch);
  if (!validation.valid) throw new AppError(400, validation.errors.join("; "), "INVALID_DRAFT_REPORT");

  const updated = await updateDraftReportRecord(reportId, patch);
  await createReportVersionRecord(updated, auth.id, "Draft report updated.");
  await recordReportHistory(reportId, "draft_updated", auth.id, "Draft medical report content updated.");
  return toMedicalReportDto(updated);
}

export async function submitMedicalReportForReview(reportId: string, actorId: string) {
  const report = assertReportExists(await findReportById(reportId));
  if (report.status !== "DRAFT") {
    throw new AppError(409, "Only draft reports can be submitted for review.", "REPORT_NOT_DRAFT");
  }
  const updated = await submitReportForReviewRecord(reportId);
  await createReportVersionRecord(updated, actorId, "Submitted for physician review.");
  await recordReportHistory(reportId, "submitted_for_review", actorId);
  return toMedicalReportDto(updated);
}

export async function finalizeMedicalReport(
  reportId: string,
  auth: { id: string; role: Parameters<typeof assertCanFinalize>[0]["role"] },
  baseUrl = "",
) {
  const report = assertReportExists(await findReportById(reportId));
  assertCanFinalize(auth, report);
  const validation = validateFinalizeReport(report);
  if (!validation.valid) throw new AppError(400, validation.errors.join("; "), "FINALIZE_VALIDATION_FAILED");

  const updated = await finalizeReportRecord(reportId, auth.id);
  await createReportVersionRecord(updated, auth.id, "Report finalized.");
  await recordReportHistory(reportId, "finalized", auth.id, "Medical report finalized.");
  const document = await composeEnterpriseReportDocument(reportId, baseUrl);
  await renderMedicalReportPdfBuffer(reportId, baseUrl);
  return enrichMedicalReportDto(toMedicalReportDto(updated), {
    aiConfidence: undefined,
    aiDiagnosis: document.ai.diagnosis,
    aiModelVersion: undefined,
  });
}

export async function signMedicalReport(
  reportId: string,
  auth: { id: string; role: Parameters<typeof canManageReport>[0]["role"] },
  signaturePath?: string,
) {
  const report = assertReportExists(await findReportById(reportId));
  if (!canManageReport(auth, report) && auth.role !== "DOCTOR" && auth.role !== "ADMIN" && auth.role !== "SUPER_ADMIN") {
    throw new AppError(403, "Only authorized physicians may sign reports.", "FORBIDDEN");
  }

  const storedSignature = await getPhysicianSignature(auth.id);
  const resolvedSignature = signaturePath ?? storedSignature?.imagePath ?? report.electronicSignaturePath ?? undefined;
  const validation = validateSignReport(report, resolvedSignature);
  if (!validation.valid) throw new AppError(400, validation.errors.join("; "), "SIGN_VALIDATION_FAILED");

  const updated = await signReportRecord(reportId, auth.id, resolvedSignature);
  await createReportVersion(updated, auth.id, "Report electronically signed.");
  await recordReportHistory(reportId, "signed", auth.id, "Medical report signed.");
  return toMedicalReportDto(updated);
}

export async function getMedicalReport(reportId: string, baseUrl = "") {
  const report = assertReportExists(await findReportById(reportId));
  const document = await composeEnterpriseReportDocument(reportId, baseUrl);
  return enrichMedicalReportDto(toMedicalReportDto(report), {
    aiDiagnosis: document.ai.diagnosis,
  });
}

export async function listMedicalReports(filters?: {
  caseId?: string;
  limit?: number;
  patientId?: string;
  status?: string;
}) {
  const reports = await listReports({
    caseId: filters?.caseId,
    limit: filters?.limit,
    patientId: filters?.patientId,
    status: filters?.status ? statusMap[filters.status] : undefined,
  });
  return mapReportsToDto(reports);
}

export async function getMedicalReportVersions(reportId: string) {
  assertReportExists(await findReportById(reportId));
  const versions = await listReportVersions(reportId);
  return versions.map((version) => ({
    author: version.author,
    authorId: version.authorId,
    createdAt: version.createdAt.toISOString(),
    id: version.id,
    modifications: version.modifications,
    versionNumber: version.versionNumber,
    snapshot: version.snapshot,
  }));
}

export async function exportReportAsJson(reportId: string, baseUrl = "") {
  const dto = await getMedicalReport(reportId, baseUrl);
  return exportMedicalReportJson(reportId, dto, baseUrl);
}

export async function exportReportAsFhir(reportId: string, baseUrl = "") {
  return exportMedicalReportFhir(reportId, baseUrl);
}

export async function getMedicalReportPrintLayout(reportId: string, baseUrl = "") {
  const report = assertReportExists(await findReportById(reportId));
  const document = await composeEnterpriseReportDocument(reportId, baseUrl);
  return {
    html: await renderMedicalReportPrintHtml(reportId, baseUrl),
    layout: buildPrintLayout(document),
    reportNumber: report.reportNumber,
  };
}

export function getMedicalReportPdfArchitecture(reportId: string) {
  const report = findReportById(reportId);
  return report.then((loaded) => {
    const existing = assertReportExists(loaded);
    return describePdfArchitecture(existing.reportNumber);
  });
}

export async function verifyMedicalReportQr(reportUuid: string, token?: string) {
  const report = await findReportByUuid(reportUuid);
  if (!report) return { verified: false };
  const verification = await verifyEnterpriseReport(reportUuid, token);
  return {
    ...verification,
    qrCodeData: report.qrCodeData ?? undefined,
    reportId: report.id,
  };
}

export function getMedicalReportEngineHealth() {
  return {
    engineVersion: MEDICAL_REPORT_ENGINE_VERSION,
    features: [
      "draft_reports",
      "final_reports",
      "ai_findings",
      "physician_interpretation",
      "measurements",
      "impression",
      "recommendations",
      "signature_support",
      "qr_verification",
      "report_versioning",
      "pdf_generation_architecture",
      "print_layout",
      "export_json",
      "export_fhir",
    ],
    ok: true,
    service: "medical-report-engine",
  };
}
