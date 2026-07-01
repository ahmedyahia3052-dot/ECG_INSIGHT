import type { BrainInput, ClinicalExecutionPlan, ClinicalExecutionStep, ClinicalPlanAction } from "./brain-types";
import type { ConversationContextSnapshot } from "./conversation-context.service";
import type { ConversationPlan, CopilotTool, SmartIntent } from "../smart-intent-types";

const ACTION_LABELS: Record<ClinicalPlanAction, string> = {
  compare_ecg: "Compare with previous ECG",
  extract_findings: "Extract findings from uploaded material",
  generate_report: "Generate clinical report draft",
  generate_summary: "Generate summary",
  lookup_guidelines: "Review clinical guidelines",
  lookup_patient: "Look up patient record",
  respond: "Compose natural response",
  run_drug_check: "Review drug information and interactions",
  run_ecg_engine: "Run ECG analysis engine",
  run_knowledge_search: "Search medical knowledge base",
  run_ocr: "Extract text from uploaded documents",
};

function actionsForTool(tool: CopilotTool, intent: SmartIntent): ClinicalPlanAction[] {
  switch (tool) {
    case "no_tool": return ["respond"];
    case "conversation": return ["respond"];
    case "knowledge_search": return ["run_knowledge_search", "respond"];
    case "drug_database": return ["run_drug_check", "run_knowledge_search", "respond"];
    case "guidelines": return ["lookup_guidelines", "respond"];
    case "ecg_ai": return intent === "ecg_comparison" ? ["compare_ecg", "run_ecg_engine", "respond"] : ["run_ecg_engine", "extract_findings", "respond"];
    case "ocr": return ["run_ocr", "extract_findings", "respond"];
    case "image_analysis": return ["run_ocr", "extract_findings", "respond"];
    case "patient_database": return ["lookup_patient", "respond"];
    case "report_generator": return ["generate_report", "respond"];
    default: return ["respond"];
  }
}

function dedupeSteps(steps: ClinicalExecutionStep[]) {
  const seen = new Set<string>();
  return steps.filter((step) => {
    const key = `${step.action}:${step.tool}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((step, index) => ({ ...step, order: index + 1 }));
}

export const ClinicalPlanner = {
  build(plan: ConversationPlan, context: ConversationContextSnapshot, input: BrainInput): ClinicalExecutionPlan {
    const steps: ClinicalExecutionStep[] = [];
    for (const plannerStep of plan.steps) {
      for (const tool of plannerStep.tools) {
        for (const action of actionsForTool(tool, plannerStep.intent)) {
          steps.push({
            action,
            description: ACTION_LABELS[action],
            order: steps.length + 1,
            tool,
          });
        }
      }
    }
    if (/summarize/.test(input.question.toLowerCase()) && !steps.some((step) => step.action === "generate_summary")) {
      steps.unshift({
        action: "generate_summary",
        description: ACTION_LABELS.generate_summary,
        order: 1,
        tool: "conversation",
      });
    }
    const normalized = dedupeSteps(steps.length ? steps : [{ action: "respond", description: ACTION_LABELS.respond, order: 1, tool: "no_tool" }]);
    const description = normalized
      .filter((step) => step.action !== "respond")
      .map((step) => step.description)
      .join(" → ") || "Respond conversationally without external tools";
    return { description, steps: normalized };
  },
};
