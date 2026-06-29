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

export const copilotRouter = Router();
export const registeredCopilotRoutes = [
  "GET /api/copilot/conversations",
  "GET /api/copilot/conversations/:conversationId",
  "PATCH /api/copilot/conversations/:conversationId/rename",
  "PATCH /api/copilot/conversations/:conversationId/pin",
  "PATCH /api/copilot/conversations/:conversationId/favorite",
  "PATCH /api/copilot/conversations/:conversationId/archive",
  "DELETE /api/copilot/conversations/:conversationId",
] as const;

copilotRouter.use(requireAuth);

const OWNER_EMAIL = "ahmedyahia3052@gmail.com";
const DISCLAIMER = "AI assistance only. Final diagnosis and clinical decisions remain the responsibility of the physician.";
const tags = ["ECG Interpretation", "Clinical Summary", "Occupational Fitness", "Differential Diagnosis", "Follow-up"] as const;
const attachmentRoot = path.resolve(process.cwd(), "uploads", "copilot");
fs.mkdirSync(attachmentRoot, { recursive: true });

type Citation = { id: string; label: string; source: string; tags?: string[]; type: string };
type AttachmentKind = "ecg" | "echo" | "labs" | "file";

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
  tags: string[];
  topic: string;
};

const contextSchema = z.object({
  caseId: z.string().optional(),
  contextPath: z.string().optional(),
  contextType: z.enum(["case", "global", "patient"]).default("global"),
  patientId: z.string().optional(),
});

const createConversationSchema = contextSchema.extend({
  isFavorite: z.boolean().default(false),
  isPinned: z.boolean().default(false),
  tag: z.enum(tags).default("ECG Interpretation"),
  title: z.string().trim().min(1).max(160).default("New clinical conversation"),
});

const updateConversationSchema = z.object({
  archivedAt: z.coerce.date().nullable().optional(),
  favorite: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  lastOpenedAt: z.coerce.date().nullable().optional(),
  tag: z.enum(tags).optional(),
  title: z.string().trim().min(1).max(160).optional(),
});

const renameConversationSchema = z.object({
  title: z.string().trim().min(1).max(160),
});

const pinConversationSchema = z.object({
  isPinned: z.boolean(),
});

const favoriteConversationSchema = z.object({
  isFavorite: z.boolean(),
});

const attachmentKinds = ["ecg", "echo", "labs", "file"] as const;
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
    extensions: new Set([".csv", ".docx", ".jpg", ".jpeg", ".pdf", ".png", ".txt"]),
    maxBytes: 20 * 1024 * 1024,
    mime: new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/jpg", "image/png", "text/csv", "text/plain"]),
  },
};

function safeAttachmentName(originalName: string) {
  const ext = path.extname(originalName).toLowerCase();
  if (!Object.values(attachmentRules).some((rule) => rule.extensions.has(ext))) {
    throw new AppError(400, "Unsupported format.", "UNSUPPORTED_FORMAT");
  }
  return `${Date.now()}-${randomUUID()}${ext}`;
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
  archivedAt: Date | null;
  caseId: string | null;
  contextType: string | null;
  createdAt: Date;
  deletedAt?: Date | null;
  favorite: boolean;
  id: string;
  isFavorite: boolean;
  isPinned: boolean;
  lastOpenedAt: Date | null;
  patientId: string | null;
  tag: string;
  title: string;
  updatedAt: Date;
}) {
  return {
    archivedAt: conversation.archivedAt?.toISOString() ?? undefined,
    caseId: conversation.caseId ?? undefined,
    contextType: conversation.contextType ?? undefined,
    createdAt: conversation.createdAt.toISOString(),
    deletedAt: conversation.deletedAt?.toISOString() ?? undefined,
    favorite: conversation.isFavorite || conversation.favorite,
    id: conversation.id,
    isFavorite: conversation.isFavorite || conversation.favorite,
    isPinned: conversation.isPinned,
    lastOpenedAt: conversation.lastOpenedAt?.toISOString() ?? undefined,
    patientId: conversation.patientId ?? undefined,
    tag: conversation.tag,
    title: conversation.title,
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

function serializeAttachment(attachment: {
  caseId: string | null;
  conversationId: string | null;
  createdAt: Date;
  id: string;
  kind: string;
  messageId: string | null;
  mimeType: string;
  originalName: string;
  patientId: string | null;
  sizeBytes: number;
  storedName: string;
}) {
  return {
    caseId: attachment.caseId ?? undefined,
    conversationId: attachment.conversationId ?? undefined,
    createdAt: attachment.createdAt.toISOString(),
    downloadUrl: `/api/copilot/attachments/${attachment.id}/download`,
    id: attachment.id,
    kind: attachment.kind,
    messageId: attachment.messageId ?? undefined,
    mimeType: attachment.mimeType,
    originalName: attachment.originalName,
    patientId: attachment.patientId ?? undefined,
    sizeBytes: attachment.sizeBytes,
    storedName: attachment.storedName,
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
  const fallback = hits.length ? [] : await prisma.eCGKnowledgeEntry.findMany({ orderBy: { topic: "asc" }, take: 6 });
  const selected = (hits.length ? hits : fallback).map((entry) => ({
    category: entry.category,
    content: entry.content,
    id: entry.id,
    references: entry.references,
    tags: entry.tags,
    topic: entry.topic,
  }));
  const sources = selected.map((entry) => ({ id: entry.id, label: entry.topic, source: "ECG Knowledge Base", tags: entry.tags, type: "knowledge" }));
  return { hits: selected, sources, tags: Array.from(new Set(selected.flatMap((entry) => entry.tags))).slice(0, 12) };
}

function buildPrompt(question: string, context: ClinicalContext, knowledge: KnowledgeHit[]) {
  return [
    `Question: ${question}`,
    `Patient: ${context.patient ? `${context.patient.age}-year-old ${context.patient.gender.toLowerCase()} ${context.patient.fullName}; employee ${context.patient.employeeId ?? "n/a"}; ${context.patient.company ?? "company n/a"} / ${context.patient.department ?? "department n/a"}; occupation ${context.patient.occupation ?? "n/a"}.` : "No active patient context."}`,
    `History: ${context.patient ? `${context.patient.history}; medications ${context.patient.medications}; allergies ${context.patient.allergies}; risk factors ${context.patient.riskFactors.join(", ") || "none documented"}.` : "General ECG knowledge only."}`,
    `Current ECG: ${context.currentCase ? `${context.currentCase.rhythm ?? "rhythm pending"}, HR ${context.currentCase.heartRate ?? "n/a"}, ${context.currentCase.intervals}, axis ${context.currentCase.axis ?? "n/a"}, diagnosis ${context.currentCase.diagnosis ?? "pending"}, doctor ${context.currentCase.doctorDiagnosis ?? "pending"}, severity ${context.currentCase.severity}.` : "No current ECG case open."}`,
    `Previous ECGs: ${context.previousEcgs.slice(0, 5).join(" | ") || "none retrieved"}.`,
    `Documents: ${context.documents.slice(0, 5).join(" | ") || "none retrieved"}.`,
    `Knowledge: ${knowledge.map((entry) => `${entry.topic}: ${entry.content}`).join(" | ") || "general safety knowledge"}.`,
  ].join("\n");
}

function generateClinicalResponse(input: { context: ClinicalContext; knowledge: KnowledgeHit[]; prompt: string; question: string }) {
  const risk = riskStratification(input.context, input.question);
  const confidence = confidenceScore(input.context, input.knowledge);
  const patientSummary = input.context.patient
    ? `${input.context.patient.age}-year-old ${input.context.patient.gender.toLowerCase()} ${input.context.patient.fullName} with ${input.context.patient.riskFactors.join(", ") || "no documented major risk factors"}. Medical history: ${input.context.patient.history}.`
    : "No patient profile is currently open. Response is based on general ECG knowledge only.";
  const ecgInterpretation = input.context.currentCase
    ? `${input.context.currentCase.rhythm ?? "Rhythm not documented"} with HR ${input.context.currentCase.heartRate ?? "n/a"} bpm, ${input.context.currentCase.intervals}, axis ${input.context.currentCase.axis ?? "n/a"}, AI impression ${input.context.currentCase.diagnosis ?? "pending"}, physician impression ${input.context.currentCase.doctorDiagnosis ?? "pending"}, severity ${input.context.currentCase.severity ?? "not classified"}.`
    : "No active ECG case is open. For case-specific interpretation, open an ECG case and ask again.";
  const differential = differentialDiagnosis(input.question, input.context, input.knowledge);
  const occupational = occupationalOpinion(risk, input.context, input.question);
  const recommendations = recommendationsFor(risk, input.context, input.knowledge);
  const followUp = followUpFor(risk, input.context);

  return {
    confidence,
    content: `${DISCLAIMER}\n\n## Clinical Summary\n${patientSummary}\n\n## ECG Interpretation\n${ecgInterpretation}\n\n## Differential Diagnosis\n${differential.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n## Risk Stratification\n${risk.level}: ${risk.reason}\n\n## Occupational Fitness Opinion\n${occupational}\n\n## Recommendations\n${recommendations.map((item) => `- ${item}`).join("\n")}\n\n## Follow-up Plan\n${followUp.map((item) => `- ${item}`).join("\n")}\n\n## Confidence Score\n${Math.round(confidence * 100)}%\n\n## Sources Used\n${input.context.sources.concat(input.knowledge.map((entry) => ({ id: entry.id, label: entry.topic, source: "ECG Knowledge Base", tags: entry.tags, type: "knowledge" }))).slice(0, 10).map((source) => `- ${source.source}: ${source.label}`).join("\n") || "- ECG Knowledge Base"}\n\n## Knowledge Tags\n${Array.from(new Set(input.knowledge.flatMap((entry) => entry.tags))).slice(0, 10).join(", ") || "general-ecg"}`,
    prompt: input.prompt,
  };
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

async function conversationForUser(conversationId: string, userId: string) {
  const conversation = await prisma.copilotConversation.findFirst({ where: { deletedAt: null, id: conversationId, userId } });
  if (!conversation) throw new AppError(404, "Copilot conversation not found.", "COPILOT_CONVERSATION_NOT_FOUND");
  return conversation;
}

async function mutableConversationForUser(conversationId: string, userId: string) {
  const conversation = await prisma.copilotConversation.findFirst({ where: { deletedAt: null, id: conversationId } });
  if (!conversation) throw new AppError(404, "Copilot conversation not found.", "COPILOT_CONVERSATION_NOT_FOUND");
  if (conversation.userId !== userId) throw new AppError(403, "You do not have access to this Copilot conversation.", "COPILOT_CONVERSATION_FORBIDDEN");
  return conversation;
}

async function executeCopilotChat(input: ChatInput, userId: string, started = Date.now()) {
  const currentSettings = await settings();
  if (!currentSettings.enabled) throw new AppError(503, "Medical AI Copilot is disabled by the developer owner.", "COPILOT_DISABLED");
  const tag = input.tag ?? classifyQuestion(input.question);
  const conversation = input.conversationId
    ? await conversationForUser(input.conversationId, userId)
    : await prisma.copilotConversation.create({
        data: {
          caseId: input.caseId,
          contextType: input.contextType,
          patientId: input.patientId,
          tag,
          title: input.question.slice(0, 80),
          userId,
        },
      });
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
  const knowledge = await retrieveKnowledge(input.question, clinicalContext);
  const attachmentContext = userMessage.attachments.length
    ? `\nAttachments: ${userMessage.attachments.map((attachment) => `${attachment.kind.toUpperCase()} ${attachment.originalName} (${attachment.mimeType}, ${attachment.sizeBytes} bytes)`).join(" | ")}`
    : "";
  const enrichedQuestion = `${input.question}${attachmentContext}`;
  const prompt = buildPrompt(enrichedQuestion, clinicalContext, knowledge.hits);
  const result = generateClinicalResponse({ context: clinicalContext, knowledge: knowledge.hits, prompt, question: enrichedQuestion });
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
    data: { lastOpenedAt: new Date(), tag, updatedAt: new Date() },
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
    const attachment = await prisma.copilotAttachment.create({
      data: {
        caseId: body.caseId,
        conversationId: body.conversationId,
        kind: body.kind,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
        patientId: body.patientId,
        sizeBytes: req.file.size,
        storagePath: req.file.path,
        storedName: req.file.filename,
        userId: req.auth!.id,
      },
    });
    await prisma.auditLog.create({
      data: {
        action: "CASE_UPDATED",
        actorId: req.auth!.id,
        caseId: body.caseId,
        entityId: attachment.id,
        entityType: "CopilotAttachment",
        message: `Copilot ${body.kind} attachment uploaded: ${attachment.originalName}.`,
        metadata: { kind: body.kind, mimeType: attachment.mimeType, sizeBytes: attachment.sizeBytes },
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
      orderBy: [{ isPinned: "desc" }, { lastOpenedAt: "desc" }, { updatedAt: "desc" }],
      take: 50,
      where: {
        deletedAt: null,
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

copilotRouter.post("/conversations/:conversationId/duplicate", async (req, res, next) => {
  try {
    const current = await conversationForUser(String(req.params.conversationId), req.auth!.id);
    const messages = await prisma.copilotMessage.findMany({ orderBy: { createdAt: "asc" }, where: { conversationId: current.id } });
    const duplicated = await prisma.copilotConversation.create({
      data: {
        archivedAt: null,
        caseId: current.caseId,
        contextType: current.contextType,
        favorite: false,
        isFavorite: false,
        isPinned: false,
        lastOpenedAt: new Date(),
        patientId: current.patientId,
        tag: current.tag,
        title: `${current.title} copy`.slice(0, 160),
        userId: req.auth!.id,
        messages: {
          create: messages.map((message) => ({
            citations: message.citations as Prisma.InputJsonValue | undefined,
            confidence: message.confidence,
            content: message.content,
            responseTimeMs: message.responseTimeMs,
            role: message.role,
          })),
        },
      },
    });
    res.status(201).json({ conversation: serializeConversation(duplicated) });
  } catch (error) {
    next(error);
  }
});

copilotRouter.patch("/conversations/:conversationId/archive", async (req, res, next) => {
  try {
    const current = await mutableConversationForUser(String(req.params.conversationId), req.auth!.id);
    const archivedAt = current.archivedAt ? null : new Date();
    const conversation = await prisma.copilotConversation.update({
      data: archivedAt ? { archivedAt, favorite: false, isFavorite: false, isPinned: false } : { archivedAt: null, lastOpenedAt: new Date() },
      where: { id: current.id },
    });
    res.json({ conversation: serializeConversation(conversation), success: true });
  } catch (error) {
    next(error);
  }
});

copilotRouter.post("/conversations/:conversationId/restore", async (req, res, next) => {
  try {
    const current = await mutableConversationForUser(String(req.params.conversationId), req.auth!.id);
    const conversation = await prisma.copilotConversation.update({
      data: { archivedAt: null, lastOpenedAt: new Date() },
      where: { id: current.id },
    });
    res.json({ conversation: serializeConversation(conversation) });
  } catch (error) {
    next(error);
  }
});

copilotRouter.get("/conversations/:conversationId", async (req, res, next) => {
  try {
    const current = await conversationForUser(String(req.params.conversationId), req.auth!.id);
    const conversation = await prisma.copilotConversation.update({
      data: { lastOpenedAt: new Date() },
      where: { id: current.id },
    });
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

copilotRouter.patch("/conversations/:conversationId/rename", async (req, res, next) => {
  try {
    const current = await mutableConversationForUser(String(req.params.conversationId), req.auth!.id);
    const body = renameConversationSchema.parse(req.body);
    const conversation = await prisma.copilotConversation.update({
      data: { title: body.title },
      where: { id: current.id },
    });
    res.json({ conversation: serializeConversation(conversation), success: true });
  } catch (error) {
    next(error);
  }
});

copilotRouter.patch("/conversations/:conversationId/pin", async (req, res, next) => {
  try {
    const current = await mutableConversationForUser(String(req.params.conversationId), req.auth!.id);
    const body = pinConversationSchema.parse(req.body);
    const conversation = await prisma.copilotConversation.update({
      data: { isPinned: body.isPinned },
      where: { id: current.id },
    });
    res.json({ conversation: serializeConversation(conversation), success: true });
  } catch (error) {
    next(error);
  }
});

copilotRouter.patch("/conversations/:conversationId/favorite", async (req, res, next) => {
  try {
    const current = await mutableConversationForUser(String(req.params.conversationId), req.auth!.id);
    const body = favoriteConversationSchema.parse(req.body);
    const conversation = await prisma.copilotConversation.update({
      data: { favorite: body.isFavorite, isFavorite: body.isFavorite },
      where: { id: current.id },
    });
    res.json({ conversation: serializeConversation(conversation), success: true });
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

copilotRouter.patch("/conversations/:conversationId", async (req, res, next) => {
  try {
    const current = await mutableConversationForUser(String(req.params.conversationId), req.auth!.id);
    const body = updateConversationSchema.parse(req.body);
    const conversation = await prisma.copilotConversation.update({
      data: { ...body, favorite: body.isFavorite ?? body.favorite },
      where: { id: current.id },
    });
    res.json({ conversation: serializeConversation(conversation) });
  } catch (error) {
    next(error);
  }
});

copilotRouter.delete("/conversations/:conversationId", async (req, res, next) => {
  try {
    const current = await mutableConversationForUser(String(req.params.conversationId), req.auth!.id);
    await prisma.copilotConversation.update({
      data: { archivedAt: new Date(), deletedAt: new Date(), favorite: false, isFavorite: false, isPinned: false },
      where: { id: current.id },
    });
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
