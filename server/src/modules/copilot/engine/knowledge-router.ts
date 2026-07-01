import type { CommunicationIntent, ContextState, KnowledgeRoute, ToolPlan } from "./types";

export const KnowledgeRouter = {
  route(intent: CommunicationIntent, context: ContextState, toolPlan: ToolPlan, query: string): KnowledgeRoute {
    void context;
    const sources: KnowledgeRoute["sources"] = [];
    if (toolPlan.runKnowledge) {
      sources.push("cardiology_kb", "internal_knowledge_base");
      if (intent === "GuidelineSearch") sources.push("esc_guidelines", "aha_guidelines");
      if (intent === "DrugInformation") sources.push("drug_database");
      if (intent === "ECGAnalysis" || intent === "ImageInterpretation") sources.push("ecg_database");
    }
    return { query, sources: [...new Set(sources)] };
  },
};
