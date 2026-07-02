import type { ClinicalContext, KnowledgeHit } from "../copilot-types";
import { KnowledgeService } from "../../knowledge-engine";
import type { KnowledgeRoute } from "./types";

export async function retrieveRoutedKnowledge(route: KnowledgeRoute, context: ClinicalContext): Promise<KnowledgeHit[]> {
  const contextTerms = [
    context.currentCase?.diagnosis,
    context.currentCase?.doctorDiagnosis,
    context.currentCase?.rhythm,
    context.currentCase?.severity,
    ...context.previousEcgs,
    ...context.reports,
    ...context.criticalAlerts,
  ].filter(Boolean) as string[];

  return KnowledgeService.searchRouted(route, contextTerms);
}
