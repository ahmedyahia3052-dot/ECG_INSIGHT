import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { validateQuery } from "../../middleware/validate";
import {
  getClinicalKnowledgeById,
  getClinicalKnowledgeStats,
  getDifferentialForDiagnosis,
  getPersistedClinicalKnowledgeCount,
  listClinicalKnowledge,
  seedClinicalKnowledgeDatabase,
  serializeClinicalKnowledgeEntry,
  validateClinicalKnowledgeCatalog,
} from "./clinical-knowledge.service";
import { knowledgeQuerySchema } from "./schemas";

export const clinicalKnowledgeEngineRouter = Router();

clinicalKnowledgeEngineRouter.get("/health", (_req, res) => {
  const validation = validateClinicalKnowledgeCatalog();
  res.json({
    ok: true,
    service: "clinical-knowledge-engine",
    ...validation,
    stats: getClinicalKnowledgeStats(),
  });
});

clinicalKnowledgeEngineRouter.use(requireAuth);

clinicalKnowledgeEngineRouter.get("/diagnoses", validateQuery(knowledgeQuerySchema), (req, res) => {
  const query = knowledgeQuerySchema.parse(req.query);
  const entries = listClinicalKnowledge(query);
  res.json({
    count: entries.length,
    entries: entries.map(serializeClinicalKnowledgeEntry),
    stats: getClinicalKnowledgeStats(),
  });
});

clinicalKnowledgeEngineRouter.get("/diagnoses/:diagnosisId", (req, res) => {
  const entry = getClinicalKnowledgeById(String(req.params.diagnosisId));
  if (!entry) throw new AppError(404, "Clinical knowledge diagnosis not found.", "KNOWLEDGE_NOT_FOUND");
  res.json({ entry: serializeClinicalKnowledgeEntry(entry) });
});

clinicalKnowledgeEngineRouter.get("/diagnoses/:diagnosisId/differential", (req, res) => {
  const entry = getClinicalKnowledgeById(String(req.params.diagnosisId));
  if (!entry) throw new AppError(404, "Clinical knowledge diagnosis not found.", "KNOWLEDGE_NOT_FOUND");
  res.json({
    diagnosisId: entry.diagnosisId,
    differential: getDifferentialForDiagnosis(entry.diagnosisId),
  });
});

clinicalKnowledgeEngineRouter.get("/categories", (_req, res) => {
  res.json({ stats: getClinicalKnowledgeStats() });
});

clinicalKnowledgeEngineRouter.post("/bootstrap", requireRole("SUPER_ADMIN"), async (_req, res, next) => {
  try {
    const result = await seedClinicalKnowledgeDatabase();
    const persisted = await getPersistedClinicalKnowledgeCount();
    res.status(201).json({ ...result, persisted });
  } catch (error) {
    next(error);
  }
});

clinicalKnowledgeEngineRouter.get("/validate", (_req, res) => {
  res.json({ validation: validateClinicalKnowledgeCatalog(), stats: getClinicalKnowledgeStats() });
});
