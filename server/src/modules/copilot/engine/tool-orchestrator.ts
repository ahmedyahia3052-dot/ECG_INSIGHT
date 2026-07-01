import type { ChatContextInput } from "../copilot-types";
import { resolveConversationContext } from "../context-resolver";
import {
  isFastPathFromPlan,
  routeTools,
  shouldRetrieveClinicalContextFromPlan,
  shouldRetrieveKnowledgeFromPlan,
  shouldRunEcgEngine,
  shouldRunOcr,
  shouldRunTool,
} from "../tool-router";
import type { ConversationPlan, CopilotTool, IntentClassificationResult } from "../smart-intent-types";
import type { ContextState, ToolPlan } from "./types";

export const ToolOrchestrator = {
  buildPlan(input: {
    attachments: Parameters<typeof resolveConversationContext>[0]["attachments"];
    chatInput: ChatContextInput;
    classification: IntentClassificationResult;
    contextState: ContextState;
    memory: Parameters<typeof resolveConversationContext>[0]["memory"];
    plan: ConversationPlan;
    question: string;
  }): ToolPlan {
    const context = resolveConversationContext({
      attachments: input.attachments,
      chatInput: input.chatInput,
      memory: input.memory,
    });
    const routed = routeTools(input.classification, context, input.chatInput);
    const tools: CopilotTool[] = input.classification.requiresClarification ? ["no_tool"] : [...routed.tools];

    if (input.classification.requiresClarification) {
      return {
        runClinicalContext: false,
        runDrugDatabase: false,
        runEcgEngine: false,
        runKnowledge: false,
        runOcr: false,
        runPatientDatabase: false,
        runReportGenerator: false,
        tools: ["no_tool"],
      };
    }

    const runKnowledge = shouldRetrieveKnowledgeFromPlan(tools, input.question, input.classification.primaryIntent);
    const runClinicalContext = shouldRetrieveClinicalContextFromPlan(tools, input.chatInput);
    const runEcgEngine = shouldRunEcgEngine(tools, context) && (input.contextState.hasUploadedEcg || input.contextState.hasActiveCase);
    const runPatientDatabase = shouldRunTool("patient_database", tools) && (input.contextState.hasActivePatient || Boolean(input.chatInput.patientId));
    const runOcr = shouldRunOcr(tools, context) && (input.contextState.hasUploadedFiles || input.contextState.hasUploadedImages);
    const runDrugDatabase = shouldRunTool("drug_database", tools) && runKnowledge;
    const runReportGenerator = shouldRunTool("report_generator", tools) && (input.contextState.hasActiveCase || input.contextState.hasActivePatient);

    if (isFastPathFromPlan(tools)) {
      return {
        runClinicalContext: false,
        runDrugDatabase: false,
        runEcgEngine: false,
        runKnowledge: false,
        runOcr: false,
        runPatientDatabase: false,
        runReportGenerator: false,
        tools,
      };
    }

    return {
      runClinicalContext,
      runDrugDatabase,
      runEcgEngine,
      runKnowledge,
      runOcr,
      runPatientDatabase,
      runReportGenerator,
      tools,
    };
  },
};
