import fs from "node:fs";
import path from "node:path";
import type { EnterpriseReportType, ReportExportFormat, ReportTemplateCategory } from "@prisma/client";
import sharp from "sharp";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import { generateClinicalReport, persistReportArtifacts } from "../reports/reports.service";
import { composeEnterpriseReportDocument, persistReportSecurityHashes } from "./composer";
import { buildFhirBundle } from "./fhir-export";
import { recordReportExport, recordReportHistory } from "./history.service";
import { renderEnterpriseReportHtml } from "./html-renderer";
import { renderEnterpriseReportPdf, renderEnterpriseReportSvg } from "./pdf-renderer";
import { ENTERPRISE_REPORT_TEMPLATES } from "./templates";
import { verifyReportIntegrity } from "./security";

const reportStorageRoot = path.resolve(process.cwd(), "uploads", "enterprise-reports");
fs.mkdirSync(reportStorageRoot, { recursive: true });

export async function seedEnterpriseReportTemplates() {
  for (const template of ENTERPRISE_REPORT_TEMPLATES) {
    await prisma.enterpriseReportTemplate.upsert({
      create: {
        branding: template.branding ?? undefined,
        category: template.category,
        description: template.description,
        isSystem: true,
        name: template.name,
        reportType: template.reportType,
        sections: template.sections,
        slug: template.slug,
      },
      update: {
        branding: template.branding ?? undefined,
        category: template.category,
        description: template.description,
        name: template.name,
        reportType: template.reportType,
        sections: template.sections,
      },
      where: { slug: template.slug },
    });
  }
}

let enterpriseTemplatesSeeded = false;

async function ensureEnterpriseReportTemplatesSeeded() {
  if (enterpriseTemplatesSeeded) return;
  const expected = ENTERPRISE_REPORT_TEMPLATES.length;
  const count = await prisma.enterpriseReportTemplate.count({ where: { isSystem: true } });
  if (count >= expected) {
    enterpriseTemplatesSeeded = true;
    return;
  }
  await seedEnterpriseReportTemplates();
  enterpriseTemplatesSeeded = true;
}

export async function listEnterpriseTemplates(filters?: {
  category?: ReportTemplateCategory;
  reportType?: EnterpriseReportType;
}) {
  await ensureEnterpriseReportTemplatesSeeded();
  return prisma.enterpriseReportTemplate.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    where: {
      category: filters?.category,
      reportType: filters?.reportType,
      isSystem: true,
    },
  });
}

export async function generateEnterpriseReport(input: {
  caseId: string;
  authorId: string;
  reportType?: EnterpriseReportType;
  templateSlug?: string;
  templateCategory?: ReportTemplateCategory;
  departmentName?: string;
  baseUrl?: string;
}) {
  const template = input.templateSlug
    ? await prisma.enterpriseReportTemplate.findUnique({ where: { slug: input.templateSlug } })
    : null;

  const report = await generateClinicalReport(input.caseId, input.authorId);
  const updated = await prisma.clinicalReport.update({
    data: {
      departmentName: input.departmentName,
      reportType: input.reportType ?? template?.reportType ?? "PROFESSIONAL_ECG",
      templateCategory: input.templateCategory ?? template?.category,
      templateId: template?.id,
    },
    where: { id: report.id },
  });

  const document = await composeEnterpriseReportDocument(updated.id, input.baseUrl ?? "", {
    reportType: updated.reportType,
    templateCategory: updated.templateCategory ?? undefined,
    templateSlug: template?.slug,
  });
  await persistReportSecurityHashes(updated.id, document);

  const html = renderEnterpriseReportHtml(document);
  const pdf = renderEnterpriseReportPdf(document, document.branding.watermark);
  const artifactId = `${updated.reportNumber}-enterprise`;
  const htmlStoragePath = path.join(reportStorageRoot, `${artifactId}.html`);
  const pdfStoragePath = path.join(reportStorageRoot, `${artifactId}.pdf`);
  fs.writeFileSync(htmlStoragePath, html, "utf8");
  fs.writeFileSync(pdfStoragePath, pdf);

  await prisma.clinicalReport.update({
    data: { htmlStoragePath, pdfStoragePath },
    where: { id: updated.id },
  });
  await recordReportHistory(updated.id, "generated", input.authorId, `Enterprise report generated (${updated.reportType})`);
  await persistReportArtifacts(updated.id, input.baseUrl ?? "");
  return { document, report: updated };
}

export async function getEnterpriseReportDocument(reportId: string, baseUrl = "") {
  const document = await composeEnterpriseReportDocument(reportId, baseUrl);
  await persistReportSecurityHashes(reportId, document);
  return document;
}

export async function exportEnterpriseReport(
  reportId: string,
  format: ReportExportFormat,
  actorId: string,
  baseUrl = "",
) {
  const report = await prisma.clinicalReport.findUnique({ where: { id: reportId } });
  if (!report) throw new AppError(404, "Clinical report not found.", "REPORT_NOT_FOUND");

  const document = await composeEnterpriseReportDocument(reportId, baseUrl);
  await persistReportSecurityHashes(reportId, document);

  switch (format) {
    case "HTML":
      return { contentType: "text/html; charset=utf-8", data: renderEnterpriseReportHtml(document), filename: `${report.reportNumber}.html` };
    case "PDF":
      return { contentType: "application/pdf", data: renderEnterpriseReportPdf(document, document.branding.watermark), filename: `${report.reportNumber}.pdf` };
    case "JSON":
      return { contentType: "application/json", data: Buffer.from(JSON.stringify(document, null, 2), "utf8"), filename: `${report.reportNumber}.json` };
    case "FHIR":
      return { contentType: "application/fhir+json", data: Buffer.from(JSON.stringify(buildFhirBundle(document), null, 2), "utf8"), filename: `${report.reportNumber}-fhir.json` };
    case "PNG": {
      const png = await sharp(Buffer.from(renderEnterpriseReportSvg(document), "utf8")).png().toBuffer();
      return { contentType: "image/png", data: png, filename: `${report.reportNumber}.png` };
    }
    case "JPEG": {
      const jpeg = await sharp(Buffer.from(renderEnterpriseReportSvg(document), "utf8")).jpeg({ quality: 92 }).toBuffer();
      return { contentType: "image/jpeg", data: jpeg, filename: `${report.reportNumber}.jpg` };
    }
    case "PRINT":
    case "CLIPBOARD":
    case "SHARE":
    case "EMAIL":
      return {
        contentType: "text/html; charset=utf-8",
        data: renderEnterpriseReportHtml(document),
        filename: `${report.reportNumber}.html`,
        metadata: { format, shareToken: report.verificationToken, verificationUrl: document.header.verificationUrl },
      };
    default:
      throw new AppError(400, `Unsupported export format: ${format}`, "UNSUPPORTED_EXPORT_FORMAT");
  }
}

export async function verifyEnterpriseReport(reportUuid: string, token?: string) {
  const report = await prisma.clinicalReport.findUnique({
    where: { reportUuid },
  });
  if (!report || (token && token !== report.verificationToken)) {
    return { verified: false };
  }
  const document = await composeEnterpriseReportDocument(report.id);
  const integrity = verifyReportIntegrity(report.contentHash, report.verificationHash, document, report.verificationToken);
  return {
    contentHash: integrity.contentHash,
    generatedAt: report.generatedAt.toISOString(),
    reportId: report.id,
    reportNumber: report.reportNumber,
    reportUuid: report.reportUuid,
    status: report.status.toLowerCase(),
    tampered: integrity.tampered,
    verified: integrity.valid,
    verificationHash: integrity.verificationHash,
  };
}

export async function trackEnterpriseExport(reportId: string, format: ReportExportFormat, actorId: string, metadata?: Record<string, unknown>) {
  return recordReportExport(reportId, format, actorId, metadata);
}

export function serializeEnterpriseTemplate(template: {
  branding: unknown;
  category: ReportTemplateCategory;
  createdAt: Date;
  description: string | null;
  id: string;
  isSystem: boolean;
  name: string;
  reportType: EnterpriseReportType;
  sections: unknown;
  slug: string;
  updatedAt: Date;
}) {
  return {
    branding: template.branding,
    category: template.category,
    createdAt: template.createdAt.toISOString(),
    description: template.description ?? undefined,
    id: template.id,
    isSystem: template.isSystem,
    name: template.name,
    reportType: template.reportType,
    sections: template.sections,
    slug: template.slug,
    updatedAt: template.updatedAt.toISOString(),
  };
}
