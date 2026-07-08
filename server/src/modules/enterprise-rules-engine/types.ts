import type {
  EnterpriseRuleActionType,
  EnterpriseRuleField,
  EnterpriseRuleLogic,
  EnterpriseRuleOperator,
  EnterpriseRuleStatus,
} from "@prisma/client";

export const ENTERPRISE_RULES_ENGINE_VERSION = "sprint67-enterprise-rules-engine/1.0.0";

export type RuleConditionInput = {
  boolValue?: boolean;
  field: EnterpriseRuleField;
  groupId?: string;
  groupLogic?: EnterpriseRuleLogic;
  operator: EnterpriseRuleOperator;
  sortOrder?: number;
  stringValue?: string;
  threshold?: number;
};

export type RuleActionInput = {
  actionType: EnterpriseRuleActionType;
  payload?: Record<string, unknown>;
  sortOrder?: number;
};

export type CreateClinicalRuleInput = {
  actions: RuleActionInput[];
  category: string;
  conditionRootLogic?: EnterpriseRuleLogic;
  conditions: RuleConditionInput[];
  description: string;
  enabled?: boolean;
  name: string;
  organizationId?: string;
  priority?: number;
  ruleKey: string;
  status?: EnterpriseRuleStatus;
};

export type UpdateClinicalRuleInput = Partial<Omit<CreateClinicalRuleInput, "ruleKey">> & {
  changeNotes?: string;
};

export type RuleEvaluationContext = {
  afDetected: boolean;
  bbbDetected: boolean;
  clinicalPriority: string;
  heartRate: number;
  prIntervalMs: number;
  pvcCount: number;
  qrsDurationMs: number;
  qtIntervalMs: number;
  qtcBazettMs: number;
  riskScore: number;
  stDeviationMm: number;
  stElevationMm: number;
};

export type EvaluatedCondition = {
  field: EnterpriseRuleField;
  matched: boolean;
  observed: string | number | boolean;
  operator: EnterpriseRuleOperator;
  threshold?: string;
};

export type RuleEvaluationResult = {
  actions: Array<{ actionType: EnterpriseRuleActionType; payload?: Record<string, unknown> }>;
  conditionResults: EvaluatedCondition[];
  matched: boolean;
  ruleId: string;
  ruleKey: string;
  ruleName: string;
  ruleVersion: number;
};

export type SerializedClinicalRule = {
  actions: Array<{ actionType: EnterpriseRuleActionType; id: string; payload?: Record<string, unknown>; sortOrder: number }>;
  category: string;
  conditionRootLogic: EnterpriseRuleLogic;
  conditions: Array<{
    boolValue?: boolean;
    field: EnterpriseRuleField;
    groupId: string;
    groupLogic: EnterpriseRuleLogic;
    id: string;
    operator: EnterpriseRuleOperator;
    sortOrder: number;
    stringValue?: string;
    threshold?: number;
  }>;
  createdAt: string;
  createdById?: string;
  currentVersion: number;
  description: string;
  enabled: boolean;
  id: string;
  name: string;
  organizationId?: string;
  priority: number;
  ruleKey: string;
  status: EnterpriseRuleStatus;
  updatedAt: string;
};

export type SerializedRuleExecution = {
  caseId?: string;
  executedAt: string;
  executedById?: string;
  id: string;
  inputSnapshot: RuleEvaluationContext;
  matched: boolean;
  outputSnapshot?: {
    actions: RuleEvaluationResult["actions"];
    conditionResults: EvaluatedCondition[];
  };
  patientId?: string;
  ruleId: string;
  ruleKey?: string;
  ruleName?: string;
  ruleVersion: number;
  status: string;
};

export type SerializedRuleVersion = {
  changeNotes?: string;
  createdAt: string;
  createdById?: string;
  id: string;
  ruleId: string;
  snapshot: Record<string, unknown>;
  versionNumber: number;
};

export type SystemRuleTemplate = CreateClinicalRuleInput & { templateId: string };
