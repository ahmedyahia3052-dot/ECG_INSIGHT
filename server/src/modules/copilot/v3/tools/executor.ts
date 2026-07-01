import type { AttachmentForAnalysis, ChatContextInput, ClinicalContext } from "../../copilot-types";
import { retrieveRoutedKnowledge } from "../../engine/knowledge-retrieval";
import { semanticSearchKnowledge } from "../../medical-knowledge";
import type { KnowledgeRoute } from "../../engine/types";
import { analyzeAttachmentStructured } from "./document-analyzer";

export type ToolExecutorContext = {
  attachments: AttachmentForAnalysis[];
  chatInput: ChatContextInput;
  retrieveClinicalContext: (input: ChatContextInput) => Promise<ClinicalContext>;
};

function parseArgs(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function attachmentById(attachments: AttachmentForAnalysis[], id?: string) {
  if (!id) return attachments[0];
  return attachments.find((item) => item.attachmentId === id || item.originalName === id) ?? attachments[0];
}

export async function executeCopilotTool(
  name: string,
  argsJson: string,
  ctx: ToolExecutorContext,
): Promise<unknown> {
  const args = parseArgs(argsJson);

  switch (name) {
    case "medical_knowledge_search":
    case "medical_search": {
      const query = String(args.query ?? "");
      const route: KnowledgeRoute = { query, sources: ["cardiology_kb", "internal_knowledge_base", "ecg_database"] };
      const hits = await retrieveRoutedKnowledge(route, await ctx.retrieveClinicalContext(ctx.chatInput));
      return { hits: hits.slice(0, 6).map((hit) => ({ content: hit.content.slice(0, 600), source: hit.sourceName, topic: hit.topic })), query };
    }
    case "clinical_guidelines": {
      const query = String(args.query ?? "");
      const route: KnowledgeRoute = { query, sources: ["esc_guidelines", "aha_guidelines", "cardiology_kb"] };
      const hits = await retrieveRoutedKnowledge(route, await ctx.retrieveClinicalContext(ctx.chatInput));
      return { guidelines: hits.slice(0, 5).map((hit) => ({ content: hit.content.slice(0, 600), source: hit.sourceName, topic: hit.topic })), query };
    }
    case "drug_database": {
      const query = String(args.query ?? "");
      const hits = await semanticSearchKnowledge(query, { domains: ["DRUGS", "CARDIOLOGY"], take: 5 });
      return { drugs: hits.map((hit) => ({ content: hit.content.slice(0, 600), source: hit.sourceName, title: hit.title })), query };
    }
    case "patient_record_retrieval": {
      const clinicalContext = await ctx.retrieveClinicalContext({
        caseId: typeof args.caseId === "string" ? args.caseId : ctx.chatInput.caseId,
        patientId: typeof args.patientId === "string" ? args.patientId : ctx.chatInput.patientId,
      });
      return {
        criticalAlerts: clinicalContext.criticalAlerts,
        currentCase: clinicalContext.currentCase ?? null,
        documents: clinicalContext.documents.slice(0, 8),
        patient: clinicalContext.patient ?? null,
        previousEcgs: clinicalContext.previousEcgs.slice(0, 6),
        reports: clinicalContext.reports.slice(0, 6),
      };
    }
    case "ecg_analyzer": {
      const attachment = attachmentById(ctx.attachments, typeof args.attachmentId === "string" ? args.attachmentId : undefined);
      if (!attachment) return { error: "no_ecg_attachment", focus: args.focus ?? "general" };
      const structured = analyzeAttachmentStructured(attachment);
      return { ...structured, focus: args.focus ?? "general", pipeline: "ecg" };
    }
    case "laboratory_analyzer": {
      const attachment = attachmentById(ctx.attachments, typeof args.attachmentId === "string" ? args.attachmentId : undefined);
      if (!attachment) return { error: "no_lab_attachment" };
      return analyzeAttachmentStructured(attachment);
    }
    case "radiology_reader": {
      const attachment = attachmentById(ctx.attachments, typeof args.attachmentId === "string" ? args.attachmentId : undefined);
      if (!attachment) return { error: "no_imaging_attachment" };
      return analyzeAttachmentStructured(attachment);
    }
    case "medical_ocr": {
      const attachment = attachmentById(ctx.attachments, typeof args.attachmentId === "string" ? args.attachmentId : undefined);
      if (!attachment) return { error: "no_attachment" };
      return {
        documentType: attachment.documentType ?? attachment.kind,
        extractedText: (attachment.extractedText ?? "").slice(0, 4000),
        name: attachment.originalName,
      };
    }
    case "clinical_calculator": {
      const calculator = String(args.calculator ?? "qtc");
      return {
        calculator,
        disclaimer: "Calculator output requires validated clinical inputs.",
        inputs: args.inputs ?? {},
        note: "Use validated inputs at bedside; this tool returns structured placeholder until wired to score engines.",
      };
    }
    default:
      return { error: "unknown_tool", name };
  }
}
