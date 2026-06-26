import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { AIAnalysis, ClinicalReport, ECGCase, ECGFile, Patient, Prisma, ReportStatus, Role, User } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";

type ReportWithRelations = ClinicalReport & {
  author: Pick<User, "email" | "id" | "name" | "specialization">;
  case?: { caseNumber: string | null; caseId: string } | null;
  emailLogs?: Array<{ id: string; recipient: string; senderId: string; sentAt: Date; status: string }>;
  patient?: { firstName: string; lastName: string; patientCode: string | null } | null;
  versions?: Array<{ authorId: string; createdAt: Date; id: string; modifications: string; versionNumber: number }>;
};

type ReportTemplateContext = ClinicalReport & {
  author: Pick<User, "email" | "id" | "licenseNumber" | "name" | "specialization">;
  case: ECGCase & {
    analyses: AIAnalysis[];
    files: ECGFile[];
    uploadedBy: Pick<User, "email" | "id" | "name">;
  };
  patient: Patient & {
    organization?: { address: string | null; email: string | null; logo: string | null; name: string; phone: string | null } | null;
  };
};

const reportStorageRoot = path.resolve(process.cwd(), "uploads", "reports");
fs.mkdirSync(reportStorageRoot, { recursive: true });

export function canManageReport(
  auth: { id: string; role: Role },
  report: Pick<ClinicalReport, "authorId">,
) {
  return auth.role === "SUPER_ADMIN" || auth.role === "ADMIN" || report.authorId === auth.id;
}

export function assertCanEditReport(auth: { id: string; role: Role }, report: Pick<ClinicalReport, "authorId" | "status">) {
  if (auth.role === "STUDENT") throw new AppError(403, "Students have read-only report access.", "FORBIDDEN");
  if (!canManageReport(auth, report)) throw new AppError(403, "You can only modify your own reports.", "FORBIDDEN");
  if (report.status === "SIGNED" || report.status === "ARCHIVED") {
    throw new AppError(409, "Signed or archived reports cannot be edited.", "REPORT_LOCKED");
  }
}

export function assertCanFinalize(auth: { id: string; role: Role }, report: Pick<ClinicalReport, "authorId" | "status">) {
  if (auth.role !== "SUPER_ADMIN" && auth.role !== "ADMIN" && auth.role !== "DOCTOR") {
    throw new AppError(403, "Only doctors or admins may finalize reports.", "FORBIDDEN");
  }
  if (!canManageReport(auth, report)) throw new AppError(403, "You can only finalize your own reports.", "FORBIDDEN");
  if (report.status === "SIGNED" || report.status === "ARCHIVED") {
    throw new AppError(409, "This report lifecycle state cannot be finalized.", "REPORT_LOCKED");
  }
}

function reportNumber() {
  return `RPT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-6)}`;
}

function reportVerificationPath(report: Pick<ClinicalReport, "reportNumber" | "verificationToken">) {
  return `/api/reports/verify/${encodeURIComponent(report.reportNumber)}?token=${encodeURIComponent(report.verificationToken)}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function text(value: unknown, fallback = "Not recorded") {
  const rendered = String(value ?? "").trim();
  return rendered || fallback;
}

function normalizeConfidence(value: number | null | undefined) {
  if (value === null || value === undefined) return "Pending";
  return `${Math.round(value <= 1 ? value * 100 : value)}%`;
}

function list(items: string[]) {
  return items.length ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "<li>None recorded</li>";
}

function riskFactors(patient: Pick<Patient, "diabetes" | "dyslipidemia" | "heartFailure" | "hypertension" | "ischemicHeartDisease" | "obesity" | "previousCABG" | "previousMI" | "previousPCI" | "smokingStatus">) {
  return [
    patient.hypertension ? "Hypertension" : null,
    patient.diabetes ? "Diabetes" : null,
    patient.dyslipidemia ? "Dyslipidemia" : null,
    patient.obesity ? "Obesity" : null,
    patient.ischemicHeartDisease ? "Ischemic heart disease" : null,
    patient.heartFailure ? "Heart failure" : null,
    patient.previousMI ? "Previous myocardial infarction" : null,
    patient.previousCABG ? "Previous CABG" : null,
    patient.previousPCI ? "Previous PCI" : null,
    patient.smokingStatus === "CURRENT" ? "Current smoker" : patient.smokingStatus === "FORMER" ? "Former smoker" : null,
  ].filter(Boolean) as string[];
}

function pseudoQrSvg(payload: string) {
  const size = 148;
  const modules = 21;
  const cell = size / modules;
  const chars = [...payload].map((char) => char.charCodeAt(0));
  const blocks: string[] = [];
  function finder(x: number, y: number) {
    blocks.push(`<rect x="${x * cell}" y="${y * cell}" width="${cell * 7}" height="${cell * 7}" fill="#0f172a"/>`);
    blocks.push(`<rect x="${(x + 1) * cell}" y="${(y + 1) * cell}" width="${cell * 5}" height="${cell * 5}" fill="#ffffff"/>`);
    blocks.push(`<rect x="${(x + 2) * cell}" y="${(y + 2) * cell}" width="${cell * 3}" height="${cell * 3}" fill="#0f172a"/>`);
  }
  finder(0, 0);
  finder(14, 0);
  finder(0, 14);
  for (let row = 0; row < modules; row += 1) {
    for (let col = 0; col < modules; col += 1) {
      const inFinder = (row < 7 && col < 7) || (row < 7 && col >= 14) || (row >= 14 && col < 7);
      if (inFinder) continue;
      const seed = chars[(row * modules + col) % Math.max(chars.length, 1)] ?? 17;
      if ((seed + row * 7 + col * 11) % 5 < 2) {
        blocks.push(`<rect x="${col * cell}" y="${row * cell}" width="${cell}" height="${cell}" fill="#0f172a"/>`);
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#ffffff"/>${blocks.join("")}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

async function loadReportContext(reportId: string): Promise<ReportTemplateContext> {
  const report = await prisma.clinicalReport.findUnique({
    include: {
      author: { select: { email: true, id: true, licenseNumber: true, name: true, specialization: true } },
      case: {
        include: {
          analyses: { orderBy: { createdAt: "desc" }, take: 1 },
          files: { orderBy: { createdAt: "desc" }, take: 5 },
          uploadedBy: { select: { email: true, id: true, name: true } },
        },
      },
      patient: { include: { organization: true } },
    },
    where: { id: reportId },
  });
  if (!report) throw new AppError(404, "Clinical report not found.", "REPORT_NOT_FOUND");
  return report;
}

function reportSnapshot(report: ClinicalReport): Prisma.InputJsonObject {
  return {
    aiFindings: report.aiFindings,
    clinicalIndication: report.clinicalIndication,
    differentialDiagnosis: report.differentialDiagnosis,
    finalPhysicianImpression: report.finalPhysicianImpression,
    recommendations: report.recommendations,
    rhythmInterpretation: report.rhythmInterpretation,
    severityClassification: report.severityClassification,
    status: report.status,
    urgentActions: report.urgentActions,
  };
}

export async function createReportVersion(report: ClinicalReport, authorId: string, modifications: string) {
  const latest = await prisma.reportVersion.findFirst({
    orderBy: { versionNumber: "desc" },
    where: { reportId: report.id },
  });
  return prisma.reportVersion.create({
    data: {
      authorId,
      modifications,
      reportId: report.id,
      snapshot: reportSnapshot(report),
      versionNumber: (latest?.versionNumber ?? 0) + 1,
    },
  });
}

export async function generateClinicalReport(caseId: string, authorId: string) {
  const [ecgCase, author] = await Promise.all([
    prisma.eCGCase.findUnique({
      include: {
        analyses: { orderBy: { createdAt: "desc" }, take: 1 },
        measurements: { orderBy: { createdAt: "desc" }, take: 1 },
        patient: {
          include: {
            contractor: true,
            fitnessAssessments: { orderBy: { createdAt: "desc" }, take: 1 },
            organization: true,
          },
        },
      },
      where: { id: caseId },
    }),
    prisma.user.findUnique({ where: { id: authorId } }),
  ]);
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  if (!author) throw new AppError(404, "Physician not found.", "USER_NOT_FOUND");

  const analysis = ecgCase.analyses[0];
  const measurement = ecgCase.measurements[0];
  const occupationalAssessment = ecgCase.patient.fitnessAssessments[0];
  const nextReportNumber = reportNumber();
  const verificationToken = randomUUID();
  const verificationUrl = reportVerificationPath({ reportNumber: nextReportNumber, verificationToken });
  const report = await prisma.clinicalReport.create({
    data: {
      acquisitionDate: ecgCase.uploadDate,
      aiFindings: analysis
        ? `AI diagnosis: ${analysis.diagnosis}. ${analysis.interpretation} Confidence score: ${Math.round(analysis.confidenceScore * 100)}%. Model version: ${analysis.aiVersion}.`
        : ecgCase.finalDiagnosis ?? undefined,
      authorId,
      caseId: ecgCase.id,
      clinicalIndication: ecgCase.clinicalNotes,
      contractorName: ecgCase.patient.contractor?.name,
      differentialDiagnosis: analysis?.diagnosis ? [analysis.diagnosis] : [],
      ecgMeasurements: measurement
        ? {
            heartRate: measurement.heartRate,
            prInterval: measurement.prInterval,
            qrsDuration: measurement.qrsDuration,
            qtInterval: measurement.qtInterval,
            qtcInterval: measurement.qtcInterval,
            rhythmRegularity: measurement.rhythmRegularity,
            signalQuality: measurement.signalQuality,
            stDeviation: measurement.stDeviation,
          }
        : undefined,
      finalPhysicianImpression: ecgCase.finalDiagnosis,
      organizationName: ecgCase.patient.organization?.name,
      occupationalReportSection:
        occupationalAssessment?.occupationalReportSection === null
          ? undefined
          : (occupationalAssessment?.occupationalReportSection as Prisma.InputJsonValue | undefined),
      patientId: ecgCase.patientId,
      physicianLicenseNumber: author.licenseNumber,
      physicianName: author.name,
      physicianSpecialty: author.specialization,
      qrCodeData: pseudoQrSvg(verificationUrl),
      recommendations: analysis?.recommendations ?? [],
      referringPhysician: ecgCase.assignedDoctorId ? undefined : author.name,
      reportNumber: nextReportNumber,
      rhythmInterpretation: analysis?.rhythm ?? ecgCase.ecgType,
      severityClassification: analysis?.severity ?? ecgCase.priority,
      urgentActions: analysis?.urgentActions ?? [],
      verificationToken,
      verificationUrl,
    },
  });
  await createReportVersion(report, authorId, "Initial report generated from ECG case data.");
  await prisma.auditLog.create({
    data: {
      action: "REPORT_CREATED",
      actorId: authorId,
      caseId: ecgCase.id,
      message: `Clinical report ${report.reportNumber} generated.`,
      patientId: ecgCase.patientId,
    },
  });
  return persistReportArtifacts(report.id);
}

export async function ensureClinicalReportForCase(caseId: string, authorId: string) {
  const existing = await prisma.clinicalReport.findFirst({
    orderBy: { createdAt: "desc" },
    where: { archivedAt: null, caseId },
  });
  if (existing) {
    return existing.pdfStoragePath && existing.htmlStoragePath ? existing : persistReportArtifacts(existing.id);
  }
  return generateClinicalReport(caseId, authorId);
}

export function serializeReport(report: ReportWithRelations | ClinicalReport) {
  return {
    acquisitionDate: report.acquisitionDate.toISOString(),
    aiFindings: report.aiFindings ?? undefined,
    archivedAt: report.archivedAt?.toISOString(),
    authorId: report.authorId,
    caseId: report.caseId,
    caseNumber: "case" in report ? report.case?.caseNumber ?? report.case?.caseId : undefined,
    clinicalIndication: report.clinicalIndication ?? undefined,
    contractorName: report.contractorName ?? undefined,
    createdAt: report.createdAt.toISOString(),
    differentialDiagnosis: report.differentialDiagnosis,
    ecgMeasurements: report.ecgMeasurements,
    electronicSignaturePath: report.electronicSignaturePath ?? undefined,
    emailLogs: "emailLogs" in report ? report.emailLogs?.map((log) => ({
      id: log.id,
      recipient: log.recipient,
      senderId: log.senderId,
      sentAt: log.sentAt.toISOString(),
      status: log.status,
    })) : undefined,
    finalPhysicianImpression: report.finalPhysicianImpression ?? undefined,
    finalizedAt: report.finalizedAt?.toISOString(),
    finalizedById: report.finalizedById ?? undefined,
    generatedAt: report.generatedAt.toISOString(),
    id: report.id,
    organizationName: report.organizationName ?? undefined,
    occupationalReportSection: report.occupationalReportSection,
    patientId: report.patientId,
    patientName: "patient" in report && report.patient ? `${report.patient.firstName} ${report.patient.lastName}`.trim() : undefined,
    patientCode: "patient" in report ? report.patient?.patientCode ?? undefined : undefined,
    physicianLicenseNumber: report.physicianLicenseNumber ?? undefined,
    physicianName: report.physicianName,
    physicianSpecialty: report.physicianSpecialty ?? undefined,
    pdfStoragePath: report.pdfStoragePath ?? undefined,
    htmlStoragePath: report.htmlStoragePath ?? undefined,
    verificationUrl: report.verificationUrl ?? undefined,
    qrCodeData: report.qrCodeData ?? undefined,
    recommendations: report.recommendations,
    referringPhysician: report.referringPhysician ?? undefined,
    reportNumber: report.reportNumber,
    reportingDate: report.reportingDate.toISOString(),
    rhythmInterpretation: report.rhythmInterpretation ?? undefined,
    severityClassification: report.severityClassification ?? undefined,
    signedAt: report.signedAt?.toISOString(),
    signedById: report.signedById ?? undefined,
    status: report.status.toLowerCase(),
    updatedAt: report.updatedAt.toISOString(),
    urgentActions: report.urgentActions,
    versions: "versions" in report ? report.versions?.map((version) => ({
      authorId: version.authorId,
      createdAt: version.createdAt.toISOString(),
      id: version.id,
      modifications: version.modifications,
      versionNumber: version.versionNumber,
    })) : undefined,
  };
}

export function statusFromApi(status: "draft" | "under_review"): ReportStatus {
  return status === "under_review" ? "UNDER_REVIEW" : "DRAFT";
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export async function buildReportHtml(reportIdOrReport: string | ClinicalReport, baseUrl = "") {
  const report = await loadReportContext(typeof reportIdOrReport === "string" ? reportIdOrReport : reportIdOrReport.id);
  const analysis = report.case.analyses[0];
  const imageFile = report.case.files.find((file) => file.mimeType.startsWith("image/"));
  const originalEcgUrl = imageFile ? `${baseUrl}/api/ecg/files/${imageFile.id}/download` : report.case.imagePath ?? report.case.pdfPath ?? "";
  const verificationUrl = report.verificationUrl ?? reportVerificationPath(report);
  const qrCodeData = report.qrCodeData ?? pseudoQrSvg(verificationUrl);
  const patientName = `${report.patient.firstName} ${report.patient.middleName ?? ""} ${report.patient.lastName}`.replace(/\s+/g, " ").trim();
  const organization = report.patient.organization;
  const organizationLogo = organization?.logo ?? "";
  const cardiovascularHistory = report.patient.cardiovascularHistory ?? report.patient.medicalHistory ?? "None recorded";
  const medications = report.patient.medications ?? "None recorded";
  const risks = riskFactors(report.patient);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.reportNumber)} ECG Medical Report</title>
  <style>
    :root { color-scheme: light; font-family: Inter, Arial, sans-serif; }
    body { margin: 0; background: #f1f5f9; color: #0f172a; }
    .page { max-width: 1040px; margin: 24px auto; background: #fff; border: 1px solid #cbd5e1; box-shadow: 0 20px 60px rgba(15,23,42,.12); }
    .header { display: grid; grid-template-columns: 96px 1fr 168px; gap: 18px; padding: 28px; border-bottom: 4px solid #0e7490; align-items: center; }
    .logo { width: 84px; height: 84px; border-radius: 18px; background: #0e7490; color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 22px; overflow: hidden; }
    .logo img { width: 100%; height: 100%; object-fit: contain; background: #fff; }
    h1 { margin: 0; font-size: 28px; letter-spacing: -.03em; }
    h2 { margin: 0 0 10px; font-size: 16px; color: #0e7490; text-transform: uppercase; letter-spacing: .08em; }
    .muted { color: #64748b; font-size: 12px; line-height: 1.5; }
    .qr { text-align: center; font-size: 10px; color: #475569; }
    .qr img { width: 120px; height: 120px; border: 1px solid #cbd5e1; padding: 6px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; padding: 20px 28px; }
    .section { border: 1px solid #dbe3ef; border-radius: 14px; padding: 16px; break-inside: avoid; }
    .full { grid-column: 1 / -1; }
    .kv { display: grid; grid-template-columns: 180px 1fr; gap: 8px 12px; font-size: 13px; padding: 4px 0; border-bottom: 1px solid #eef2f7; }
    .kv b { color: #334155; }
    .diagnosis { font-size: 24px; color: #b91c1c; font-weight: 900; }
    .ecg-image { max-width: 100%; border: 1px solid #cbd5e1; border-radius: 12px; background: #f8fafc; min-height: 120px; object-fit: contain; }
    ul { margin: 8px 0 0; padding-left: 20px; }
    .disclaimer { background: #fff7ed; border-color: #fb923c; color: #7c2d12; }
    .signature { min-height: 70px; border-top: 1px solid #94a3b8; margin-top: 32px; padding-top: 8px; }
    .footer { padding: 16px 28px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; gap: 16px; }
    @media print { body { background: #fff; } .page { margin: 0; border: 0; box-shadow: none; max-width: none; } .no-print { display: none; } }
  </style>
</head>
<body>
  <main class="page">
    <header class="header">
      <div class="logo">${organizationLogo ? `<img src="${escapeHtml(organizationLogo)}" alt="Organization logo" />` : "ECG"}</div>
      <div>
        <h1>Professional ECG Medical Report</h1>
        <div class="muted">
          <strong>${escapeHtml(text(organization?.name ?? report.organizationName, "ECG Insight Medical AI Platform"))}</strong><br />
          ${escapeHtml(text(organization?.address, "Organization address not recorded"))}<br />
          ${escapeHtml(text(organization?.phone, "No phone"))} · ${escapeHtml(text(organization?.email, "No email"))}
        </div>
      </div>
      <div class="qr">
        <img src="${qrCodeData}" alt="QR verification code" />
        <div>Scan to verify<br />${escapeHtml(report.reportNumber)}</div>
      </div>
    </header>
    <section class="grid">
      <div class="section">
        <h2>Report Identity</h2>
        <div class="kv"><b>Report ID</b><span>${escapeHtml(report.reportNumber)}</span></div>
        <div class="kv"><b>Date and Time</b><span>${escapeHtml(report.reportingDate.toISOString())}</span></div>
        <div class="kv"><b>Status</b><span>${escapeHtml(report.status)}</span></div>
        <div class="kv"><b>Verification URL</b><span>${escapeHtml(verificationUrl)}</span></div>
      </div>
      <div class="section">
        <h2>Doctor Information</h2>
        <div class="kv"><b>Name</b><span>${escapeHtml(report.physicianName)}</span></div>
        <div class="kv"><b>Specialty</b><span>${escapeHtml(text(report.physicianSpecialty))}</span></div>
        <div class="kv"><b>License</b><span>${escapeHtml(text(report.physicianLicenseNumber))}</span></div>
        <div class="signature">Doctor Signature: ${report.electronicSignaturePath ? "Electronically signed" : "Pending signature"}</div>
      </div>
      <div class="section">
        <h2>Patient Demographics</h2>
        <div class="kv"><b>Patient</b><span>${escapeHtml(patientName)}</span></div>
        <div class="kv"><b>Patient ID</b><span>${escapeHtml(text(report.patient.patientCode ?? report.patient.medicalRecordNumber))}</span></div>
        <div class="kv"><b>Employee ID</b><span>${escapeHtml(text(report.patient.employeeId))}</span></div>
        <div class="kv"><b>DOB</b><span>${escapeHtml(report.patient.dateOfBirth.toISOString().slice(0, 10))}</span></div>
        <div class="kv"><b>Gender</b><span>${escapeHtml(report.patient.gender)}</span></div>
        <div class="kv"><b>Company</b><span>${escapeHtml(text(report.patient.company ?? organization?.name))}</span></div>
        <div class="kv"><b>Department</b><span>${escapeHtml(text(report.patient.departmentName))}</span></div>
        <div class="kv"><b>Job Title</b><span>${escapeHtml(text(report.patient.jobTitle ?? report.patient.occupation))}</span></div>
      </div>
      <div class="section">
        <h2>ECG Acquisition</h2>
        <div class="kv"><b>Case</b><span>${escapeHtml(report.case.caseNumber ?? report.case.caseId)}</span></div>
        <div class="kv"><b>Type</b><span>${escapeHtml(report.case.ecgType)}</span></div>
        <div class="kv"><b>Acquired</b><span>${escapeHtml(report.acquisitionDate.toISOString())}</span></div>
        <div class="kv"><b>Uploaded By</b><span>${escapeHtml(report.case.uploadedBy.name)}</span></div>
        <div class="kv"><b>AI Model</b><span>${escapeHtml(text(report.case.aiModelVersion ?? analysis?.aiVersion))}</span></div>
      </div>
      <div class="section full">
        <h2>Original ECG Image</h2>
        ${originalEcgUrl ? `<img class="ecg-image" src="${escapeHtml(originalEcgUrl)}" alt="Original ECG image" />` : `<div class="muted">Original ECG image is stored in the secured ECG case files.</div>`}
      </div>
      <div class="section">
        <h2>AI Diagnosis</h2>
        <div class="diagnosis">${escapeHtml(text(report.case.aiDiagnosis ?? analysis?.diagnosis ?? report.finalPhysicianImpression, "Pending"))}</div>
        <div class="kv"><b>Confidence Score</b><span>${escapeHtml(normalizeConfidence(report.case.confidenceScore ?? analysis?.confidenceScore))}</span></div>
        <div class="kv"><b>Severity</b><span>${escapeHtml(text(report.severityClassification ?? report.case.severity))}</span></div>
      </div>
      <div class="section">
        <h2>Interpretation</h2>
        <p>${escapeHtml(text(analysis?.interpretation ?? report.aiFindings ?? report.finalPhysicianImpression))}</p>
      </div>
      <div class="section">
        <h2>Recommendations</h2>
        <ul>${list(report.recommendations)}</ul>
      </div>
      <div class="section">
        <h2>Clinical Background</h2>
        <div class="kv"><b>Cardiovascular History</b><span>${escapeHtml(cardiovascularHistory)}</span></div>
        <div class="kv"><b>Medications</b><span>${escapeHtml(medications)}</span></div>
        <div class="kv"><b>Risk Factors</b><span>${escapeHtml(risks.join(", ") || "None recorded")}</span></div>
      </div>
      <div class="section disclaimer full">
        <h2>Clinical Disclaimer</h2>
        <p>This ECG Insight AI report is clinical decision support only. Diagnosis, treatment, occupational fitness decisions, and emergency activation require review and sign-off by a qualified physician with correlation to symptoms, examination, vitals, prior ECGs, and local clinical protocols.</p>
      </div>
    </section>
    <footer class="footer">
      <span>Generated by ECG Insight Enterprise Medical AI Platform</span>
      <span>${escapeHtml(report.reportNumber)} · ${escapeHtml(report.generatedAt.toISOString())}</span>
    </footer>
  </main>
</body>
</html>`;
}

function pdfLinesFromHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 28);
}

export async function buildReportPdf(reportIdOrReport: string | ClinicalReport, watermark = "ECG Insight", baseUrl = "") {
  const report = typeof reportIdOrReport === "string" ? await loadReportContext(reportIdOrReport) : await loadReportContext(reportIdOrReport.id);
  const html = await buildReportHtml(report, baseUrl);
  const lines = [
    "ECG Insight Professional ECG Medical Report",
    `Watermark: ${watermark}`,
    ...pdfLinesFromHtml(html),
    "Page 1 of 1",
  ];
  const content = [
    "BT",
    "/F1 11 Tf",
    "50 780 Td",
    ...lines.map((line, index) => `${index === 0 ? "" : "0 -24 Td"}(${escapePdfText(line).slice(0, 110)}) Tj`),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  const bodyParts: string[] = ["%PDF-1.4\n"];
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(bodyParts.join("")));
    bodyParts.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  }
  const xrefOffset = Buffer.byteLength(bodyParts.join(""));
  bodyParts.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (const offset of offsets.slice(1)) {
    bodyParts.push(`${offset.toString().padStart(10, "0")} 00000 n \n`);
  }
  bodyParts.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return Buffer.from(bodyParts.join(""), "utf8");
}

export async function persistReportArtifacts(reportId: string, baseUrl = "") {
  const report = await loadReportContext(reportId);
  const verificationUrl = report.verificationUrl ?? reportVerificationPath(report);
  const qrCodeData = report.qrCodeData ?? pseudoQrSvg(verificationUrl);
  const html = await buildReportHtml({ ...report, verificationUrl, qrCodeData }, baseUrl);
  const pdf = await buildReportPdf({ ...report, verificationUrl, qrCodeData }, "ECG Insight", baseUrl);
  const artifactId = `${report.reportNumber}-${randomUUID()}`;
  const htmlStoragePath = path.join(reportStorageRoot, `${artifactId}.html`);
  const pdfStoragePath = path.join(reportStorageRoot, `${artifactId}.pdf`);
  fs.writeFileSync(htmlStoragePath, html, "utf8");
  fs.writeFileSync(pdfStoragePath, pdf);
  return prisma.clinicalReport.update({
    data: {
      htmlStoragePath,
      pdfStoragePath,
      qrCodeData,
      verificationUrl,
    },
    where: { id: report.id },
  });
}

export async function verifyReport(reportNumber: string, token?: string) {
  const report = await prisma.clinicalReport.findUnique({
    select: {
      generatedAt: true,
      id: true,
      patient: { select: { patientCode: true } },
      physicianName: true,
      reportNumber: true,
      reportingDate: true,
      status: true,
      verificationToken: true,
    },
    where: { reportNumber },
  });
  if (!report || (token && token !== report.verificationToken)) {
    return { verified: false };
  }
  if (!token) return { verified: false };
  return {
    generatedAt: report.generatedAt.toISOString(),
    patientCode: report.patient.patientCode ?? undefined,
    physicianName: report.physicianName,
    reportId: report.id,
    reportNumber: report.reportNumber,
    reportingDate: report.reportingDate.toISOString(),
    status: report.status.toLowerCase(),
    verified: true,
  };
}
