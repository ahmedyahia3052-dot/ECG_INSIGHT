import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { assertResourceAccess, canAccessCase } from "../../utils/resource-access";
import { prisma } from "../../config/prisma";
import { measureCaseFromStoredLeads } from "../ecg-measurement";
import type { EcgClinicalMeasurementResult } from "../ecg-measurement/types";
import {
  runMedicalIntelligenceEngine,
  getKnowledgeEntry,
  searchKnowledge,
  getKnowledgeBaseStats,
  listRuleDefinitions,
  KNOWLEDGE_BASE,
} from "./index";
import { knowledgeSearchSchema, medicalAnalysisRequestSchema } from "./medical-intelligence.schemas";
import {
  getMedicalIntelligenceReport,
  listMedicalIntelligenceReports,
  persistMedicalIntelligenceReport,
  seedKnowledgeBaseEntries,
} from "./persist";

export const medicalIntelligenceRouter = Router();

medicalIntelligenceRouter.use(requireAuth);

medicalIntelligenceRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "medical-intelligence-engine",
    version: "1.0.0",
    knowledgeBaseEntries: KNOWLEDGE_BASE.length,
    ruleCount: listRuleDefinitions().length,
  });
});

medicalIntelligenceRouter.get("/knowledge", (req, res) => {
  const parsed = knowledgeSearchSchema.parse(req.query);
  let entries = parsed.query ? searchKnowledge(parsed.query) : KNOWLEDGE_BASE;
  if (parsed.category) entries = entries.filter((e) => e.category === parsed.category);
  if (parsed.code) {
    const entry = getKnowledgeEntry(parsed.code as never);
    entries = entry ? [entry] : [];
  }
  res.json({ entries, stats: getKnowledgeBaseStats() });
});

medicalIntelligenceRouter.get("/knowledge/:code", (req, res) => {
  const entry = getKnowledgeEntry(String(req.params.code).toUpperCase() as never);
  if (!entry) {
    res.status(404).json({ error: "Diagnosis not found in knowledge base" });
    return;
  }
  res.json({ entry });
});

medicalIntelligenceRouter.get("/rules", (_req, res) => {
  res.json({ rules: listRuleDefinitions() });
});

medicalIntelligenceRouter.post("/analyze", requireRole("DOCTOR", "ADMIN", "SUPER_ADMIN"), async (req, res, next) => {
  try {
    const body = medicalAnalysisRequestSchema.parse(req.body);
    const report = runMedicalIntelligenceEngine({
      measurement: { ...body.measurement, measurements: body.measurement.measurements ?? [] } as EcgClinicalMeasurementResult,
      clinicalContext: body.clinicalContext,
      caseId: body.caseId,
      patientId: body.patientId,
    });

    let persisted = null;
    if (body.caseId) {
      persisted = await persistMedicalIntelligenceReport(report, {
        caseId: body.caseId,
        patientId: body.patientId,
        evaluatedById: req.auth!.id,
      });
    }

    res.status(201).json({ report, reportId: persisted?.id ?? null });
  } catch (error) {
    next(error);
  }
});

medicalIntelligenceRouter.post("/cases/:caseId/analyze", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId);
    assertResourceAccess(await canAccessCase(caseId, req.auth!));

    const ecgCase = await prisma.eCGCase.findUnique({
      where: { id: caseId },
      select: { patientId: true },
    });
    if (!ecgCase) {
      res.status(404).json({ error: "ECG case not found" });
      return;
    }

    const measurement = await measureCaseFromStoredLeads(caseId);
    if (!measurement) {
      res.status(404).json({ error: "No digitized ECG measurement available for case" });
      return;
    }
    const report = runMedicalIntelligenceEngine({
      measurement,
      caseId,
      patientId: ecgCase.patientId,
    });

    const persisted = await persistMedicalIntelligenceReport(report, {
      caseId,
      patientId: ecgCase.patientId,
      evaluatedById: req.auth!.id,
    });

    res.status(201).json({ report, reportId: persisted.id });
  } catch (error) {
    next(error);
  }
});

medicalIntelligenceRouter.get("/cases/:caseId/reports", async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId);
    assertResourceAccess(await canAccessCase(caseId, req.auth!));
    const reports = await listMedicalIntelligenceReports(caseId);
    res.json({ reports });
  } catch (error) {
    next(error);
  }
});

medicalIntelligenceRouter.get("/reports/:reportId", async (req, res, next) => {
  try {
    const report = await getMedicalIntelligenceReport(String(req.params.reportId));
    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    if (report.caseId) {
      assertResourceAccess(await canAccessCase(report.caseId, req.auth!));
    }
    res.json({ report });
  } catch (error) {
    next(error);
  }
});

medicalIntelligenceRouter.post("/knowledge/seed", requireRole("SUPER_ADMIN"), async (_req, res, next) => {
  try {
    const result = await seedKnowledgeBaseEntries();
    res.json(result);
  } catch (error) {
    next(error);
  }
});
