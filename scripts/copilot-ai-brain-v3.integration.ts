import { ConversationStateManager, runAiBrainV3 } from "../server/src/modules/copilot/brain";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const emptyMemory = { attachments: [], summary: "", turns: [] };

function brain(question: string, attachments: Parameters<typeof runAiBrainV3>[0]["attachments"] = [], memory = emptyMemory, chatInput: Parameters<typeof runAiBrainV3>[0]["chatInput"] = {}) {
  ConversationStateManager.resetForTests();
  return runAiBrainV3({ attachments, chatInput, memory, question });
}

const conversationalCases = ["Hi", "Hello", "How are you?", "Who are you?", "Thank you", "Goodbye"];
for (const question of conversationalCases) {
  const result = brain(question);
  assert(result.decision.conversationalOnly, `${question} must stay conversational`);
  assert(!result.decision.runKnowledgeSearch, `${question} must not search knowledge`);
  assert(!result.decision.runPatientDatabase, `${question} must not query patient DB`);
  assert(result.executionTimeMs < 50, `${question} brain latency ${result.executionTimeMs}ms`);
}

const ecgNoUpload = brain("Interpret this ECG");
assert(ecgNoUpload.classification.requiresClarification, "Interpret ECG without upload requires clarification");
assert(!ecgNoUpload.decision.runEcgEngine, "No ECG engine without upload");

const stemi = brain("Explain STEMI");
assert(stemi.decision.runKnowledgeSearch, "Explain STEMI must search knowledge");
assert(stemi.decision.isClinical, "Explain STEMI is clinical");

const af = brain("Explain AF");
assert(af.decision.runKnowledgeSearch, "Explain AF must search knowledge");

const patient = brain("Open Ahmed Patient");
assert(patient.decision.runPatientDatabase, "Open patient must use patient database");
assert(patient.classification.entities.patientNames.some((name) => /ahmed/i.test(name)), "Should extract patient name Ahmed");

const report = brain("Generate report");
assert(report.decision.runReportGenerator, "Generate report must plan report generator");

const compare = brain(
  "Compare this ECG with previous ECG and generate a report",
  [{ analysisSummary: null, confidence: null, documentType: "ECG_PDF", extractedText: null, kind: "ecg", medicalAnalysis: null, mimeType: "application/pdf", originalName: "tracing.pdf", recommendations: [], sizeBytes: 1000, warnings: [] }],
);
assert(compare.classification.intents.some((entry) => entry.intent === "ecg_comparison" || entry.intent === "report_generation"), "Multi-tool compare/report intents required");
assert(compare.clinicalPlan.steps.some((step) => step.action === "compare_ecg" || step.action === "generate_report" || step.action === "run_ecg_engine"), "Multi-tool compare/report plan required");

const drug = brain("Is amiodarone safe with warfarin?");
assert(drug.decision.runDrugDatabase || drug.decision.runKnowledgeSearch, "Drug question must use drug or knowledge tools");

const guideline = brain("What does ESC guideline recommend for AF?");
assert(guideline.decision.runGuidelines || guideline.decision.runKnowledgeSearch, "Guideline question must use guidelines or knowledge");

const emergency = brain("Patient has chest pain and ST elevation");
assert(emergency.decision.emergencyEscalation, "Emergency scenario must escalate internally");

const memoryTurns = {
  attachments: [],
  summary: "user: Patient is 67 years old.",
  turns: [
    { role: "user", content: "Patient is 67 years old." },
    { role: "assistant", content: "Understood." },
  ],
};
const followUp = brain("What medication would you recommend?", [], memoryTurns);
assert(followUp.memoryState.currentPatientAge === 67, "Brain must remember patient age across turns");
assert(followUp.decision.isClinical, "Follow-up medication question is clinical");

const multiIntent = brain(
  "Interpret this ECG and summarize the findings.",
  [{ analysisSummary: null, confidence: null, documentType: "ECG_PDF", extractedText: null, kind: "ecg", medicalAnalysis: null, mimeType: "application/pdf", originalName: "tracing.pdf", recommendations: [], sizeBytes: 1000, warnings: [] }],
);
assert(multiIntent.clinicalPlan.steps.length >= 2, "Multi-intent must produce sequential clinical plan");
assert(multiIntent.decision.decisionPath.includes("planner"), "Decision path must include planner");

const performanceSamples = Array.from({ length: 20 }, () => brain("Hello").executionTimeMs);
const average = performanceSamples.reduce((sum, value) => sum + value, 0) / performanceSamples.length;
assert(average < 30, `Average brain latency ${average.toFixed(1)}ms exceeds 30ms target`);

console.log("AI Brain V3 integration checks passed.");
