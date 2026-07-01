import type { ClinicalContext, KnowledgeHit } from "../../copilot-types";
import { retrieveRoutedKnowledge } from "../knowledge-retrieval";
import type { KnowledgeRoute } from "../types";
import type { ReasoningResult } from "./types";

function sourcesForReasoning(reasoning: ReasoningResult) {
  if (!reasoning.needsKnowledge) return [];
  if (reasoning.educationalMode) return ["cardiology_kb", "internal_knowledge_base"] as const;
  if (reasoning.mode === "emergency") return ["cardiology_kb", "esc_guidelines", "aha_guidelines"] as const;
  if (/\b(drug|medication|dose|interaction|warfarin|amiodarone|statin)\b/i.test(reasoning.knowledgeQuery)) {
    return ["drug_database", "cardiology_kb"] as const;
  }
  if (/\b(guideline|esc|aha|acc|nice|protocol)\b/i.test(reasoning.knowledgeQuery)) {
    return ["esc_guidelines", "aha_guidelines", "cardiology_kb"] as const;
  }
  if (/\b(ecg|ekg|qrs|qtc|rhythm|stemi)\b/i.test(reasoning.knowledgeQuery)) {
    return ["ecg_database", "cardiology_kb"] as const;
  }
  return ["cardiology_kb", "internal_knowledge_base"] as const;
}

export const KnowledgeRetrieval = {
  route(reasoning: ReasoningResult): KnowledgeRoute {
    return {
      query: reasoning.knowledgeQuery,
      sources: [...sourcesForReasoning(reasoning)],
    };
  },

  async fetch(reasoning: ReasoningResult, clinicalContext: ClinicalContext): Promise<{ hits: KnowledgeHit[]; route: KnowledgeRoute }> {
    if (!reasoning.needsKnowledge) return { hits: [], route: { query: reasoning.knowledgeQuery, sources: [] } };
    const route = this.route(reasoning);
    const hits = await retrieveRoutedKnowledge(route, clinicalContext);
    return { hits, route };
  },
};
