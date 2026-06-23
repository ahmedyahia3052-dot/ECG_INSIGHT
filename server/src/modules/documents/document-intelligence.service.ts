import fs from "node:fs/promises";
import path from "node:path";
import type { ClinicalDocument, DocumentCategory, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";

type DocumentWithPatient = ClinicalDocument & {
  patient: {
    organizationId: string | null;
  };
};

const documentTypeLabels: Record<DocumentCategory, string> = {
  ANGIOGRAPHY: "Coronary Angiography Report",
  CARDIAC_CT: "Cardiac CT Report",
  CARDIAC_MRI: "Cardiac MRI Report",
  CATH_REPORTS: "Cardiac Catheterization Report",
  DISCHARGE_SUMMARY: "Discharge Summary",
  ECG: "ECG Report",
  ECHOCARDIOGRAPHY: "Echocardiography Report",
  HOLTER: "Holter Report",
  LABORATORY_RESULTS: "Laboratory Report",
  OTHER: "Consultation Report",
  STRESS_ECG: "Stress ECG Report",
  SURGERY_REPORTS: "Operative Report",
};

function numberAfter(pattern: RegExp, text: string) {
  const match = text.match(pattern);
  return match ? Number(match[1]) : undefined;
}

function textContains(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

async function readBestEffortText(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if ([".txt", ".csv", ".json"].includes(ext)) {
    return fs.readFile(filePath, "utf8");
  }
  const buffer = await fs.readFile(filePath);
  const printable = buffer
    .toString("latin1")
    .replace(/[^\x20-\x7E\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return printable.length > 80 ? printable.slice(0, 12000) : "";
}

export class DocumentOCRService {
  async extractText(document: ClinicalDocument) {
    const text = await readBestEffortText(document.storagePath);
    if (text) return text;
    return [
      `${documentTypeLabels[document.category]} uploaded as ${document.originalName}.`,
      "OCR placeholder: scanned or binary document requires human review.",
    ].join(" ");
  }

  detectDocumentType(document: ClinicalDocument, rawText: string) {
    const text = `${document.originalName} ${rawText}`.toLowerCase();
    if (text.includes("echo") || text.includes("ejection fraction")) return "ECHOCARDIOGRAPHY";
    if (text.includes("stress") || text.includes("mets")) return "STRESS_ECG";
    if (text.includes("holter")) return "HOLTER";
    if (text.includes("cath") || text.includes("angiography") || text.includes("stenosis")) return "CATH_REPORTS";
    if (text.includes("cabg") || text.includes("operative")) return "SURGERY_REPORTS";
    if (text.includes("troponin") || text.includes("hba1c") || text.includes("creatinine")) return "LABORATORY_RESULTS";
    if (text.includes("fitness")) return "OTHER";
    return document.category;
  }

  extractStructuredData(rawText: string, documentType: string) {
    const rhythm = rawText.match(/rhythm[:\s-]+([a-z\s]+)/i)?.[1]?.trim().slice(0, 80);
    const stAbnormalities = textContains(rawText, ["st elevation", "st depression", "ischemia"]);
    const tWaveAbnormalities = textContains(rawText, ["t wave inversion", "t-wave inversion", "t wave abnormal"]);
    const stenosis = numberAfter(/(\d{2,3})\s*%\s*stenosis/i, rawText);
    const stents = numberAfter(/(\d+)\s*stents?/i, rawText);

    return {
      cathPci: {
        numberOfVessels: numberAfter(/(\d+)\s*vessel/i, rawText),
        procedureDate: rawText.match(/procedure date[:\s-]+([0-9/-]+)/i)?.[1],
        stenosisPercent: stenosis,
        stents,
      },
      documentType,
      echo: {
        ejectionFraction: numberAfter(/(?:ef|ejection fraction)[:\s-]*(\d{2})\s*%?/i, rawText),
        lvDimensions: rawText.match(/lv dimensions?[:\s-]+([^.;]+)/i)?.[1]?.trim(),
        pulmonaryPressure: numberAfter(/pulmonary pressure[:\s-]*(\d+)/i, rawText),
        valvularDisease: textContains(rawText, ["mitral", "aortic", "tricuspid", "valvular"]),
        wallMotionAbnormalities: textContains(rawText, ["wall motion abnormal", "hypokinesia", "akinesia"]),
      },
      ecg: {
        electricalAxis: rawText.match(/axis[:\s-]+([^.;]+)/i)?.[1]?.trim(),
        heartRate: numberAfter(/(?:heart rate|hr)[:\s-]*(\d{2,3})/i, rawText),
        prInterval: numberAfter(/pr[:\s-]*(\d{2,3})/i, rawText),
        qrsDuration: numberAfter(/qrs[:\s-]*(\d{2,3})/i, rawText),
        qt: numberAfter(/qt[:\s-]*(\d{2,3})/i, rawText),
        qtc: numberAfter(/qtc[:\s-]*(\d{2,3})/i, rawText),
        rhythm,
        stAbnormalities,
        tWaveAbnormalities,
      },
      labs: {
        creatinine: numberAfter(/creatinine[:\s-]*(\d+(?:\.\d+)?)/i, rawText),
        hb: numberAfter(/(?:hb|hemoglobin)[:\s-]*(\d+(?:\.\d+)?)/i, rawText),
        hba1c: numberAfter(/hba1c[:\s-]*(\d+(?:\.\d+)?)/i, rawText),
        lipidProfile: rawText.match(/lipid profile[:\s-]+([^.;]+)/i)?.[1]?.trim(),
        troponin: numberAfter(/troponin[:\s-]*(\d+(?:\.\d+)?)/i, rawText),
      },
      stressTest: {
        arrhythmias: textContains(rawText, ["arrhythmia", "vt", "af"]),
        exerciseDuration: rawText.match(/exercise duration[:\s-]+([^.;]+)/i)?.[1]?.trim(),
        ischemicChanges: textContains(rawText, ["ischemic", "st depression", "positive stress"]),
        mets: numberAfter(/mets[:\s-]*(\d+(?:\.\d+)?)/i, rawText),
      },
    };
  }

  generateClinicalSummary(rawText: string, structuredData: Prisma.InputJsonObject) {
    const abnormalities: string[] = [];
    const data = structuredData as {
      cathPci?: { stenosisPercent?: number; stents?: number };
      echo?: { ejectionFraction?: number; valvularDisease?: boolean };
      ecg?: { heartRate?: number; stAbnormalities?: boolean; tWaveAbnormalities?: boolean };
      stressTest?: { ischemicChanges?: boolean };
    };
    if (data.ecg?.stAbnormalities) abnormalities.push("ST abnormalities");
    if (data.ecg?.tWaveAbnormalities) abnormalities.push("T-wave abnormalities");
    if (data.echo?.ejectionFraction && data.echo.ejectionFraction < 40) abnormalities.push("Reduced EF below 40%");
    if (data.echo?.valvularDisease) abnormalities.push("Valvular disease");
    if (data.stressTest?.ischemicChanges) abnormalities.push("Stress-induced ischemic changes");
    if (data.cathPci?.stenosisPercent && data.cathPci.stenosisPercent >= 70) abnormalities.push("Severe coronary stenosis");
    if (data.cathPci?.stents) abnormalities.push(`${data.cathPci.stents} stent(s) reported`);

    const importantAbnormalities = abnormalities.length ? abnormalities.join(", ") : "No high-confidence abnormality extracted.";
    const occupationalRisk = abnormalities.length ? "Requires occupational cardiology review for safety-sensitive work." : "No immediate occupational restriction inferred.";
    const suggestedNextAction = abnormalities.length ? "Physician review and EMR confirmation recommended." : "Store in EMR and continue routine surveillance.";
    return {
      aiSummary: `Clinical Findings: ${rawText.slice(0, 220)}${rawText.length > 220 ? "..." : ""}`,
      diagnosis: abnormalities[0] ?? undefined,
      recommendations: [suggestedNextAction, occupationalRisk],
      summaryJson: {
        clinicalFindings: rawText.slice(0, 500),
        fitnessRecommendation: abnormalities.length ? "Specialist review required" : "Fit for routine work pending physician confirmation",
        importantAbnormalities,
        occupationalRisk,
        suggestedNextAction,
      },
    };
  }
}

export class DocumentIndexService {
  async indexDocument(document: DocumentWithPatient, rawText: string, aiSummary?: string) {
    const searchText = [
      document.title,
      document.originalName,
      document.category,
      rawText,
      aiSummary,
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 50000);
    return prisma.documentSearchIndex.upsert({
      create: {
        documentId: document.id,
        documentType: document.category,
        organizationId: document.patient.organizationId,
        patientId: document.patientId,
        searchText,
      },
      update: {
        documentType: document.category,
        organizationId: document.patient.organizationId,
        searchText,
      },
      where: { documentId: document.id },
    });
  }
}

export async function extractAndIndexDocument(documentId: string, actorId: string) {
  const document = await prisma.clinicalDocument.findUnique({
    include: { patient: { select: { organizationId: true } } },
    where: { id: documentId },
  });
  if (!document) throw new AppError(404, "Clinical document not found.", "DOCUMENT_NOT_FOUND");

  const ocr = new DocumentOCRService();
  const indexer = new DocumentIndexService();
  const rawText = await ocr.extractText(document);
  const documentType = ocr.detectDocumentType(document, rawText);
  const structuredData = ocr.extractStructuredData(rawText, documentType) as Prisma.InputJsonObject;
  const summary = ocr.generateClinicalSummary(rawText, structuredData);
  const extractedJson = {
    ...structuredData,
    aiSummary: summary.summaryJson,
  } as Prisma.InputJsonObject;

  const extraction = await prisma.documentExtraction.upsert({
    create: {
      aiSummary: summary.aiSummary,
      confidenceScore: rawText.includes("OCR placeholder") ? 0.55 : 0.82,
      diagnosis: summary.diagnosis,
      documentId: document.id,
      extractedJson,
      organizationId: document.patient.organizationId,
      patientId: document.patientId,
      rawText,
      recommendations: summary.recommendations,
    },
    update: {
      aiSummary: summary.aiSummary,
      confidenceScore: rawText.includes("OCR placeholder") ? 0.55 : 0.82,
      diagnosis: summary.diagnosis,
      extractedJson,
      organizationId: document.patient.organizationId,
      rawText,
      recommendations: summary.recommendations,
      reviewStatus: "PENDING",
    },
    where: { documentId: document.id },
  });
  const index = await indexer.indexDocument(document, rawText, summary.aiSummary);

  await prisma.timelineEvent.create({
    data: {
      metadata: { documentId: document.id, documentType, extractionId: extraction.id },
      patientId: document.patientId,
      title: `${documentTypeLabels[document.category]} extracted`,
      type: "DOCUMENT_EXTRACTED",
    },
  });
  await prisma.auditLog.create({
    data: {
      action: "DOCUMENT_EXTRACTED",
      actorId,
      message: `Document intelligence extracted ${document.originalName}.`,
      metadata: { documentId: document.id, extractionId: extraction.id, indexId: index.id },
      patientId: document.patientId,
    },
  });

  return { extraction, index };
}

export function serializeExtraction(extraction: {
  aiSummary: string;
  confidenceScore: number;
  createdAt: Date;
  diagnosis: string | null;
  documentId: string;
  extractedJson: Prisma.JsonValue;
  id: string;
  patientId: string;
  rawText: string;
  recommendations: string[];
  reviewStatus: string;
  updatedAt: Date;
}) {
  return {
    aiSummary: extraction.aiSummary,
    confidenceScore: extraction.confidenceScore,
    createdAt: extraction.createdAt.toISOString(),
    diagnosis: extraction.diagnosis ?? undefined,
    documentId: extraction.documentId,
    extractedJson: extraction.extractedJson,
    id: extraction.id,
    patientId: extraction.patientId,
    rawText: extraction.rawText,
    recommendations: extraction.recommendations,
    reviewStatus: extraction.reviewStatus.toLowerCase(),
    updatedAt: extraction.updatedAt.toISOString(),
  };
}
