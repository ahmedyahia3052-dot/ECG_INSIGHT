export { clinicalDecisionSupportRouter } from "./clinical-decision-support.routes";
export {
  acceptRecommendation,
  generateFollowUpForCase,
  getFollowUpForCase,
  listRecommendationsForCase,
  regenerateRecommendationsForCase,
  rejectRecommendation,
  seedDecisionSupportRules,
} from "./clinical-decision-support.service";
export { generateClinicalRecommendations } from "./recommendation-engine";
export { generateFollowUpPlan } from "./follow-up-engine";
export { DEFAULT_DECISION_SUPPORT_RULES, RECOMMENDATION_CATALOG } from "./decision-rules";
export { CLINICAL_DECISION_SUPPORT_VERSION } from "./types";
export type {
  DecisionSupportEvaluationInput,
  GeneratedFollowUpDto,
  GeneratedRecommendationDto,
  SerializedCaseClinicalRecommendation,
  SerializedFollowUpPlan,
} from "./types";
