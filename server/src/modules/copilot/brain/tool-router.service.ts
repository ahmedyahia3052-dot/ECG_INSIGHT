export {
  isFastPathFromPlan,
  routeTools,
  shouldRetrieveClinicalContextFromPlan,
  shouldRetrieveKnowledgeFromPlan,
  shouldRunEcgEngine,
  shouldRunOcr,
  shouldRunTool,
} from "../tool-router";

export const BrainToolRouter = {
  version: "v3" as const,
};
