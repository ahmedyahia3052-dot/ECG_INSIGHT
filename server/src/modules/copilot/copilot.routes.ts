import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { assertResourceAccess, canAccessCase, canAccessPatient } from "../../utils/resource-access";
import { semanticSearchKnowledge } from "./medical-knowledge";

export const copilotRouter = Router();
export const registeredCopilotRoutes = [
  "GET /api/copilot/conversations",
  "GET /api/copilot/conversations/:conversationId",
  "POST /api/copilot/chat/stream",
  "POST /api/copilot/chat",
] as const;

copilotRouter.use(requireAuth);

const OWNER_EMAIL = "ahmedyahia3052@gmail.com";
const DISCLAIMER = "AI assistance only. Clinical decisions remain the responsibility of the physician.";
const tags = ["ECG Interpretation", "Clinical Summary", "Occupational Fitness", "Differential Diagnosis", "Follow-up"] as const;
const attachmentRoot = path.resolve(process.cwd(), "uploads", "copilot");
fs.mkdirSync(attachmentRoot, { recursive: true });

type Citation = { id: string; label: string; source: string; tags?: string[]; type: string };
type AttachmentKind = "camera" | "ecg" | "echo" | "file" | "image" | "labs";

type ClinicalContext = {
  criticalAlerts: string[];
  currentCase?: {
    axis?: number | null;
    diagnosis?: string | null;
    doctorDiagnosis?: string | null;
    heartRate?: number | null;
    intervals: string;
    rhythm?: string | null;
    severity?: string;
    status?: string;
  };
  documents: string[];
  patient?: {
    age: number;
    allergies: string;
    company?: string | null;
    department?: string | null;
    employeeId?: string | null;
    fullName: string;
    gender: string;
    history: string;
    medications: string;
    occupation?: string | null;
    riskFactors: string[];
  };
  previousEcgs: string[];
  reports: string[];
  sources: Citation[];
};

type KnowledgeHit = {
  category: string;
  content: string;
  id: string;
  references: string[];
  relevanceScore: number;
  sourceName: string;
  sourceUrl?: string;
  tags: string[];
  topic: string;
};

type MedicalIntent =
  | "casual_conversation"
  | "ecg_interpretation"
  | "emergency_symptom_triage"
  | "follow_up_advice"
  | "general_medical_question"
  | "greeting"
  | "medication_question"
  | "occupational_fitness"
  | "uploaded_document_review";

type AttachmentForAnalysis = {
  analysisSummary: string | null;
  confidence: number | null;
  documentType: string | null;
  extractedText: string | null;
  kind: string;
  medicalAnalysis: Prisma.JsonValue | null;
  mimeType: string;
  originalName: string;
  recommendations: string[];
  sizeBytes: number;
  warnings: string[];
};

type AttachmentInsight = {
  confidence: number;
  documentType: string;
  findings: string[];
  interpretation: string;
  name: string;
  ocrStatus: string;
  recommendations: string[];
  warnings: string[];
};

const contextSchema = z.object({
  caseId: z.string().optional(),
  contextPath: z.string().optional(),
  contextType: z.enum(["case", "global", "patient"]).default("global"),
  patientId: z.string().optional(),
});

const createConversationSchema = contextSchema.extend({
  tag: z.enum(tags).default("ECG Interpretation"),
  title: z.string().trim().min(1).max(60).default("New Clinical Conversation"),
});

const attachmentKinds = ["camera", "ecg", "echo", "labs", "file", "image"] as const;
const attachmentSchema = z.object({
  attachmentIds: z.array(z.string().trim().min(1)).max(12).default([]),
});

const chatSchema = contextSchema.extend({
  attachmentIds: attachmentSchema.shape.attachmentIds,
  conversationId: z.string().optional(),
  question: z.string().trim().min(1).max(4000),
  tag: z.enum(tags).default("ECG Interpretation"),
});
type ChatInput = z.infer<typeof chatSchema>;

const uploadAttachmentSchema = contextSchema.extend({
  conversationId: z.string().optional(),
  kind: z.enum(attachmentKinds),
});

const settingsSchema = z.object({
  enabled: z.boolean(),
  provider: z.string().trim().min(1).max(80),
});

const attachmentRules: Record<AttachmentKind, { extensions: Set<string>; maxBytes: number; mime: Set<string> }> = {
  camera: {
    extensions: new Set([".jpg", ".jpeg", ".png", ".webp"]),
    maxBytes: 25 * 1024 * 1024,
    mime: new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]),
  },
  ecg: {
    extensions: new Set([".jpg", ".jpeg", ".png", ".pdf"]),
    maxBytes: 25 * 1024 * 1024,
    mime: new Set(["application/pdf", "image/jpeg", "image/jpg", "image/png"]),
  },
  echo: {
    extensions: new Set([".jpg", ".jpeg", ".png", ".pdf"]),
    maxBytes: 25 * 1024 * 1024,
    mime: new Set(["application/pdf", "image/jpeg", "image/jpg", "image/png"]),
  },
  labs: {
    extensions: new Set([".csv", ".jpg", ".jpeg", ".png", ".pdf"]),
    maxBytes: 20 * 1024 * 1024,
    mime: new Set(["application/pdf", "image/jpeg", "image/jpg", "image/png", "text/csv", "application/vnd.ms-excel"]),
  },
  file: {
    extensions: new Set([".docx", ".jpg", ".jpeg", ".pdf", ".png", ".txt"]),
    maxBytes: 20 * 1024 * 1024,
    mime: new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/jpg", "image/png", "text/plain"]),
  },
  image: {
    extensions: new Set([".jpg", ".jpeg", ".png", ".webp"]),
    maxBytes: 25 * 1024 * 1024,
    mime: new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]),
  },
};

function safeAttachmentName(originalName: string) {
  const ext = path.extname(originalName).toLowerCase();
  if (!Object.values(attachmentRules).some((rule) => rule.extensions.has(ext))) {
    throw new AppError(400, "Unsupported format.", "UNSUPPORTED_FORMAT");
  }
  return `${Date.now()}-${randomUUID()}${ext}`;
}

function readBestEffortOcrText(filePath: string) {
  const buffer = fs.readFileSync(filePath);
  const printable = buffer
    .toString("latin1")
    .replace(/[^\x20-\x7E\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return printable.length > 40 ? printable.slice(0, 12000) : "";
}

function detectAttachmentDocumentType(input: { kind: AttachmentKind; mimeType: string; originalName: string; text: string }) {
  const haystack = `${input.kind} ${input.mimeType} ${input.originalName} ${input.text}`.toLowerCase();
  if (input.kind === "ecg") return input.mimeType === "application/pdf" ? "ECG_PDF" : "ECG_IMAGE";
  if (/ecg|ekg|qrs|qtc|pr interval|st elevation|st depression|rhythm/.test(haystack)) return "ECG";
  if (/echo|echocardiography|ejection fraction|\bef\b|valvular|ventricle/.test(haystack)) return "ECHO_REPORT";
  if (/troponin|hba1c|creatinine|hemoglobin|lipid|laboratory|lab|cbc|potassium|sodium/.test(haystack)) return "LAB_REPORT";
  if (/x[\s-]?ray|radiograph|chest xray|cxr/.test(haystack)) return "XRAY";
  if (/\bct\b|computed tomography/.test(haystack)) return "CT_REPORT";
  if (/\bmri\b|magnetic resonance/.test(haystack)) return "MRI_REPORT";
  if (/medication|tablet|capsule|dose|prescription|drug|pharmacy/.test(haystack)) return "MEDICATION_IMAGE";
  if (/skin|rash|lesion|wound|dermatology|mole/.test(haystack)) return "SKIN_IMAGE";
  if (input.mimeType.startsWith("image/")) return input.kind === "camera" ? "CAMERA_IMAGE" : "MEDICAL_IMAGE";
  if (input.mimeType === "application/pdf") return "CLINICAL_PDF";
  return "CLINICAL_DOCUMENT";
}

function analyzeAttachment(input: { documentType: string; kind: AttachmentKind; mimeType: string; originalName: string; sizeBytes: number; text: string }) {
  const text = `${input.originalName} ${input.text}`.toLowerCase();
  const findings = new Set<string>();
  const warnings = new Set<string>([DISCLAIMER]);
  const recommendations = new Set<string>(["Physician review and correlation with the full clinical record are required."]);

  if (/st elevation|stemi|acute mi/.test(text)) {
    findings.add("Possible acute ischemic ECG language detected.");
    warnings.add("Possible STEMI or acute coronary syndrome language requires urgent clinician review.");
    recommendations.add("Compare with prior ECGs and activate local emergency pathway if clinically consistent.");
  }
  if (/atrial fibrillation|\baf\b|irregular/.test(text)) {
    findings.add("Atrial fibrillation or irregular rhythm language detected.");
    recommendations.add("Assess hemodynamic stability, stroke risk, bleeding risk, and reversible triggers.");
  }
  if (/troponin|creatinine|hba1c|potassium|hemoglobin/.test(text)) {
    findings.add("Laboratory markers were detected.");
    recommendations.add("Trend abnormal labs and correlate with symptoms, medications, renal function, and ECG findings.");
  }
  if (/ejection fraction|\bef\b|valvular|hypokinesia/.test(text)) {
    findings.add("Echo/cardiac function findings were detected.");
    recommendations.add("Correlate with symptoms, ECG, prior echo, and cardiology plan.");
  }
  if (/x[\s-]?ray|ct|mri|radiograph|opacity|fracture|infiltrate/.test(text)) {
    findings.add("Radiology report language was detected.");
    recommendations.add("Review the original imaging report and urgent findings with the responsible clinician.");
  }
  if (/medication|dose|tablet|capsule|prescription/.test(text)) {
    findings.add("Medication-related content was detected.");
    warnings.add("Do not start, stop, or adjust medications from AI output alone.");
    recommendations.add("Verify drug name, dose, allergies, renal function, interactions, and prescribing indication.");
  }
  if (/skin|rash|lesion|wound|mole/.test(text)) {
    findings.add("Skin/dermatology image context was detected.");
    recommendations.add("Assess lesion evolution, infection signs, systemic symptoms, and need for in-person examination.");
  }
  if (!findings.size && input.mimeType.startsWith("image/")) {
    findings.add(`${input.documentType.replace(/_/g, " ")} uploaded for medical image review.`);
    recommendations.add("Use the image as context for a physician-led interpretation; verify quality, laterality, labels, and patient identity.");
  }
  if (!findings.size) {
    findings.add(`${input.documentType.replace(/_/g, " ")} uploaded and indexed for clinical chat context.`);
  }

  const hasReadableText = input.text.length > 40;
  const confidence = Math.min(0.92, Math.max(0.55, 0.58 + (hasReadableText ? 0.16 : 0) + (findings.size * 0.04)));
  return {
    analysisSummary: `${input.documentType.replace(/_/g, " ")} analyzed: ${Array.from(findings).join(" ")}`,
    confidence,
    medicalAnalysis: {
      documentType: input.documentType,
      findings: Array.from(findings),
      hasReadableText,
      mimeType: input.mimeType,
      originalName: input.originalName,
      sizeBytes: input.sizeBytes,
    } as Prisma.InputJsonObject,
    recommendations: Array.from(recommendations),
    warnings: Array.from(warnings),
  };
}

function analyzeUploadedAttachment(file: Express.Multer.File, kind: AttachmentKind) {
  const extractedText = readBestEffortOcrText(file.path);
  const documentType = detectAttachmentDocumentType({
    kind,
    mimeType: file.mimetype,
    originalName: file.originalname,
    text: extractedText,
  });
  const analysis = analyzeAttachment({
    documentType,
    kind,
    mimeType: file.mimetype,
    originalName: file.originalname,
    sizeBytes: file.size,
    text: extractedText,
  });
  return { documentType, extractedText, ...analysis };
}

const attachmentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, attachmentRoot),
  filename: (_req, file, cb) => {
    try {
      cb(null, safeAttachmentName(file.originalname));
    } catch (error) {
      cb(error as Error, "");
    }
  },
});

const uploadAttachment = multer({
  fileFilter: (req, file, cb) => {
    const kind = typeof req.body?.kind === "string" && attachmentKinds.includes(req.body.kind) ? req.body.kind as AttachmentKind : "file";
    const rules = attachmentRules[kind];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!rules.extensions.has(ext) || (!rules.mime.has(file.mimetype) && file.mimetype !== "application/octet-stream")) {
      cb(new AppError(400, "Unsupported format.", "UNSUPPORTED_FORMAT"));
      return;
    }
    cb(null, true);
  },
  limits: { fileSize: 25 * 1024 * 1024 },
  storage: attachmentStorage,
});

function ownerOnly(req: { auth?: { id: string } }) {
  return prisma.user.findUnique({ where: { id: req.auth!.id } }).then((user) => {
    if (user?.email.toLowerCase() !== OWNER_EMAIL || !user.protectedOwner) {
      throw new AppError(403, "Developer owner access required.", "OWNER_ONLY");
    }
    return user;
  });
}

async function settings() {
  return prisma.copilotSettings.upsert({
    create: { enabled: true, provider: "RuleBasedRAG" },
    update: {},
    where: { id: "global" },
  }).catch(() => prisma.copilotSettings.create({ data: { id: "global", enabled: true, provider: "RuleBasedRAG" } }));
}

function serializeConversation(conversation: {
  caseId: string | null;
  contextType: string | null;
  createdAt: Date;
  id: string;
  messages?: Array<{ content: string; createdAt: Date }>;
  patientId: string | null;
  tag: string;
  title: string;
  updatedAt: Date;
}) {
  const preview = conversation.messages?.[0]?.content;
  return {
    caseId: conversation.caseId ?? undefined,
    contextType: conversation.contextType ?? undefined,
    createdAt: conversation.createdAt.toISOString(),
    id: conversation.id,
    lastMessagePreview: preview ? preview.replace(/\s+/g, " ").slice(0, 96) : undefined,
    patientId: conversation.patientId ?? undefined,
    tag: conversation.tag,
    title: conversation.title,
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

function serializeAttachment(attachment: {
  analysisSummary?: string | null;
  caseId: string | null;
  confidence?: number | null;
  conversationId: string | null;
  createdAt: Date;
  documentType?: string | null;
  extractedText?: string | null;
  id: string;
  kind: string;
  medicalAnalysis?: Prisma.JsonValue | null;
  messageId: string | null;
  mimeType: string;
  originalName: string;
  patientId: string | null;
  recommendations?: string[];
  sizeBytes: number;
  storedName: string;
  warnings?: string[];
}) {
  return {
    analysisSummary: attachment.analysisSummary ?? undefined,
    caseId: attachment.caseId ?? undefined,
    confidence: attachment.confidence ?? undefined,
    conversationId: attachment.conversationId ?? undefined,
    createdAt: attachment.createdAt.toISOString(),
    documentType: attachment.documentType ?? undefined,
    downloadUrl: `/api/copilot/attachments/${attachment.id}/download`,
    extractedText: attachment.extractedText ?? undefined,
    id: attachment.id,
    kind: attachment.kind,
    medicalAnalysis: attachment.medicalAnalysis ?? undefined,
    messageId: attachment.messageId ?? undefined,
    mimeType: attachment.mimeType,
    originalName: attachment.originalName,
    patientId: attachment.patientId ?? undefined,
    recommendations: attachment.recommendations ?? [],
    sizeBytes: attachment.sizeBytes,
    storedName: attachment.storedName,
    warnings: attachment.warnings ?? [],
  };
}

function serializeMessage(message: {
  attachments?: Array<Parameters<typeof serializeAttachment>[0]>;
  citations: Prisma.JsonValue | null;
  confidence: number | null;
  content: string;
  createdAt: Date;
  id: string;
  responseTimeMs: number | null;
  role: string;
}) {
  return {
    attachments: message.attachments?.map(serializeAttachment) ?? [],
    citations: message.citations ?? [],
    confidence: message.confidence ?? undefined,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    id: message.id,
    responseTimeMs: message.responseTimeMs ?? undefined,
    role: message.role,
  };
}

async function retrieveClinicalContext(input: { caseId?: string; patientId?: string }) {
  const caseRecord = input.caseId
    ? await prisma.eCGCase.findFirst({
        include: {
          analyses: { orderBy: { createdAt: "desc" }, take: 2 },
          clinicalAlerts: { orderBy: { createdAt: "desc" }, take: 5 },
          documents: { include: { extraction: true, searchIndex: true }, orderBy: { createdAt: "desc" }, take: 8 },
          files: { orderBy: { createdAt: "desc" }, take: 3 },
          measurements: { orderBy: { createdAt: "desc" }, take: 2 },
          reports: { orderBy: { createdAt: "desc" }, take: 3 },
        },
        where: { OR: [{ id: input.caseId }, { caseId: input.caseId }, { caseNumber: input.caseId }] },
      })
    : null;
  const patientId = input.patientId ?? caseRecord?.patientId;
  const patient = patientId
    ? await prisma.patient.findUnique({
        include: {
          cases: {
            include: {
              analyses: { orderBy: { createdAt: "desc" }, take: 1 },
              measurements: { orderBy: { createdAt: "desc" }, take: 1 },
            },
            orderBy: { uploadDate: "desc" },
            take: 8,
          },
          clinicalAlerts: { orderBy: { createdAt: "desc" }, take: 8 },
          documents: { include: { extraction: true, searchIndex: true }, orderBy: { createdAt: "desc" }, take: 12 },
          reports: { orderBy: { createdAt: "desc" }, take: 8 },
        },
        where: { id: patientId },
      })
    : null;

  const sources: Citation[] = [];
  const context: ClinicalContext = {
    criticalAlerts: [],
    documents: [],
    previousEcgs: [],
    reports: [],
    sources,
  };

  if (patient) {
    const fullName = patient.fullName ?? `${patient.firstName} ${patient.lastName}`.trim();
    const riskFactors = [
      patient.hypertension ? "hypertension" : undefined,
      patient.diabetes ? "diabetes" : undefined,
      patient.dyslipidemia ? "dyslipidemia" : undefined,
      patient.obesity ? "obesity" : undefined,
      patient.previousMI ? "previous MI" : undefined,
      patient.previousCABG ? "previous CABG" : undefined,
      patient.previousPCI ? "previous PCI" : undefined,
      patient.smokingStatus === "CURRENT" ? "current smoker" : patient.smokingStatus === "FORMER" ? "former smoker" : undefined,
      patient.familyHistory ? `family history: ${patient.familyHistory}` : undefined,
    ].filter(Boolean) as string[];
    context.patient = {
      age: ageFromDob(patient.dateOfBirth),
      allergies: patient.knownAllergies ?? patient.allergies ?? "not documented",
      company: patient.company,
      department: patient.departmentName,
      employeeId: patient.employeeId,
      fullName,
      gender: patient.gender,
      history: patient.medicalHistory ?? patient.notes ?? "not documented",
      medications: patient.medications ?? "not documented",
      occupation: patient.occupation ?? patient.jobTitle,
      riskFactors,
    };
    sources.push({ id: patient.id, label: "Patient Profile", source: fullName, tags: ["demographics", "history", "risk"], type: "patient" });
    for (const report of patient.reports) {
      context.reports.push(`${report.reportNumber}: ${report.finalPhysicianImpression ?? report.aiFindings ?? report.rhythmInterpretation ?? "draft report without final impression"}`);
      sources.push({ id: report.id, label: report.reportNumber, source: "Previous Report", tags: ["report"], type: "report" });
    }
    for (const ecgCase of patient.cases) {
      if (caseRecord && ecgCase.id === caseRecord.id) continue;
      const measurement = ecgCase.measurements[0];
      context.previousEcgs.push(`${ecgCase.caseNumber ?? ecgCase.caseId}: ${ecgCase.aiDiagnosis ?? ecgCase.analyses[0]?.diagnosis ?? "diagnosis pending"}, rhythm ${ecgCase.rhythm ?? ecgCase.analyses[0]?.rhythm ?? "pending"}, HR ${ecgCase.heartRate ?? measurement?.heartRate ?? "n/a"}, QTc ${ecgCase.qtcInterval ?? measurement?.qtcInterval ?? "n/a"}, severity ${ecgCase.severity}.`);
      sources.push({ id: ecgCase.id, label: ecgCase.caseNumber ?? ecgCase.caseId, source: "Previous ECG", tags: ["ecg-history"], type: "case" });
    }
    for (const alert of patient.clinicalAlerts) {
      context.criticalAlerts.push(`${alert.alertType}: ${alert.message} (${alert.severity}, confidence ${Math.round(alert.confidenceScore * 100)}%)`);
      sources.push({ id: alert.id, label: String(alert.alertType), source: "Clinical Alert", tags: ["critical-alert"], type: "alert" });
    }
    for (const document of patient.documents) {
      context.documents.push(`${document.category}: ${document.title} - ${document.extraction?.aiSummary ?? document.searchIndex?.searchText?.slice(0, 180) ?? document.originalName}`);
      sources.push({ id: document.id, label: document.title, source: "Cardiovascular Document", tags: [String(document.category).toLowerCase()], type: "document" });
    }
  }

  if (caseRecord) {
    const measurement = caseRecord.measurements[0];
    const analysis = caseRecord.analyses[0];
    context.currentCase = {
      axis: measurement?.electricalAxis,
      diagnosis: caseRecord.aiDiagnosis ?? analysis?.diagnosis,
      doctorDiagnosis: caseRecord.doctorDiagnosis ?? caseRecord.finalDiagnosis,
      heartRate: caseRecord.heartRate ?? measurement?.heartRate ?? analysis?.heartRate,
      intervals: `PR ${caseRecord.prInterval ?? measurement?.prInterval ?? "n/a"} ms, QRS ${caseRecord.qrsDuration ?? measurement?.qrsDuration ?? "n/a"} ms, QT ${caseRecord.qtInterval ?? measurement?.qtInterval ?? "n/a"} ms, QTc ${caseRecord.qtcInterval ?? measurement?.qtcInterval ?? "n/a"} ms`,
      rhythm: caseRecord.rhythm ?? analysis?.rhythm,
      severity: caseRecord.severity,
      status: caseRecord.status,
    };
    sources.push({ id: caseRecord.id, label: caseRecord.caseNumber ?? caseRecord.caseId, source: "Current ECG Case", tags: ["current-ecg", "measurements"], type: "case" });
    for (const alert of caseRecord.clinicalAlerts) {
      context.criticalAlerts.push(`${alert.alertType}: ${alert.message} (${alert.severity}, confidence ${Math.round(alert.confidenceScore * 100)}%)`);
      sources.push({ id: alert.id, label: String(alert.alertType), source: "Current Case Alert", tags: ["critical-alert"], type: "alert" });
    }
    for (const report of caseRecord.reports) {
      context.reports.push(`${report.reportNumber}: ${report.finalPhysicianImpression ?? report.aiFindings ?? report.rhythmInterpretation ?? "draft report without final impression"}`);
      sources.push({ id: report.id, label: report.reportNumber, source: "Current Case Report", tags: ["report"], type: "report" });
    }
    for (const document of caseRecord.documents) {
      context.documents.push(`${document.category}: ${document.title} - ${document.extraction?.aiSummary ?? document.searchIndex?.searchText?.slice(0, 180) ?? document.originalName}`);
      sources.push({ id: document.id, label: document.title, source: "Case Document", tags: [String(document.category).toLowerCase()], type: "document" });
    }
  }

  context.sources = dedupeCitations(sources);
  return context;
}

async function retrieveKnowledge(question: string, context: ClinicalContext): Promise<{ hits: KnowledgeHit[]; sources: Citation[]; tags: string[] }> {
  const haystack = [
    question,
    context.currentCase?.diagnosis,
    context.currentCase?.doctorDiagnosis,
    context.currentCase?.rhythm,
    context.currentCase?.severity,
    ...context.previousEcgs,
    ...context.reports,
    ...context.criticalAlerts,
  ].filter(Boolean).join(" ").toLowerCase();
  const terms = clinicalTerms(haystack);
  const enterpriseHits = await semanticSearchKnowledge(question, { contextTerms: terms, take: 8 });
  const hits = await prisma.eCGKnowledgeEntry.findMany({
    orderBy: { updatedAt: "desc" },
    take: 8,
    where: {
      OR: [
        { tags: { hasSome: terms } },
        ...terms.slice(0, 8).flatMap((term) => [
          { topic: { contains: term, mode: "insensitive" as const } },
          { content: { contains: term, mode: "insensitive" as const } },
        ]),
      ],
    },
  });
  const legacySelected: KnowledgeHit[] = hits.map((entry) => ({
    category: entry.category,
    content: entry.content,
    id: entry.id,
    references: entry.references,
    relevanceScore: 0.45,
    sourceName: "ECG Knowledge Base",
    sourceUrl: undefined,
    tags: entry.tags,
    topic: entry.topic,
  }));
  const enterpriseSelected: KnowledgeHit[] = enterpriseHits.map((entry) => ({
    category: String(entry.domain),
    content: entry.content,
    id: entry.id,
    references: entry.references,
    relevanceScore: entry.relevanceScore,
    sourceName: entry.sourceName,
    sourceUrl: entry.sourceUrl,
    tags: entry.tags,
    topic: entry.title,
  }));
  const selected = enterpriseSelected.concat(legacySelected).sort((left, right) => right.relevanceScore - left.relevanceScore).slice(0, 10);
  const sources = selected.map((entry) => ({ id: entry.id, label: entry.topic, source: entry.sourceName, tags: entry.tags, type: "knowledge" }));
  return { hits: selected, sources, tags: Array.from(new Set(selected.flatMap((entry) => entry.tags))).slice(0, 16) };
}

function buildPrompt(question: string, context: ClinicalContext, knowledge: KnowledgeHit[]) {
  return [
    `Question: ${question}`,
    `Patient: ${context.patient ? `${context.patient.age}-year-old ${context.patient.gender.toLowerCase()} ${context.patient.fullName}; employee ${context.patient.employeeId ?? "n/a"}; ${context.patient.company ?? "company n/a"} / ${context.patient.department ?? "department n/a"}; occupation ${context.patient.occupation ?? "n/a"}.` : "No active patient context."}`,
    `History: ${context.patient ? `${context.patient.history}; medications ${context.patient.medications}; allergies ${context.patient.allergies}; risk factors ${context.patient.riskFactors.join(", ") || "none documented"}.` : "General ECG knowledge only."}`,
    `Current ECG: ${context.currentCase ? `${context.currentCase.rhythm ?? "rhythm pending"}, HR ${context.currentCase.heartRate ?? "n/a"}, ${context.currentCase.intervals}, axis ${context.currentCase.axis ?? "n/a"}, diagnosis ${context.currentCase.diagnosis ?? "pending"}, doctor ${context.currentCase.doctorDiagnosis ?? "pending"}, severity ${context.currentCase.severity}.` : "No current ECG case open."}`,
    `Previous ECGs: ${context.previousEcgs.slice(0, 5).join(" | ") || "none retrieved"}.`,
    `Documents: ${context.documents.slice(0, 5).join(" | ") || "none retrieved"}.`,
    `Retrieved Medical Knowledge: ${knowledge.map((entry) => `${entry.topic} [${entry.sourceName}, relevance ${Math.round(entry.relevanceScore * 100)}%]: ${entry.content} References: ${entry.references.join("; ")}`).join(" | ") || "general safety knowledge"}.`,
  ].join("\n");
}

function classifyMedicalIntent(question: string, attachments: AttachmentForAnalysis[]): MedicalIntent {
  const text = question.toLowerCase().trim();
  if (attachments.length || /upload|uploaded|attachment|file|document|image|pdf|report|scan|photo|lab result/.test(text)) return "uploaded_document_review";
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|salam|السلام)\b[!.?\s]*$/i.test(text)) return "greeting";
  if (/thanks|thank you|ok thanks|appreciate|who are you|what can you do|help me\b/.test(text) && !/(pain|ecg|medicine|drug|blood|pressure|symptom)/.test(text)) return "casual_conversation";
  if (/chest pain|severe pain|shortness of breath|dyspnea|faint|syncope|stroke|weakness|facial droop|crushing|sweating|hemoptysis|suicidal|shock/.test(text)) return "emergency_symptom_triage";
  if (/medication|medicine|drug|dose|dosage|tablet|capsule|prescription|side effect|interaction|contraindication|start|stop|increase|decrease|beta blocker|statin|anticoag/.test(text)) return "medication_question";
  if (/occupational|fitness|fit for work|work restriction|return to work|offshore|driver|safety-sensitive|duty/.test(text)) return "occupational_fitness";
  if (/follow.?up|next step|monitor|repeat|when should|refer|appointment|plan/.test(text)) return "follow_up_advice";
  if (/\becg\b|\bekg\b|qrs|qtc|st elevation|st depression|rhythm|atrial fibrillation|brady|tachy|interval|axis/.test(text)) return "ecg_interpretation";
  return "general_medical_question";
}

function normalizeFindings(value: Prisma.JsonValue | null): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const findings = (value as { findings?: unknown }).findings;
  return Array.isArray(findings) ? findings.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function attachmentInsights(attachments: AttachmentForAnalysis[]): AttachmentInsight[] {
  return attachments.map((attachment) => {
    const documentType = attachment.documentType ?? attachment.kind.toUpperCase();
    const findings = normalizeFindings(attachment.medicalAnalysis);
    if (attachment.analysisSummary) findings.unshift(attachment.analysisSummary);
    const readableText = attachment.extractedText?.trim();
    const ocrStatus = readableText
      ? `Readable text extracted (${Math.min(readableText.length, 12000)} characters).`
      : "No reliable embedded/OCR text was extracted; interpretation is limited to file metadata and detected clinical cues.";
    return {
      confidence: attachment.confidence ?? (readableText ? 0.72 : 0.55),
      documentType,
      findings: Array.from(new Set(findings)).slice(0, 8),
      interpretation: readableText
        ? readableText.slice(0, 700)
        : "No pixel-level diagnosis is generated without readable text. Review the original image/report before clinical decisions.",
      name: attachment.originalName,
      ocrStatus,
      recommendations: attachment.recommendations.slice(0, 6),
      warnings: attachment.warnings.slice(0, 6),
    };
  });
}

function clinicianFirstName(name?: string | null) {
  const normalized = name?.replace(/^dr\.?\s+/i, "").trim();
  return normalized?.split(/\s+/)[0] || "Doctor";
}

function referencesFromKnowledge(knowledge: KnowledgeHit[], max = 4) {
  const references = knowledge.flatMap((entry) => entry.references.map((reference) => `${entry.sourceName}: ${reference}`));
  return Array.from(new Set(references)).slice(0, max);
}

function citationObjects(context: ClinicalContext, knowledge: KnowledgeHit[]) {
  return context.sources.concat(knowledge.map((entry) => ({ id: entry.id, label: entry.topic, source: entry.sourceName, tags: entry.tags, type: "knowledge" }))).slice(0, 12);
}

function generateClinicalResponse(input: { attachments: AttachmentForAnalysis[]; clinicianName?: string | null; context: ClinicalContext; intent: MedicalIntent; knowledge: KnowledgeHit[]; prompt: string; question: string }) {
  const risk = riskStratification(input.context, input.question);
  const confidence = confidenceScore(input.context, input.knowledge);
  const references = referencesFromKnowledge(input.knowledge);
  const citations = citationObjects(input.context, input.knowledge);
  const warnings = medicalGuardrails(input.question, risk, input.knowledge);
  const clinician = clinicianFirstName(input.clinicianName);
  const insights = attachmentInsights(input.attachments);
  const firstKnowledge = input.knowledge[0];
  let content: string;

  if (input.intent === "greeting") {
    content = `Hello Dr ${clinician}. How may I assist you today?\n\n${DISCLAIMER}`;
  } else if (input.intent === "casual_conversation") {
    content = `I can help with concise medical Q&A, ECG interpretation, uploaded document review, medication safety checks, occupational fitness, and follow-up planning. What would you like to review?\n\n${DISCLAIMER}`;
  } else if (input.intent === "emergency_symptom_triage") {
    content = [
      "## Urgent Triage",
      "Chest pain, severe shortness of breath, syncope, neurologic deficit, shock, or severe sweating can indicate an emergency. If symptoms are active or severe, arrange immediate clinician/emergency assessment now.",
      "",
      "To triage safely, please clarify:",
      "- Age and relevant cardiac risk factors?",
      "- Pain location, onset, duration, severity, radiation, and triggers?",
      "- Associated dyspnea, sweating, nausea, syncope, neurologic symptoms, or low blood pressure?",
      "- Current ECG, vitals, troponin, and medications?",
      "",
      `Risk tier: ${risk.level}.`,
      `Warnings: ${warnings.join(" ")}`,
      "",
      DISCLAIMER,
    ].join("\n");
  } else if (input.intent === "uploaded_document_review") {
    content = [
      "## Uploaded Document Review",
      insights.length
        ? insights.map((item, index) => [
            `### ${index + 1}. ${item.name}`,
            `Document Type: ${item.documentType}`,
            `OCR Confidence: ${Math.round(item.confidence * 100)}%`,
            `OCR Status: ${item.ocrStatus}`,
            `Extracted Findings: ${item.findings.length ? item.findings.join("; ") : "No high-confidence structured findings extracted."}`,
            `Clinical Interpretation: ${item.interpretation}`,
            `Warnings: ${item.warnings.length ? item.warnings.join("; ") : DISCLAIMER}`,
            `Recommendations: ${item.recommendations.length ? item.recommendations.join("; ") : "Correlate with the full clinical record and physician review."}`,
          ].join("\n")).join("\n\n")
        : "No attachment was available for review. Upload an ECG image/PDF, lab, echo, radiology report, prescription, or clinical PDF and ask again.",
      "",
      "## Answer",
      insights.some((item) => item.interpretation.length > 0)
        ? "I used the extracted attachment content above as the primary context. I will not infer visual diagnoses that were not extracted from the document or metadata."
        : "No readable medical content was extracted, so I cannot provide a document-specific diagnosis.",
      "",
      `References: ${references.join(" | ") || "ECG Insight trusted medical knowledge base"}`,
      DISCLAIMER,
    ].join("\n");
  } else if (input.intent === "medication_question") {
    content = [
      "## Medication Safety",
      "Medication decisions depend on indication, dose, renal/hepatic function, allergies, interactions, pregnancy status, vitals, ECG intervals, and local formulary guidance.",
      firstKnowledge ? `Relevant knowledge: ${firstKnowledge.content}` : "No specific medication knowledge source was retrieved for this question.",
      "",
      "Before changing therapy, confirm:",
      "- Exact drug, dose, route, and timing.",
      "- Current diagnoses and contraindications.",
      "- Renal function, electrolytes, QT/QTc if relevant, and interacting drugs.",
      "",
      `Warnings: ${warnings.join(" ")}`,
      `References: ${references.join(" | ") || "Internal medication safety knowledge"}`,
      DISCLAIMER,
    ].join("\n");
  } else if (input.intent === "occupational_fitness") {
    content = [
      "## Occupational Fitness",
      occupationalOpinion(risk, input.context, input.question),
      "",
      `Risk tier: ${risk.level}: ${risk.reason}`,
      "Key determinants: symptoms, ECG abnormality severity, safety-sensitive role, access to emergency care, treatment stability, and physician clearance.",
      "",
      `Next steps: ${recommendationsFor(risk, input.context, input.knowledge).slice(0, 4).join(" ")}`,
      DISCLAIMER,
    ].join("\n");
  } else if (input.intent === "follow_up_advice") {
    content = [
      "## Follow-up Advice",
      ...followUpFor(risk, input.context).map((item) => `- ${item}`),
      "",
      `Risk tier: ${risk.level}: ${risk.reason}`,
      references.length ? `References: ${references.join(" | ")}` : "References: ECG Insight trusted medical knowledge base",
      DISCLAIMER,
    ].join("\n");
  } else if (input.intent === "ecg_interpretation") {
    const ecgInterpretation = input.context.currentCase
      ? `${input.context.currentCase.rhythm ?? "Rhythm not documented"}; HR ${input.context.currentCase.heartRate ?? "n/a"} bpm; ${input.context.currentCase.intervals}; axis ${input.context.currentCase.axis ?? "n/a"}; retrieved diagnosis ${input.context.currentCase.diagnosis ?? "pending"}.`
      : "No active ECG case is open. Upload or select an ECG for case-specific interpretation.";
    content = [
      "## ECG Review",
      ecgInterpretation,
      "",
      `Differential: ${differentialDiagnosis(input.question, input.context, input.knowledge).join("; ")}.`,
      `Risk tier: ${risk.level}: ${risk.reason}`,
      `Next steps: ${recommendationsFor(risk, input.context, input.knowledge).slice(0, 4).join(" ")}`,
      `References: ${references.join(" | ") || "ECG Insight ECG knowledge base"}`,
      DISCLAIMER,
    ].join("\n");
  } else {
    const explanation = firstKnowledge
      ? `${firstKnowledge.topic}: ${firstKnowledge.content}`
      : "This is a general medical question. Please provide patient age, symptoms, relevant history, medications, and any test results for a more specific answer.";
    content = [
      "## Short Answer",
      explanation,
      "",
      "I can go deeper if you want mechanisms, diagnosis, treatment options, or red flags.",
      references.length ? `References: ${references.join(" | ")}` : "References: ECG Insight trusted medical knowledge base",
      DISCLAIMER,
    ].join("\n");
  }

  return {
    confidence,
    content: `${content}\n\nConfidence Score: ${Math.round(confidence * 100)}%\nCitations: ${citations.map((source) => `[${source.type}:${source.id}] ${source.source}: ${source.label}`).join(" | ") || "ECG Insight Knowledge Engine"}`,
    prompt: input.prompt,
  };
}

function medicalGuardrails(question: string, risk: { level: string }, knowledge: KnowledgeHit[]) {
  const text = `${question} ${knowledge.flatMap((entry) => entry.tags).join(" ")}`.toLowerCase();
  const warnings = new Set<string>([DISCLAIMER]);
  if (risk.level === "HIGH") warnings.add("High-risk features require urgent clinician review or emergency escalation according to local protocol.");
  if (/dose|dosage|start|stop|increase|decrease|prescribe|medication|drug|anticoagulation|beta blocker|digoxin|statin/.test(text)) {
    warnings.add("Do not start, stop, or change medications based only on AI output; confirm indications, contraindications, renal function, interactions, allergies, and local formulary guidance.");
  }
  if (/chest pain|stemi|syncope|stroke|sepsis|shock|dyspnea|pulmonary embolism|wide-complex|ventricular/.test(text)) {
    warnings.add("Potential emergency symptoms or ECG patterns should be assessed immediately by a qualified clinician.");
  }
  return Array.from(warnings);
}

function dedupeCitations(citations: Citation[]) {
  const seen = new Set<string>();
  return citations.filter((citation) => {
    const key = `${citation.type}:${citation.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}

function ageFromDob(dateOfBirth: Date) {
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = now.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dateOfBirth.getDate())) age -= 1;
  return Math.max(age, 0);
}

function clinicalTerms(text: string) {
  const aliases: Record<string, string[]> = {
    af: ["af", "atrial", "fibrillation"],
    flutter: ["flutter"],
    hyperkalemia: ["hyperkalemia", "potassium"],
    hypokalemia: ["hypokalemia", "potassium"],
    ischemia: ["ischemia", "st", "depression", "elevation"],
    lbbb: ["lbbb", "bundle", "branch"],
    lvh: ["lvh", "hypertrophy"],
    nstemi: ["nstemi", "troponin", "ischemia"],
    pac: ["pac", "premature", "atrial"],
    pericarditis: ["pericarditis"],
    pvc: ["pvc", "premature", "ventricular"],
    qt: ["qt", "qtc", "torsades"],
    rbbb: ["rbbb", "bundle", "branch"],
    rvh: ["rvh", "hypertrophy"],
    stemi: ["stemi", "st", "elevation"],
  };
  const raw = text.split(/\W+/).filter((word) => word.length > 1);
  const expanded = raw.flatMap((word) => aliases[word] ?? [word]);
  return Array.from(new Set(expanded)).slice(0, 24);
}

function riskStratification(context: ClinicalContext, question: string) {
  const text = `${question} ${context.currentCase?.diagnosis ?? ""} ${context.currentCase?.doctorDiagnosis ?? ""} ${context.currentCase?.rhythm ?? ""} ${context.criticalAlerts.join(" ")}`.toLowerCase();
  if (context.criticalAlerts.length || /stemi|ventricular tachycardia|vf|complete heart block|high-grade|extreme bradycardia/.test(text)) {
    return { level: "HIGH", reason: "Critical alert or potentially life-threatening ECG pattern is present or suspected." };
  }
  if (/nstemi|ischemia|atrial fibrillation|af|long qt|qtc|bundle branch|av block/.test(text)) {
    return { level: "MODERATE", reason: "Clinically significant abnormality requires physician review and correlation." };
  }
  if (context.currentCase?.severity === "CRITICAL" || context.currentCase?.severity === "ABNORMAL") {
    return { level: context.currentCase.severity === "CRITICAL" ? "HIGH" : "MODERATE", reason: `Case severity is classified as ${context.currentCase.severity}.` };
  }
  return { level: "LOW", reason: "No high-risk feature was retrieved from the current context." };
}

function confidenceScore(context: ClinicalContext, knowledge: KnowledgeHit[]) {
  let score = 0.52;
  if (context.patient) score += 0.12;
  if (context.currentCase) score += 0.14;
  if (context.previousEcgs.length) score += 0.06;
  if (context.reports.length) score += 0.05;
  if (context.documents.length) score += 0.04;
  if (knowledge.length >= 3) score += 0.07;
  if (knowledge[0]?.relevanceScore && knowledge[0].relevanceScore > 0.35) score += 0.05;
  return Math.min(score, 0.94);
}

function differentialDiagnosis(question: string, context: ClinicalContext, knowledge: KnowledgeHit[]) {
  const text = `${question} ${context.currentCase?.diagnosis ?? ""} ${context.currentCase?.rhythm ?? ""} ${knowledge.map((entry) => entry.topic).join(" ")}`.toLowerCase();
  if (/stemi|st elevation|inferior|anterior|lateral/.test(text)) return ["Acute STEMI", "Early repolarization", "Pericarditis", "LVH or bundle branch repolarization change"];
  if (/af|atrial fibrillation|irregular/.test(text)) return ["Atrial fibrillation", "Atrial flutter with variable block", "Frequent PACs", "Artifact mimicking irregular rhythm"];
  if (/qt|qtc|torsades/.test(text)) return ["Acquired long QT", "Congenital long QT", "Electrolyte disturbance", "Medication-related QT prolongation"];
  if (/brady|block|av/.test(text)) return ["Sinus bradycardia", "AV block", "Medication effect", "Ischemia or electrolyte disturbance"];
  if (/tachy|pvc|ventricular/.test(text)) return ["Sinus tachycardia", "PVCs", "Supraventricular tachycardia", "Ventricular tachycardia if wide-complex and sustained"];
  return knowledge.slice(0, 4).map((entry) => entry.topic).concat(["Clinical correlation required"]).slice(0, 4);
}

function occupationalOpinion(risk: { level: string; reason: string }, context: ClinicalContext, question: string) {
  const safetySensitive = /offshore|driver|height|confined|safety|fitness|occupational/.test(`${question} ${context.patient?.occupation ?? ""}`.toLowerCase());
  if (risk.level === "HIGH") return safetySensitive ? "Temporarily unfit for safety-sensitive work until urgent physician/cardiology assessment clears the worker." : "Avoid safety-sensitive duties until physician assessment is completed.";
  if (risk.level === "MODERATE") return safetySensitive ? "Fit status should be restricted or deferred pending physician review, symptom assessment, and relevant investigations." : "Clinical review is recommended before unrestricted duties.";
  return "No retrieved ECG context mandates restriction; final fitness decision remains with the occupational physician.";
}

function recommendationsFor(risk: { level: string }, context: ClinicalContext, knowledge: KnowledgeHit[]) {
  const recommendations = new Set<string>();
  if (risk.level === "HIGH") {
    recommendations.add("Urgent cardiology or emergency evaluation according to local protocol.");
    recommendations.add("Repeat ECG and compare with prior tracings immediately.");
  }
  if (risk.level === "MODERATE") recommendations.add("Physician review with clinical correlation, vitals, symptoms, and medication/electrolyte assessment.");
  if (context.currentCase) recommendations.add("Verify automated measurements manually: rhythm, rate, PR, QRS, QT/QTc, axis, and ST-T changes.");
  if (context.previousEcgs.length) recommendations.add("Document interval changes compared with previous ECGs and reports.");
  if (knowledge.some((entry) => entry.tags.includes("qt"))) recommendations.add("Check potassium, magnesium, calcium, renal function, and QT-prolonging medications.");
  recommendations.add("Record final physician impression in the ECG report workflow.");
  return Array.from(recommendations);
}

function followUpFor(risk: { level: string }, context: ClinicalContext) {
  if (risk.level === "HIGH") return ["Immediate escalation and same-day physician/cardiology review.", "Finalize duty restriction after acute risk is excluded or treated."];
  if (risk.level === "MODERATE") return ["Schedule cardiology or occupational medicine follow-up.", "Repeat ECG or order additional testing based on symptoms and physician assessment."];
  return context.currentCase ? ["Routine follow-up if symptomatic or if occupational policy requires periodic surveillance."] : ["Open a patient profile or ECG case for patient-specific follow-up planning."];
}

function classifyQuestion(question: string) {
  const lower = question.toLowerCase();
  if (lower.includes("occupational") || lower.includes("fitness")) return "Occupational Fitness";
  if (lower.includes("differential")) return "Differential Diagnosis";
  if (lower.includes("follow")) return "Follow-up";
  if (lower.includes("summar")) return "Clinical Summary";
  return "ECG Interpretation";
}

function tagForIntent(intent: MedicalIntent, fallback: ChatInput["tag"]) {
  if (intent === "occupational_fitness") return "Occupational Fitness";
  if (intent === "follow_up_advice" || intent === "emergency_symptom_triage") return "Follow-up";
  if (intent === "ecg_interpretation") return "ECG Interpretation";
  if (intent === "uploaded_document_review" || intent === "general_medical_question" || intent === "medication_question") return "Clinical Summary";
  return fallback ?? "Clinical Summary";
}

function automaticConversationTitle(question: string) {
  const normalized = question
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "New Clinical Conversation";
  return normalized.split(" ").slice(0, 6).join(" ").slice(0, 60);
}

async function conversationForUser(conversationId: string, userId: string) {
  const conversation = await prisma.copilotConversation.findFirst({ where: { id: conversationId, userId } });
  if (!conversation) throw new AppError(404, "Copilot conversation not found.", "COPILOT_CONVERSATION_NOT_FOUND");
  return conversation;
}

async function executeCopilotChat(input: ChatInput, userId: string, started = Date.now()) {
  const currentSettings = await settings();
  if (!currentSettings.enabled) throw new AppError(503, "Medical AI Copilot is disabled by the developer owner.", "COPILOT_DISABLED");
  const requestingUser = await prisma.user.findUnique({ select: { name: true }, where: { id: userId } });
  const generatedTitle = automaticConversationTitle(input.question);
  const conversation = input.conversationId
    ? await conversationForUser(input.conversationId, userId)
    : await prisma.copilotConversation.create({
        data: {
          caseId: input.caseId,
          contextType: input.contextType,
          patientId: input.patientId,
          tag: input.tag ?? classifyQuestion(input.question),
          title: generatedTitle,
          userId,
        },
      });
  const existingUserMessages = input.conversationId
    ? await prisma.copilotMessage.count({ where: { conversationId: conversation.id, role: "user" } })
    : 0;
  const userMessage = await prisma.copilotMessage.create({
    data: { content: input.question, conversationId: conversation.id, role: "user" },
    include: { attachments: true },
  });
  if (input.attachmentIds.length) {
    const ownedAttachments = await prisma.copilotAttachment.findMany({
      where: { id: { in: input.attachmentIds }, userId },
    });
    if (ownedAttachments.length !== input.attachmentIds.length) {
      throw new AppError(404, "One or more Copilot attachments were not found.", "COPILOT_ATTACHMENT_NOT_FOUND");
    }
    await prisma.copilotAttachment.updateMany({
      data: { conversationId: conversation.id, messageId: userMessage.id },
      where: { id: { in: input.attachmentIds }, userId },
    });
    userMessage.attachments = await prisma.copilotAttachment.findMany({
      orderBy: { createdAt: "asc" },
      where: { messageId: userMessage.id },
    });
  }
  const clinicalContext = await retrieveClinicalContext({ caseId: input.caseId ?? conversation.caseId ?? undefined, patientId: input.patientId ?? conversation.patientId ?? undefined });
  const attachmentContext = userMessage.attachments.length
    ? `\nAttachments:\n${userMessage.attachments.map((attachment) => [
        `${attachment.kind.toUpperCase()} ${attachment.originalName}`,
        `Type: ${attachment.documentType ?? "CLINICAL_DOCUMENT"}`,
        `MIME: ${attachment.mimeType}; size ${attachment.sizeBytes} bytes`,
        attachment.analysisSummary ? `Analysis: ${attachment.analysisSummary}` : undefined,
        attachment.extractedText ? `OCR text: ${attachment.extractedText.slice(0, 1200)}` : "OCR text: no embedded text extracted; use image/document metadata and clinician review.",
        attachment.recommendations.length ? `Suggested next steps: ${attachment.recommendations.join("; ")}` : undefined,
        attachment.warnings.length ? `Warnings: ${attachment.warnings.join("; ")}` : undefined,
        attachment.confidence ? `Attachment analysis confidence: ${Math.round(attachment.confidence * 100)}%` : undefined,
      ].filter(Boolean).join(" | ")).join("\n")}`
    : "";
  const enrichedQuestion = `${input.question}${attachmentContext}`;
  const intent = classifyMedicalIntent(input.question, userMessage.attachments);
  const tag = tagForIntent(intent, input.tag);
  const knowledge = await retrieveKnowledge(enrichedQuestion, clinicalContext);
  const prompt = buildPrompt(enrichedQuestion, clinicalContext, knowledge.hits);
  const result = generateClinicalResponse({ attachments: userMessage.attachments, clinicianName: requestingUser?.name, context: clinicalContext, intent, knowledge: knowledge.hits, prompt, question: enrichedQuestion });
  const responseTimeMs = Date.now() - started;
  const assistant = await prisma.copilotMessage.create({
    data: {
      citations: clinicalContext.sources.concat(knowledge.sources) as unknown as Prisma.InputJsonValue,
      confidence: result.confidence,
      content: result.content,
      conversationId: conversation.id,
      responseTimeMs,
      role: "assistant",
    },
  });
  await prisma.copilotUsageEvent.create({
    data: { conversationId: conversation.id, question: `${input.question} | diagnoses:${knowledge.hits.map((hit) => hit.topic).slice(0, 4).join(",")}`, responseTimeMs, tag, userId },
  });
  const updatedConversation = await prisma.copilotConversation.update({
    data: {
      tag,
      title: existingUserMessages === 0 && conversation.title === "New Clinical Conversation" ? generatedTitle : conversation.title,
      updatedAt: new Date(),
    },
    where: { id: conversation.id },
  });
  return { assistant, conversation: updatedConversation, result, responseTimeMs, userMessage };
}

async function auditCopilotError(userId: string, error: unknown, question?: string) {
  await prisma.auditLog.create({
    data: {
      action: "AI_ANALYSIS_FAILED",
      actorId: userId,
      entityType: "Copilot",
      message: error instanceof Error ? error.message : "Copilot request failed.",
      metadata: { question: question?.slice(0, 500) } as Prisma.InputJsonObject,
    },
  }).catch(() => undefined);
}

function writeSse(res: { write: (chunk: string) => void }, event: string, data: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function streamAssistantContent(content: string, res: { write: (chunk: string) => void }, cancelled: () => boolean) {
  const chunks = content.match(/.{1,18}(\s|$)/g) ?? [content];
  for (const chunk of chunks) {
    if (cancelled()) return;
    writeSse(res, "token", { token: chunk });
  }
}

copilotRouter.get("/settings", async (_req, res, next) => {
  try {
    const current = await settings();
    res.json({ settings: current });
  } catch (error) {
    next(error);
  }
});

copilotRouter.put("/settings", requireRole("SUPER_ADMIN"), async (req, res, next) => {
  try {
    await ownerOnly(req);
    const body = settingsSchema.parse(req.body);
    const current = await settings();
    const updated = await prisma.copilotSettings.update({
      data: { enabled: body.enabled, provider: body.provider, updatedBy: req.auth!.id },
      where: { id: current.id },
    });
    res.json({ settings: updated });
  } catch (error) {
    next(error);
  }
});

copilotRouter.post("/attachments", requireRole("DOCTOR"), uploadAttachment.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, "Upload failed.", "FILE_REQUIRED");
    const body = uploadAttachmentSchema.parse(req.body);
    const rules = attachmentRules[body.kind];
    if (req.file.size > rules.maxBytes) {
      fs.rmSync(req.file.path, { force: true });
      throw new AppError(400, "File too large.", "FILE_TOO_LARGE");
    }
    if (body.patientId) assertResourceAccess(await canAccessPatient(body.patientId, req.auth!));
    if (body.caseId) assertResourceAccess(await canAccessCase(body.caseId, req.auth!));
    if (body.conversationId) await conversationForUser(body.conversationId, req.auth!.id);
    const analysis = analyzeUploadedAttachment(req.file, body.kind);
    const attachment = await prisma.copilotAttachment.create({
      data: {
        analysisSummary: analysis.analysisSummary,
        caseId: body.caseId,
        confidence: analysis.confidence,
        conversationId: body.conversationId,
        documentType: analysis.documentType,
        extractedText: analysis.extractedText,
        kind: body.kind,
        medicalAnalysis: analysis.medicalAnalysis,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
        patientId: body.patientId,
        recommendations: analysis.recommendations,
        sizeBytes: req.file.size,
        storagePath: req.file.path,
        storedName: req.file.filename,
        userId: req.auth!.id,
        warnings: analysis.warnings,
      },
    });
    await prisma.auditLog.create({
      data: {
        action: "CASE_UPDATED",
        actorId: req.auth!.id,
        caseId: body.caseId,
        entityId: attachment.id,
        entityType: "CopilotAttachment",
        message: `Copilot ${body.kind} attachment uploaded and analyzed: ${attachment.originalName}.`,
        metadata: { documentType: attachment.documentType, kind: body.kind, mimeType: attachment.mimeType, sizeBytes: attachment.sizeBytes },
        patientId: body.patientId,
      },
    }).catch(() => undefined);
    res.status(201).json({ attachment: serializeAttachment(attachment) });
  } catch (error) {
    if (req.file?.path) fs.rmSync(req.file.path, { force: true });
    next(error);
  }
});

copilotRouter.get("/attachments/:attachmentId/download", async (req, res, next) => {
  try {
    const attachment = await prisma.copilotAttachment.findFirst({
      where: { id: String(req.params.attachmentId), userId: req.auth!.id },
    });
    if (!attachment) throw new AppError(404, "Copilot attachment not found.", "COPILOT_ATTACHMENT_NOT_FOUND");
    res.download(attachment.storagePath, attachment.originalName);
  } catch (error) {
    next(error);
  }
});

copilotRouter.get("/conversations", async (req, res, next) => {
  try {
    const query = z.object({ q: z.string().optional() }).parse(req.query);
    const q = query.q?.trim();
    const [matchingPatients, matchingCases] = q
      ? await Promise.all([
          prisma.patient.findMany({
            select: { id: true },
            take: 25,
            where: {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { fullName: { contains: q, mode: "insensitive" } },
                { medicalRecordNumber: { contains: q, mode: "insensitive" } },
                { patientCode: { contains: q, mode: "insensitive" } },
              ],
            },
          }),
          prisma.eCGCase.findMany({
            select: { id: true },
            take: 25,
            where: {
              OR: [
                { id: { contains: q, mode: "insensitive" } },
                { caseId: { contains: q, mode: "insensitive" } },
                { caseNumber: { contains: q, mode: "insensitive" } },
              ],
            },
          }),
        ])
      : [[], []];
    const patientIds = matchingPatients.map((patient) => patient.id);
    const caseIds = matchingCases.map((ecgCase) => ecgCase.id);
    const conversations = await prisma.copilotConversation.findMany({
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { updatedAt: "desc" },
      take: 50,
      where: {
        userId: req.auth!.id,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { caseId: { contains: q, mode: "insensitive" } },
                { patientId: { contains: q, mode: "insensitive" } },
                { messages: { some: { content: { contains: q, mode: "insensitive" } } } },
                ...(patientIds.length ? [{ patientId: { in: patientIds } }] : []),
                ...(caseIds.length ? [{ caseId: { in: caseIds } }] : []),
              ],
            }
          : {}),
      },
    });
    res.json({ conversations: conversations.map(serializeConversation) });
  } catch (error) {
    next(error);
  }
});

copilotRouter.post("/conversations", async (req, res, next) => {
  try {
    const body = createConversationSchema.parse(req.body);
    const conversation = await prisma.copilotConversation.create({
      data: { ...body, userId: req.auth!.id },
    });
    res.status(201).json({ conversation: serializeConversation(conversation) });
  } catch (error) {
    next(error);
  }
});

copilotRouter.get("/conversations/:conversationId", async (req, res, next) => {
  try {
    const conversation = await conversationForUser(String(req.params.conversationId), req.auth!.id);
    const messages = await prisma.copilotMessage.findMany({
      include: { attachments: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "asc" },
      where: { conversationId: conversation.id },
    });
    res.json({ conversation: serializeConversation(conversation), messages: messages.map(serializeMessage) });
  } catch (error) {
    next(error);
  }
});

copilotRouter.delete("/conversations/:conversationId/messages/:messageId", async (req, res, next) => {
  try {
    const conversation = await conversationForUser(String(req.params.conversationId), req.auth!.id);
    const message = await prisma.copilotMessage.findFirst({
      where: { conversationId: conversation.id, id: String(req.params.messageId) },
    });
    if (!message) throw new AppError(404, "Copilot message not found.", "COPILOT_MESSAGE_NOT_FOUND");
    await prisma.copilotMessage.delete({ where: { id: message.id } });
    await prisma.auditLog.create({
      data: {
        action: "CASE_UPDATED",
        actorId: req.auth!.id,
        entityId: message.id,
        entityType: "CopilotMessage",
        message: "Copilot message deleted by conversation owner.",
      },
    }).catch(() => undefined);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

copilotRouter.post("/chat", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const started = Date.now();
    const body = chatSchema.parse(req.body);
    const { assistant, conversation, userMessage } = await executeCopilotChat(body, req.auth!.id, started);
    res.status(201).json({
      conversation: serializeConversation(conversation),
      message: serializeMessage(assistant),
      userMessage: serializeMessage(userMessage),
      streaming: true,
    });
  } catch (error) {
    await auditCopilotError(req.auth!.id, error, typeof req.body?.question === "string" ? req.body.question : undefined);
    next(error);
  }
});

copilotRouter.post("/chat/stream", requireRole("DOCTOR"), async (req, res, next) => {
  let closed = false;
  req.on("close", () => {
    closed = true;
  });
  try {
    const started = Date.now();
    const body = chatSchema.parse(req.body);
    res.status(201);
    res.setHeader("content-type", "text/event-stream; charset=utf-8");
    res.setHeader("cache-control", "no-cache, no-transform");
    res.setHeader("connection", "keep-alive");
    writeSse(res, "status", { message: "AI is analyzing ECG..." });
    writeSse(res, "status", { message: "Reviewing previous ECGs..." });
    writeSse(res, "status", { message: "Generating recommendations..." });
    const { assistant, conversation, userMessage } = await executeCopilotChat(body, req.auth!.id, started);
    writeSse(res, "conversation", { conversation: serializeConversation(conversation), message: serializeMessage(assistant), userMessage: serializeMessage(userMessage) });
    await streamAssistantContent(assistant.content, res, () => closed);
    if (!closed) writeSse(res, "done", { conversation: serializeConversation(conversation), message: serializeMessage(assistant), userMessage: serializeMessage(userMessage) });
    res.end();
  } catch (error) {
    await auditCopilotError(req.auth!.id, error, typeof req.body?.question === "string" ? req.body.question : undefined);
    if (!res.headersSent) {
      next(error);
      return;
    }
    writeSse(res, "error", { message: error instanceof Error ? error.message : "Copilot stream failed." });
    res.end();
  }
});

copilotRouter.get("/analytics", requireRole("SUPER_ADMIN"), async (req, res, next) => {
  try {
    await ownerOnly(req);
    const [totalConversations, usage, activeUsers] = await Promise.all([
      prisma.copilotConversation.count(),
      prisma.copilotUsageEvent.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
      prisma.copilotUsageEvent.groupBy({ by: ["userId"], _count: true }),
    ]);
    const averageResponseTimeMs = usage.length ? Math.round(usage.reduce((sum, item) => sum + item.responseTimeMs, 0) / usage.length) : 0;
    const commonQuestions = Object.entries(usage.reduce<Record<string, number>>((acc, item) => {
      const key = item.question.split("|")[0].toLowerCase().slice(0, 80);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([question, count]) => ({ count, question }));
    const topDiagnosesRequested = Object.entries(usage.reduce<Record<string, number>>((acc, item) => {
      const diagnosisPart = item.question.split("diagnoses:")[1] ?? "";
      for (const diagnosis of diagnosisPart.split(",").map((value) => value.trim()).filter(Boolean)) acc[diagnosis] = (acc[diagnosis] ?? 0) + 1;
      return acc;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([diagnosis, count]) => ({ count, diagnosis }));
    res.json({ analytics: { activeUsers: activeUsers.length, averageResponseTimeMs, mostCommonQuestions: commonQuestions, topDiagnosesRequested, totalConversations } });
  } catch (error) {
    next(error);
  }
});

copilotRouter.get("/conversations/:conversationId/export", async (req, res, next) => {
  try {
    const conversation = await conversationForUser(String(req.params.conversationId), req.auth!.id);
    const messages = await prisma.copilotMessage.findMany({ orderBy: { createdAt: "asc" }, where: { conversationId: conversation.id } });
    const body = [
      "ECG Insight Medical AI Copilot Conversation",
      `Title: ${conversation.title}`,
      DISCLAIMER,
      ...messages.map((message) => `${message.role.toUpperCase()}: ${message.content.replace(/\n/g, " ").slice(0, 800)}`),
    ].join("\n\n");
    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", `attachment; filename="${conversation.title.replace(/[^a-z0-9]+/gi, "-")}.pdf"`);
    res.send(minimalPdf(body));
  } catch (error) {
    next(error);
  }
});

copilotRouter.get("/conversations/:conversationId/export.txt", async (req, res, next) => {
  try {
    const conversation = await conversationForUser(String(req.params.conversationId), req.auth!.id);
    const messages = await prisma.copilotMessage.findMany({ orderBy: { createdAt: "asc" }, where: { conversationId: conversation.id } });
    const body = [
      "ECG Insight Medical AI Copilot Conversation",
      `Title: ${conversation.title}`,
      DISCLAIMER,
      ...messages.map((message) => `${message.role.toUpperCase()} [${message.createdAt.toISOString()}]\n${message.content}`),
    ].join("\n\n");
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.setHeader("content-disposition", `attachment; filename="${conversation.title.replace(/[^a-z0-9]+/gi, "-")}.txt"`);
    res.send(body);
  } catch (error) {
    next(error);
  }
});

function minimalPdf(text: string) {
  const lines = text.split(/\r?\n/).flatMap((line) => line.match(/.{1,95}/g) ?? [""]).slice(0, 36);
  const content = ["BT", "/F1 10 Tf", "50 780 Td", ...lines.map((line, index) => `${index === 0 ? "" : "0 -18 Td"}(${line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")}) Tj`), "ET"].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  const parts = ["%PDF-1.4\n"];
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(parts.join("")));
    parts.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  }
  const xrefOffset = Buffer.byteLength(parts.join(""));
  parts.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (const offset of offsets.slice(1)) parts.push(`${offset.toString().padStart(10, "0")} 00000 n \n`);
  parts.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return Buffer.from(parts.join(""), "utf8");
}
