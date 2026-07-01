import type { EngineInput, EngineResult } from "../engine/types";
import { CLINICAL_AI_ENGINE_VERSION } from "../engine/types";
import type { V3PipelineDeps, V3PipelineInput, V3PipelineResult, V3StreamCallbacks } from "./types";
import { MEDICAL_ASSISTANT_V3_SYSTEM_PROMPT } from "./system-prompt";
import { buildConversationMessages } from "./session-memory";
import { analyzeAttachmentsStructured } from "./tools/document-analyzer";
import { executeCopilotTool } from "./tools/executor";
import type { ApiMessage } from "./llm-provider";
import { runLlmWithTools } from "./llm-provider";

function buildContextBlock(input: V3PipelineInput): string | null {
  const blocks: string[] = [];
  if (input.clinicianName) blocks.push(`Clinician: ${input.clinicianName}`);
  if (input.voiceMode) blocks.push("The user is in voice conversation mode — keep responses concise and speakable.");
  if (input.attachments.length) {
    const structured = analyzeAttachmentsStructured(input.attachments);
    blocks.push(`Structured upload analysis (JSON — explain naturally to the user, do not dump raw JSON):\n${JSON.stringify(structured, null, 2)}`);
  }
  return blocks.length ? blocks.join("\n\n") : null;
}

export async function runClinicalAiV3(
  input: V3PipelineInput,
  deps: V3PipelineDeps,
  callbacks: V3StreamCallbacks = {},
): Promise<V3PipelineResult> {
  callbacks.onStatus?.("Understanding your request...");

  const messages: ApiMessage[] = [{ content: MEDICAL_ASSISTANT_V3_SYSTEM_PROMPT, role: "system" }];
  const contextBlock = buildContextBlock(input);
  if (contextBlock) {
    messages.push({ content: contextBlock, role: "system" });
  }
  messages.push(...buildConversationMessages(input.memory, input.question).map((message) => ({
    content: message.content,
    role: message.role,
  })));

  const result = await runLlmWithTools({
    messages,
    onStatus: callbacks.onStatus,
    onToken: callbacks.onToken,
    runTool: (name, argsJson) => executeCopilotTool(name, argsJson, {
      attachments: input.attachments,
      chatInput: input.chatInput,
      retrieveClinicalContext: deps.retrieveClinicalContext,
    }),
  });

  return {
    content: result.content.trim(),
    model: result.model,
    toolCallsUsed: result.toolCallsUsed,
  };
}

export function toV3EngineResult(input: EngineInput, pipeline: V3PipelineResult, executionTimeMs: number): EngineResult {
  return {
    classification: {
      confidence: 0.9,
      emergencyPriority: "NONE",
      entities: {
        ages: [], dates: [], diseases: [], drugs: [], ecgFindings: [], genders: [], heartRates: [],
        occupations: [], patientNames: [], prIntervals: [], qrsDurations: [], qtValues: [], reportTypes: [],
        rhythms: [], riskFactors: [],
      },
      executionTimeMs,
      intents: [{ confidence: 0.9, intent: "general_medical_question", reason: "v3-llm" }],
      normalizedQuestion: input.question,
      primaryIntent: "general_medical_question",
      primaryMedicalIntent: "general_medical_question",
      requiresClarification: false,
    },
    communicationIntent: "MedicalQuestion",
    context: {
      activeTopic: null,
      entityMemory: { ages: [], diseases: [], drugs: [], patientNames: [] },
      hasActiveCase: Boolean(input.chatInput.caseId),
      hasActivePatient: Boolean(input.chatInput.patientId),
      hasUploadedEcg: input.attachments.some((item) => item.kind === "ecg"),
      hasUploadedFiles: input.attachments.length > 0,
      hasUploadedImages: input.attachments.some((item) => item.kind === "image" || item.kind === "camera"),
      resolvedQuestion: input.question,
      topicStack: [],
    },
    conversationState: {
      conversationId: input.conversationId,
      conversationSummary: input.memory.summary,
      currentTopic: null,
      educationalMode: false,
      educationalTopic: "none",
      entities: { ages: [], diseases: [], drugs: [], patientNames: [] },
      isFollowUp: input.memory.turns.length >= 2,
      lastIntent: "MedicalQuestion",
      learningStep: 0,
      previousTopic: null,
      topicStack: [],
      turnCount: input.memory.turns.length + 1,
      voiceActive: Boolean(input.voiceMode),
      voiceStatus: input.voiceMode ? "thinking" : "idle",
    },
    executionTimeMs,
    intentConfidence: 0.9,
    knowledgeDomain: {
      confidence: 0.9,
      domain: "clinical_reasoning",
      educationalMode: false,
      educationalTopic: "none",
      learningStep: 0,
      reason: "v3-llm",
    },
    knowledgeHits: [],
    knowledgeRoute: { query: input.question, sources: pipeline.toolCallsUsed.includes("medical_knowledge_search") ? ["cardiology_kb"] : [] },
    medicalIntent: "general_medical_question",
    plan: { allowBullets: false, maxParagraphs: 6, style: "conversational", suggestFollowUps: true },
    requiresClarification: false,
    response: { content: pipeline.content },
    sessionTurnCount: input.memory.turns.length + 1,
    tag: "Clinical Summary",
    toolPlan: {
      runClinicalContext: pipeline.toolCallsUsed.includes("patient_record_retrieval"),
      runDrugDatabase: pipeline.toolCallsUsed.includes("drug_database"),
      runEcgEngine: pipeline.toolCallsUsed.includes("ecg_analyzer"),
      runKnowledge: pipeline.toolCallsUsed.some((tool) => tool.includes("knowledge") || tool.includes("guidelines") || tool.includes("search")),
      runOcr: pipeline.toolCallsUsed.includes("medical_ocr"),
      runPatientDatabase: pipeline.toolCallsUsed.includes("patient_record_retrieval"),
      runReportGenerator: false,
      tools: (pipeline.toolCallsUsed.length ? pipeline.toolCallsUsed : ["conversation"]) as import("../smart-intent-types").CopilotTool[],
    },
  };
}

export { CLINICAL_AI_ENGINE_VERSION };
