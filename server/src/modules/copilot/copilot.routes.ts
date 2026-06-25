import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";

export const copilotRouter = Router();

copilotRouter.use(requireAuth);

const OWNER_EMAIL = "ahmedyahia3052@gmail.com";
const DISCLAIMER = "AI assistance only. Final diagnosis and clinical decisions remain the responsibility of the physician.";
const tags = ["ECG Interpretation", "Clinical Summary", "Occupational Fitness", "Differential Diagnosis", "Follow-up"] as const;

type Citation = { id: string; label: string; source: string; type: string };

const contextSchema = z.object({
  caseId: z.string().optional(),
  contextPath: z.string().optional(),
  contextType: z.enum(["case", "global", "patient"]).default("global"),
  patientId: z.string().optional(),
});

const createConversationSchema = contextSchema.extend({
  tag: z.enum(tags).default("ECG Interpretation"),
  title: z.string().trim().min(1).max(160).default("New clinical conversation"),
});

const updateConversationSchema = z.object({
  favorite: z.boolean().optional(),
  tag: z.enum(tags).optional(),
  title: z.string().trim().min(1).max(160).optional(),
});

const chatSchema = contextSchema.extend({
  conversationId: z.string().optional(),
  question: z.string().trim().min(1).max(4000),
  tag: z.enum(tags).default("ECG Interpretation"),
});

const settingsSchema = z.object({
  enabled: z.boolean(),
  provider: z.string().trim().min(1).max(80),
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
  favorite: boolean;
  id: string;
  patientId: string | null;
  tag: string;
  title: string;
  updatedAt: Date;
}) {
  return {
    caseId: conversation.caseId ?? undefined,
    contextType: conversation.contextType ?? undefined,
    createdAt: conversation.createdAt.toISOString(),
    favorite: conversation.favorite,
    id: conversation.id,
    patientId: conversation.patientId ?? undefined,
    tag: conversation.tag,
    title: conversation.title,
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

function serializeMessage(message: {
  citations: Prisma.JsonValue | null;
  confidence: number | null;
  content: string;
  createdAt: Date;
  id: string;
  responseTimeMs: number | null;
  role: string;
}) {
  return {
    citations: message.citations ?? [],
    confidence: message.confidence ?? undefined,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    id: message.id,
    responseTimeMs: message.responseTimeMs ?? undefined,
    role: message.role,
  };
}

async function collectContext(input: { caseId?: string; patientId?: string; question: string }) {
  const citations: Citation[] = [];
  const snippets: string[] = [];
  const patientIdFromCase = input.caseId
    ? (await prisma.eCGCase.findFirst({ where: { OR: [{ id: input.caseId }, { caseId: input.caseId }, { caseNumber: input.caseId }] } }))?.patientId
    : undefined;
  const patientId = input.patientId ?? patientIdFromCase;

  if (patientId) {
    const patient = await prisma.patient.findUnique({
      include: {
        cases: { orderBy: { uploadDate: "desc" }, take: 5 },
        reports: { orderBy: { createdAt: "desc" }, take: 5 },
      },
      where: { id: patientId },
    });
    if (patient) {
      citations.push({ id: patient.id, label: "Patient profile", source: `Patient ${patient.firstName} ${patient.lastName}`, type: "patient" });
      snippets.push(`Patient demographics: ${patient.firstName} ${patient.lastName}, gender ${patient.gender}, DOB ${patient.dateOfBirth.toISOString().slice(0, 10)}.`);
      snippets.push(`Medical history: ${patient.medicalHistory ?? "not documented"}. Medications: ${patient.medications ?? "not documented"}. Allergies: ${patient.knownAllergies ?? patient.allergies ?? "not documented"}.`);
      for (const ecgCase of patient.cases) {
        citations.push({ id: ecgCase.id, label: ecgCase.caseNumber ?? ecgCase.caseId, source: "Stored ECG case", type: "case" });
        snippets.push(`ECG ${ecgCase.caseNumber ?? ecgCase.caseId}: status ${ecgCase.status}, rhythm ${ecgCase.rhythm ?? "pending"}, AI ${ecgCase.aiDiagnosis ?? "pending"}, doctor ${ecgCase.doctorDiagnosis ?? "pending"}, HR ${ecgCase.heartRate ?? "n/a"}, PR ${ecgCase.prInterval ?? "n/a"}, QRS ${ecgCase.qrsDuration ?? "n/a"}, QTc ${ecgCase.qtcInterval ?? "n/a"}.`);
      }
      for (const report of patient.reports) {
        citations.push({ id: report.id, label: report.reportNumber, source: "Previous report", type: "report" });
        snippets.push(`Report ${report.reportNumber}: ${report.finalPhysicianImpression ?? report.aiFindings ?? "draft report without final impression"}.`);
      }
    }
  }

  if (input.caseId) {
    const ecgCase = await prisma.eCGCase.findFirst({
      include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 }, measurements: { orderBy: { createdAt: "desc" }, take: 1 } },
      where: { OR: [{ id: input.caseId }, { caseId: input.caseId }, { caseNumber: input.caseId }] },
    });
    if (ecgCase) {
      citations.push({ id: ecgCase.id, label: ecgCase.caseNumber ?? ecgCase.caseId, source: "Current ECG case", type: "case" });
      snippets.push(`Current ECG case: AI diagnosis ${ecgCase.aiDiagnosis ?? ecgCase.analyses[0]?.diagnosis ?? "pending"}, doctor diagnosis ${ecgCase.doctorDiagnosis ?? "pending"}, comments ${ecgCase.clinicalComments ?? ecgCase.clinicalNotes ?? "none"}, severity ${ecgCase.severity}, status ${ecgCase.status}.`);
      if (ecgCase.measurements[0]) snippets.push(`Measurements: HR ${ecgCase.measurements[0].heartRate}, PR ${ecgCase.measurements[0].prInterval}, QRS ${ecgCase.measurements[0].qrsDuration}, QT ${ecgCase.measurements[0].qtInterval}, QTc ${ecgCase.measurements[0].qtcInterval}.`);
    }
  }

  const terms = input.question.toLowerCase().split(/\W+/).filter((word) => word.length > 2);
  const knowledge = await prisma.eCGKnowledgeEntry.findMany({
    orderBy: { updatedAt: "desc" },
    take: 6,
    where: {
      OR: [
        { topic: { contains: input.question, mode: "insensitive" } },
        { content: { contains: terms[0] ?? input.question, mode: "insensitive" } },
        { tags: { hasSome: terms } },
      ],
    },
  });
  for (const entry of knowledge.length ? knowledge : await prisma.eCGKnowledgeEntry.findMany({ take: 4, orderBy: { category: "asc" } })) {
    citations.push({ id: entry.id, label: entry.topic, source: "ECG knowledge base", type: "knowledge" });
    snippets.push(`${entry.topic}: ${entry.content}`);
  }

  return { citations: dedupeCitations(citations), snippets };
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

function classifyQuestion(question: string) {
  const lower = question.toLowerCase();
  if (lower.includes("occupational") || lower.includes("fitness")) return "Occupational Fitness";
  if (lower.includes("differential")) return "Differential Diagnosis";
  if (lower.includes("follow")) return "Follow-up";
  if (lower.includes("summar")) return "Clinical Summary";
  return "ECG Interpretation";
}

function answer(question: string, snippets: string[], tag: string) {
  const lower = question.toLowerCase();
  const confidence = snippets.length > 4 ? 0.82 : snippets.length > 1 ? 0.7 : 0.58;
  const focus = lower.includes("qt") ? "QT prolongation and repolarization risk"
    : lower.includes("af") || lower.includes("atrial") ? "atrial arrhythmia evaluation"
    : lower.includes("stemi") || lower.includes("st ") ? "ischemic ST-segment assessment"
    : lower.includes("fitness") || lower.includes("occupational") ? "occupational cardiovascular fitness"
    : tag;
  const evidence = snippets.slice(0, 6).map((snippet, index) => `${index + 1}. ${snippet}`).join("\n");
  return {
    confidence,
    content: `${DISCLAIMER}\n\n## Clinical Copilot Response\n**Focus:** ${focus}\n\n**Confidence:** ${Math.round(confidence * 100)}% based on available ECG Insight records and internal ECG knowledge.\n\n**Interpretation support:**\n${evidence || "No patient-specific context was available, so this response is limited to general ECG knowledge."}\n\n**Clinical guidance:**\n- Treat this as decision support, not a final diagnosis.\n- Correlate ECG findings with symptoms, vitals, medication/electrolyte history, prior ECGs, and physician examination.\n- If the question involves STEMI, VT/VF, high-grade AV block, syncope, or marked QT prolongation, escalate urgently according to local protocol.\n\n**Suggested next steps:**\n- Confirm measurements and rhythm manually.\n- Compare with previous ECGs and reports when available.\n- Document physician impression and follow-up recommendations in the report workflow.`,
  };
}

async function conversationForUser(conversationId: string, userId: string) {
  const conversation = await prisma.copilotConversation.findFirst({ where: { id: conversationId, userId } });
  if (!conversation) throw new AppError(404, "Copilot conversation not found.", "COPILOT_CONVERSATION_NOT_FOUND");
  return conversation;
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

copilotRouter.get("/conversations", async (req, res, next) => {
  try {
    const query = z.object({ q: z.string().optional() }).parse(req.query);
    const conversations = await prisma.copilotConversation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      where: {
        userId: req.auth!.id,
        ...(query.q ? { title: { contains: query.q, mode: "insensitive" } } : {}),
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
      orderBy: { createdAt: "asc" },
      where: { conversationId: conversation.id },
    });
    res.json({ conversation: serializeConversation(conversation), messages: messages.map(serializeMessage) });
  } catch (error) {
    next(error);
  }
});

copilotRouter.patch("/conversations/:conversationId", async (req, res, next) => {
  try {
    const current = await conversationForUser(String(req.params.conversationId), req.auth!.id);
    const body = updateConversationSchema.parse(req.body);
    const conversation = await prisma.copilotConversation.update({ data: body, where: { id: current.id } });
    res.json({ conversation: serializeConversation(conversation) });
  } catch (error) {
    next(error);
  }
});

copilotRouter.delete("/conversations/:conversationId", async (req, res, next) => {
  try {
    const current = await conversationForUser(String(req.params.conversationId), req.auth!.id);
    await prisma.copilotConversation.delete({ where: { id: current.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

copilotRouter.post("/chat", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const currentSettings = await settings();
    if (!currentSettings.enabled) throw new AppError(503, "Medical AI Copilot is disabled by the developer owner.", "COPILOT_DISABLED");
    const started = Date.now();
    const body = chatSchema.parse(req.body);
    const tag = body.tag ?? classifyQuestion(body.question);
    const conversation = body.conversationId
      ? await conversationForUser(body.conversationId, req.auth!.id)
      : await prisma.copilotConversation.create({
          data: {
            caseId: body.caseId,
            contextType: body.contextType,
            patientId: body.patientId,
            tag,
            title: body.question.slice(0, 80),
            userId: req.auth!.id,
          },
        });
    await prisma.copilotMessage.create({
      data: { content: body.question, conversationId: conversation.id, role: "user" },
    });
    const context = await collectContext({ caseId: body.caseId ?? conversation.caseId ?? undefined, patientId: body.patientId ?? conversation.patientId ?? undefined, question: body.question });
    const result = answer(body.question, context.snippets, tag);
    const responseTimeMs = Date.now() - started;
    const assistant = await prisma.copilotMessage.create({
      data: {
        citations: context.citations as unknown as Prisma.InputJsonValue,
        confidence: result.confidence,
        content: result.content,
        conversationId: conversation.id,
        responseTimeMs,
        role: "assistant",
      },
    });
    await prisma.copilotUsageEvent.create({
      data: { conversationId: conversation.id, question: body.question, responseTimeMs, tag, userId: req.auth!.id },
    });
    await prisma.copilotConversation.update({
      data: { tag, updatedAt: new Date() },
      where: { id: conversation.id },
    });
    res.status(201).json({
      conversation: serializeConversation({ ...conversation, tag, updatedAt: new Date() }),
      message: serializeMessage(assistant),
      streaming: true,
    });
  } catch (error) {
    next(error);
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
      const key = item.question.toLowerCase().slice(0, 80);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([question, count]) => ({ count, question }));
    res.json({ analytics: { activeUsers: activeUsers.length, averageResponseTimeMs, mostCommonQuestions: commonQuestions, totalConversations } });
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
