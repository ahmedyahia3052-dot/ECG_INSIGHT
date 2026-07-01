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
import { CONVERSATION_SYSTEM_PROMPT } from "./conversation-system-prompt";
import { attachmentInsights, dedupeCitations } from "./conversational-engine";
import type { AttachmentInsight, Citation, ClinicalContext, ConversationMemory, KnowledgeHit } from "./copilot-types";
import {
  emptyClinicalContext,
  isFastPathIntent,
} from "./intent-manager";
import { buildBrainDebugPayload, previewAiBrainV3, ResponseComposer, runAiBrainV3 } from "./brain";
import { parseCopilotProviderSettings } from "./intent-pipeline";
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
const LEGAL_DISCLAIMER = "AI assistance only. Clinical decisions remain the responsibility of the physician.";
const DISCLAIMER = LEGAL_DISCLAIMER;
const tags = ["ECG Interpretation", "Clinical Summary", "Occupational Fitness", "Differential Diagnosis", "Follow-up"] as const;
const attachmentRoot = path.resolve(process.cwd(), "uploads", "copilot");
fs.mkdirSync(attachmentRoot, { recursive: true });

type AttachmentKind = "camera" | "ecg" | "echo" | "file" | "image" | "labs";

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
  const warnings = new Set<string>();
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
  const defaultProvider = JSON.stringify({ brainVersion: "v3", classifier: "SmartIntentClassifier", developerMode: process.env.NODE_ENV !== "production" });
  return prisma.copilotSettings.upsert({
    create: { enabled: true, provider: defaultProvider },
    update: {},
    where: { id: "global" },
  }).catch(() => prisma.copilotSettings.create({ data: { id: "global", enabled: true, provider: defaultProvider } }));
}

async function copilotDeveloperModeEnabled(userId: string, provider: string) {
  const parsed = parseCopilotProviderSettings(provider);
  if (!parsed.developerMode) return false;
  if (process.env.NODE_ENV !== "production") return true;
  const user = await prisma.user.findUnique({ select: { email: true, protectedOwner: true, role: true }, where: { id: userId } });
  return Boolean(user?.protectedOwner || user?.role === "SUPER_ADMIN" || user?.email?.toLowerCase() === OWNER_EMAIL);
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
    conversationId: attachment.conversationId ?? undefined,
    createdAt: attachment.createdAt.toISOString(),
    documentType: attachment.documentType ?? undefined,
    downloadUrl: `/api/copilot/attachments/${attachment.id}/download`,
    id: attachment.id,
    kind: attachment.kind,
    mimeType: attachment.mimeType,
    originalName: attachment.originalName,
    sizeBytes: attachment.sizeBytes,
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
    citations: [],
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
    sourceName: "Clinical knowledge index",
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

async function retrieveConversationMemory(conversationId: string): Promise<ConversationMemory> {
  const recent = await prisma.copilotMessage.findMany({
    include: { attachments: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 12,
    where: { conversationId },
  });
  const ordered = recent.reverse();
  const turns = ordered.map((message) => ({
    content: message.content.replace(/\s+/g, " ").slice(0, 360),
    role: message.role,
  }));
  const attachments = attachmentInsights(ordered.flatMap((message) => message.attachments));
  const summary = turns.length
    ? turns.map((turn) => `${turn.role}: ${turn.content}`).join(" | ")
    : "No previous conversation turns.";
  return { attachments, summary, turns };
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

function classifyQuestion(question: string) {
  const lower = question.toLowerCase();
  if (lower.includes("occupational") || lower.includes("fitness")) return "Occupational Fitness";
  if (lower.includes("differential")) return "Differential Diagnosis";
  if (lower.includes("follow")) return "Follow-up";
  if (lower.includes("summar")) return "Clinical Summary";
  return "ECG Interpretation";
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
  const memory = await retrieveConversationMemory(conversation.id);
  const brain = runAiBrainV3({
    attachments: userMessage.attachments,
    chatInput: {
      caseId: input.caseId ?? conversation.caseId ?? undefined,
      patientId: input.patientId ?? conversation.patientId ?? undefined,
    },
    clinicianName: requestingUser?.name,
    conversationId: conversation.id,
    memory,
    question: input.question,
  });
  const { classification, decision, plan } = brain;
  const intent = brain.medicalIntent;
  const tag = brain.tag;
  const clinicalContext = decision.runClinicalContext
    ? await retrieveClinicalContext({ caseId: input.caseId ?? conversation.caseId ?? undefined, patientId: input.patientId ?? conversation.patientId ?? undefined })
    : emptyClinicalContext();
  let storedCitations: Citation[] = [];
  if (intent === "show_sources") {
    const previousAssistant = await prisma.copilotMessage.findFirst({
      orderBy: { createdAt: "desc" },
      where: { conversationId: conversation.id, role: "assistant" },
    });
    storedCitations = Array.isArray(previousAssistant?.citations)
      ? (previousAssistant!.citations as Citation[])
      : [];
  }
  const knowledgeQuery = userMessage.attachments.length
    ? `${input.question} ${userMessage.attachments.map((attachment) => `${attachment.documentType ?? ""} ${attachment.analysisSummary ?? ""}`).join(" ")}`
    : input.question;
  const knowledge = decision.runKnowledgeSearch
    ? await retrieveKnowledge(knowledgeQuery, clinicalContext)
    : { hits: [], sources: [], tags: [] };
  void CONVERSATION_SYSTEM_PROMPT;
  const result = ResponseComposer.compose({
    brain,
    clinicalContext: intent === "show_sources" ? { ...emptyClinicalContext(), sources: storedCitations } : clinicalContext,
    knowledgeHits: knowledge.hits,
    storedCitations: intent === "show_sources" ? storedCitations : undefined,
  });
  const responseTimeMs = Date.now() - started;
  const assistant = await prisma.copilotMessage.create({
    data: {
      citations: dedupeCitations(result.citations) as unknown as Prisma.InputJsonValue,
      confidence: result.confidence,
      content: result.content,
      conversationId: conversation.id,
      responseTimeMs,
      role: "assistant",
    },
  });
  await prisma.copilotUsageEvent.create({
    data: {
      conversationId: conversation.id,
      question: `${input.question} | brain:v3 | intent:${classification.primaryIntent} | tools:${plan.tools.join(",")} | brain:${brain.executionTimeMs}ms`,
      responseTimeMs,
      tag,
      userId,
    },
  });
  const updatedConversation = await prisma.copilotConversation.update({
    data: {
      tag,
      title: existingUserMessages === 0 && conversation.title === "New Clinical Conversation" ? generatedTitle : conversation.title,
      updatedAt: new Date(),
    },
    where: { id: conversation.id },
  });
  return { assistant, brain, conversation: updatedConversation, result, responseTimeMs, userMessage };
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
    writeSse(res, "status", { message: "Understanding your request..." });
    const currentSettings = await settings();
    const previewBrain = previewAiBrainV3({
      attachments: [],
      chatInput: { caseId: body.caseId, patientId: body.patientId },
      memory: { attachments: [], summary: "", turns: [] },
      question: body.question,
    });
    if (!isFastPathIntent(previewBrain.medicalIntent, previewBrain.plan.tools)) {
      writeSse(res, "status", { message: "Reviewing clinical information..." });
    }
    const { assistant, brain, conversation, userMessage } = await executeCopilotChat(body, req.auth!.id, started);
    const developerMode = await copilotDeveloperModeEnabled(req.auth!.id, currentSettings.provider);
    if (developerMode) {
      writeSse(res, "brain_debug", buildBrainDebugPayload(brain));
    }
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
