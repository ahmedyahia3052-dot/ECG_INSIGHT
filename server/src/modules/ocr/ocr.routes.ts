import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import {
  DocumentOCRService,
  extractAndIndexDocument,
  serializeExtraction,
} from "../documents/document-intelligence.service";

const documentBodySchema = z.object({
  documentId: z.string().trim().min(1),
});

export const ocrRouter = Router();

ocrRouter.use(requireAuth);

ocrRouter.post("/process", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = documentBodySchema.parse(req.body);
    const { extraction } = await extractAndIndexDocument(body.documentId, req.auth!.id);
    res.json({ extraction: serializeExtraction(extraction) });
  } catch (error) {
    next(error);
  }
});

ocrRouter.post("/extract", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = documentBodySchema.parse(req.body);
    const document = await prisma.clinicalDocument.findUnique({ where: { id: body.documentId } });
    if (!document) throw new AppError(404, "Clinical document not found.", "DOCUMENT_NOT_FOUND");
    const service = new DocumentOCRService();
    const rawText = await service.extractText(document);
    const documentType = service.detectDocumentType(document, rawText);
    const structuredData = service.extractStructuredData(rawText, documentType);
    const summary = service.generateClinicalSummary(rawText, structuredData);
    res.json({ documentType, rawText, structuredData, summary: summary.summaryJson });
  } catch (error) {
    next(error);
  }
});
