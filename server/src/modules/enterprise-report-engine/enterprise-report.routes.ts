import { Router } from "express";
import type { Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { validateBody, validateQuery } from "../../middleware/validate";
import { assertResourceAccess, canAccessCase, canAccessOwnedResource, canAccessPatient } from "../../utils/resource-access";
import { serializeReport } from "../reports/reports.service";
import {
  exportEnterpriseReport,
  generateEnterpriseReport,
  getEnterpriseReportDocument,
  listEnterpriseTemplates,
  seedEnterpriseReportTemplates,
  serializeEnterpriseTemplate,
  trackEnterpriseExport,
  verifyEnterpriseReport,
} from "./enterprise-report.service";
import { listReportHistory } from "./history.service";
import { exportEnterpriseReportSchema, generateEnterpriseReportSchema, templateQuerySchema } from "./schemas";
import { renderEnterpriseReportHtml } from "./html-renderer";

export const enterpriseReportEngineRouter = Router();

function requestBaseUrl(req: { get(header: string): string | undefined; protocol: string }) {
  const host = req.get("host");
  return host ? `${req.protocol}://${host}` : "";
}

enterpriseReportEngineRouter.get("/verify/:reportUuid", async (req, res, next) => {
  try {
    res.json({
      verification: await verifyEnterpriseReport(
        String(req.params.reportUuid),
        typeof req.query.token === "string" ? req.query.token : undefined,
      ),
    });
  } catch (error) {
    next(error);
  }
});

enterpriseReportEngineRouter.use(requireAuth);

async function reportForAccess(reportId: string, auth: { id: string; role: Role }) {
  const report = await prisma.clinicalReport.findUnique({
    include: {
      author: { select: { email: true, id: true, name: true } },
      case: { select: { caseId: true, caseNumber: true } },
      patient: { select: { firstName: true, id: true, lastName: true, patientCode: true } },
    },
    where: { id: reportId },
  });
  if (!report) throw new AppError(404, "Clinical report not found.", "REPORT_NOT_FOUND");
  assertResourceAccess(
    canAccessOwnedResource(auth, [report.authorId, report.finalizedById, report.signedById]) ||
      (await canAccessPatient(report.patientId, auth)) ||
      (await canAccessCase(report.caseId, auth)),
    "You do not have access to this report.",
  );
  return report;
}

enterpriseReportEngineRouter.post("/bootstrap", requireRole("SUPER_ADMIN"), async (_req, res, next) => {
  try {
    await seedEnterpriseReportTemplates();
    const templates = await listEnterpriseTemplates();
    res.json({ count: templates.length, templates: templates.map(serializeEnterpriseTemplate) });
  } catch (error) {
    next(error);
  }
});

enterpriseReportEngineRouter.get("/templates", validateQuery(templateQuerySchema), async (req, res, next) => {
  try {
    const query = templateQuerySchema.parse(req.query);
    const templates = await listEnterpriseTemplates({
      category: query.category,
      reportType: query.reportType,
    });
    res.json({ templates: templates.map(serializeEnterpriseTemplate) });
  } catch (error) {
    next(error);
  }
});

enterpriseReportEngineRouter.get("/templates/:slug", async (req, res, next) => {
  try {
    const template = await prisma.enterpriseReportTemplate.findUnique({ where: { slug: String(req.params.slug) } });
    if (!template) throw new AppError(404, "Report template not found.", "TEMPLATE_NOT_FOUND");
    res.json({ template: serializeEnterpriseTemplate(template) });
  } catch (error) {
    next(error);
  }
});

enterpriseReportEngineRouter.post(
  "/cases/:caseId/generate",
  requireRole("DOCTOR"),
  validateBody(generateEnterpriseReportSchema),
  async (req, res, next) => {
    try {
      assertResourceAccess(await canAccessCase(String(req.params.caseId), req.auth!));
      const result = await generateEnterpriseReport({
        authorId: req.auth!.id,
        baseUrl: requestBaseUrl(req),
        caseId: String(req.params.caseId),
        departmentName: req.body.departmentName,
        reportType: req.body.reportType,
        templateCategory: req.body.templateCategory,
        templateSlug: req.body.templateSlug,
      });
      res.status(201).json({
        document: result.document,
        report: serializeReport(result.report),
      });
    } catch (error) {
      next(error);
    }
  },
);

enterpriseReportEngineRouter.get("/:reportId/document", async (req, res, next) => {
  try {
    await reportForAccess(String(req.params.reportId), req.auth!);
    const document = await getEnterpriseReportDocument(String(req.params.reportId), requestBaseUrl(req));
    res.json({ document });
  } catch (error) {
    next(error);
  }
});

enterpriseReportEngineRouter.get("/:reportId/html", async (req, res, next) => {
  try {
    await reportForAccess(String(req.params.reportId), req.auth!);
    const document = await getEnterpriseReportDocument(String(req.params.reportId), requestBaseUrl(req));
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.send(renderEnterpriseReportHtml(document));
  } catch (error) {
    next(error);
  }
});

enterpriseReportEngineRouter.get("/:reportId/json", async (req, res, next) => {
  try {
    const report = await reportForAccess(String(req.params.reportId), req.auth!);
    const payload = await exportEnterpriseReport(report.id, "JSON", req.auth!.id, requestBaseUrl(req));
    await trackEnterpriseExport(report.id, "JSON", req.auth!.id);
    res.setHeader("content-type", payload.contentType);
    res.setHeader("content-disposition", `attachment; filename="${payload.filename}"`);
    res.send(payload.data);
  } catch (error) {
    next(error);
  }
});

enterpriseReportEngineRouter.get("/:reportId/fhir", async (req, res, next) => {
  try {
    const report = await reportForAccess(String(req.params.reportId), req.auth!);
    const payload = await exportEnterpriseReport(report.id, "FHIR", req.auth!.id, requestBaseUrl(req));
    await trackEnterpriseExport(report.id, "FHIR", req.auth!.id);
    res.setHeader("content-type", payload.contentType);
    res.setHeader("content-disposition", `attachment; filename="${payload.filename}"`);
    res.send(payload.data);
  } catch (error) {
    next(error);
  }
});

enterpriseReportEngineRouter.get("/:reportId/pdf", async (req, res, next) => {
  try {
    const report = await reportForAccess(String(req.params.reportId), req.auth!);
    const payload = await exportEnterpriseReport(report.id, "PDF", req.auth!.id, requestBaseUrl(req));
    await trackEnterpriseExport(report.id, "PDF", req.auth!.id);
    res.setHeader("content-type", payload.contentType);
    res.setHeader("content-disposition", `attachment; filename="${payload.filename}"`);
    res.send(payload.data);
  } catch (error) {
    next(error);
  }
});

enterpriseReportEngineRouter.get("/:reportId/png", async (req, res, next) => {
  try {
    const report = await reportForAccess(String(req.params.reportId), req.auth!);
    const payload = await exportEnterpriseReport(report.id, "PNG", req.auth!.id, requestBaseUrl(req));
    await trackEnterpriseExport(report.id, "PNG", req.auth!.id);
    res.setHeader("content-type", payload.contentType);
    res.setHeader("content-disposition", `attachment; filename="${payload.filename}"`);
    res.send(payload.data);
  } catch (error) {
    next(error);
  }
});

enterpriseReportEngineRouter.get("/:reportId/jpeg", async (req, res, next) => {
  try {
    const report = await reportForAccess(String(req.params.reportId), req.auth!);
    const payload = await exportEnterpriseReport(report.id, "JPEG", req.auth!.id, requestBaseUrl(req));
    await trackEnterpriseExport(report.id, "JPEG", req.auth!.id);
    res.setHeader("content-type", payload.contentType);
    res.setHeader("content-disposition", `attachment; filename="${payload.filename}"`);
    res.send(payload.data);
  } catch (error) {
    next(error);
  }
});

enterpriseReportEngineRouter.get("/:reportId/print", async (req, res, next) => {
  try {
    const report = await reportForAccess(String(req.params.reportId), req.auth!);
    const payload = await exportEnterpriseReport(report.id, "PRINT", req.auth!.id, requestBaseUrl(req));
    await trackEnterpriseExport(report.id, "PRINT", req.auth!.id);
    const html = payload.data.toString("utf8").replace("</body>", "<script>window.addEventListener('load',()=>window.print());</script></body>");
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.send(html);
  } catch (error) {
    next(error);
  }
});

enterpriseReportEngineRouter.post("/:reportId/export", validateBody(exportEnterpriseReportSchema), async (req, res, next) => {
  try {
    const report = await reportForAccess(String(req.params.reportId), req.auth!);
    const payload = await exportEnterpriseReport(report.id, req.body.format, req.auth!.id, requestBaseUrl(req));
    const exportLog = await trackEnterpriseExport(report.id, req.body.format, req.auth!.id, payload.metadata as Record<string, unknown> | undefined);
    if (req.body.format === "JSON" || req.body.format === "FHIR" || req.body.format === "CLIPBOARD" || req.body.format === "SHARE" || req.body.format === "EMAIL") {
      res.status(202).json({
        exportLog: {
          exportedAt: exportLog.exportedAt.toISOString(),
          format: exportLog.format,
          id: exportLog.id,
        },
        filename: payload.filename,
        metadata: payload.metadata,
        payload: payload.data.toString("utf8"),
      });
      return;
    }
    res.setHeader("content-type", payload.contentType);
    res.setHeader("content-disposition", `attachment; filename="${payload.filename}"`);
    res.send(payload.data);
  } catch (error) {
    next(error);
  }
});

enterpriseReportEngineRouter.get("/:reportId/history", async (req, res, next) => {
  try {
    const report = await reportForAccess(String(req.params.reportId), req.auth!);
    const history = await listReportHistory(report.id);
    res.json({
      events: history.events.map((event) => ({
        action: event.action,
        actor: event.actor ? { email: event.actor.email, id: event.actor.id, name: event.actor.name } : null,
        createdAt: event.createdAt.toISOString(),
        details: event.details,
        id: event.id,
        metadata: event.metadata,
      })),
      exports: history.exports.map((entry) => ({
        exportedAt: entry.exportedAt.toISOString(),
        exportedBy: { email: entry.exportedBy.email, id: entry.exportedBy.id, name: entry.exportedBy.name },
        format: entry.format,
        id: entry.id,
        metadata: entry.metadata,
      })),
      versions: history.versions.map((version) => ({
        author: { email: version.author.email, id: version.author.id, name: version.author.name },
        createdAt: version.createdAt.toISOString(),
        id: version.id,
        modifications: version.modifications,
        versionNumber: version.versionNumber,
      })),
    });
  } catch (error) {
    next(error);
  }
});
