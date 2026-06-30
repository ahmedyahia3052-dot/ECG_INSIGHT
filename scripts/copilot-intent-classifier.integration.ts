import { runIntentPipeline } from "../server/src/modules/copilot/intent-pipeline";
import { shouldRunTool } from "../server/src/modules/copilot/tool-router";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const emptyMemory = { attachments: [], summary: "", turns: [] };

type CaseSpec = {
  expectClarification?: boolean;
  expectIntent: string;
  expectTools?: string[];
  forbidTools?: string[];
  question: string;
};

const cases: CaseSpec[] = [
  { expectIntent: "greeting", forbidTools: ["knowledge_search", "patient_database", "ecg_ai"], question: "Hi" },
  { expectIntent: "greeting", forbidTools: ["knowledge_search", "patient_database", "ecg_ai"], question: "Hello" },
  { expectIntent: "small_talk", forbidTools: ["knowledge_search", "patient_database", "ecg_ai"], question: "How are you?" },
  { expectIntent: "thanks", forbidTools: ["knowledge_search", "patient_database", "ecg_ai"], question: "Thank you" },
  { expectIntent: "goodbye", forbidTools: ["knowledge_search", "patient_database", "ecg_ai"], question: "Goodbye" },
  { expectIntent: "ecg_interpretation", expectClarification: true, expectTools: ["no_tool"], question: "Interpret this ECG" },
  { expectIntent: "ecg_interpretation", expectClarification: true, expectTools: ["no_tool"], question: "Analyze this ECG" },
  { expectIntent: "explain_medical_concept", expectTools: ["knowledge_search"], question: "Explain STEMI" },
  { expectIntent: "explain_medical_concept", expectTools: ["knowledge_search"], question: "Explain QT interval" },
  { expectIntent: "patient_lookup", expectTools: ["patient_database"], question: "Open Ahmed Patient" },
  { expectIntent: "summarize", question: "Summarize today's ECG" },
  { expectIntent: "report_generation", expectTools: ["report_generator"], question: "Generate report" },
  { expectIntent: "drug_information", expectTools: ["drug_database", "knowledge_search"], question: "Is amiodarone safe?" },
  { expectIntent: "fitness_for_work", expectTools: ["knowledge_search"], question: "Can I return to work after MI?" },
];

for (const item of cases) {
  const pipeline = runIntentPipeline({ attachments: [], chatInput: {}, memory: emptyMemory, question: item.question });
  assert(pipeline.classification.primaryIntent === item.expectIntent, `${item.question}: expected intent ${item.expectIntent}, got ${pipeline.classification.primaryIntent}`);
  assert(pipeline.classification.executionTimeMs < 30, `${item.question}: classifier took ${pipeline.classification.executionTimeMs}ms`);
  if (item.expectClarification !== undefined) {
    assert(pipeline.classification.requiresClarification === item.expectClarification, `${item.question}: clarification mismatch`);
  }
  for (const tool of item.forbidTools ?? []) {
    assert(!shouldRunTool(tool as never, pipeline.plan.tools), `${item.question}: forbidden tool ${tool} was selected (${pipeline.plan.tools.join(", ")})`);
  }
  for (const tool of item.expectTools ?? []) {
    assert(shouldRunTool(tool as never, pipeline.plan.tools), `${item.question}: expected tool ${tool}, got ${pipeline.plan.tools.join(", ")}`);
  }
}

const multiIntent = runIntentPipeline({
  attachments: [{ analysisSummary: null, confidence: null, documentType: "ECG_PDF", extractedText: null, kind: "ecg", medicalAnalysis: null, mimeType: "application/pdf", originalName: "tracing.pdf", recommendations: [], sizeBytes: 1000, warnings: [] }],
  chatInput: {},
  memory: emptyMemory,
  question: "Interpret this ECG and summarize the findings.",
});
assert(multiIntent.classification.intents.some((entry) => entry.intent === "ecg_interpretation"), "Multi-intent must include ECG interpretation.");
assert(multiIntent.classification.intents.some((entry) => entry.intent === "summarize"), "Multi-intent must include summarize.");
assert(multiIntent.plan.steps.length >= 2, "Planner must create sequential steps for multi-intent requests.");

console.log("Smart intent classifier integration checks passed.");
