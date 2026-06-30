import { composeConversationalResponse } from "../server/src/modules/copilot/conversational-engine";
import { CONVERSATION_SYSTEM_PROMPT } from "../server/src/modules/copilot/conversation-system-prompt";
import {
  classifyMedicalIntent,
  greetingResponse,
  helpRequestResponse,
  isEcgUploadPendingInterpretation,
  shouldRetrieveKnowledge,
} from "../server/src/modules/copilot/intent-manager";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const emptyMemory = { attachments: [], summary: "", turns: [] };

function mockKnowledge(question: string) {
  if (/qt/i.test(question)) {
    return [{ category: "ECG", content: "Prolonged QT prolongation increases torsades de pointes risk; review medications, electrolytes, and congenital causes.", id: "qt", references: ["ESC"], relevanceScore: 0.82, sourceName: "ESC", tags: ["qt"], topic: "Prolonged QT" }];
  }
  if (/stemi|st elevation/i.test(question)) {
    return [{ category: "ECG", content: "ST elevation myocardial infarction requires urgent reperfusion assessment.", id: "stemi", references: ["ESC"], relevanceScore: 0.8, sourceName: "ESC", tags: ["stemi"], topic: "STEMI" }];
  }
  if (/atrial fibrillation|\baf\b/i.test(question)) {
    return [{ category: "ECG", content: "Atrial fibrillation is an irregular rhythm that increases stroke risk and may need rate control or anticoagulation.", id: "af", references: ["ESC"], relevanceScore: 0.8, sourceName: "ESC", tags: ["af"], topic: "Atrial fibrillation" }];
  }
  return [];
}

function reply(question: string, attachments: Parameters<typeof classifyMedicalIntent>[1] = [], memory = emptyMemory) {
  const intent = classifyMedicalIntent(question, attachments, memory);
  const knowledge = shouldRetrieveKnowledge({ attachments, intent, question }) ? mockKnowledge(question) : [];
  return composeConversationalResponse({
    attachments,
    clinicianName: "Ahmed Yahia",
    context: { criticalAlerts: [], documents: [], previousEcgs: [], reports: [], sources: [] },
    intent,
    knowledge,
    memory,
    question,
  }).content;
}

assert(CONVERSATION_SYSTEM_PROMPT.includes("ECG Insight AI Clinical Copilot"), "System prompt must define copilot identity.");
assert(CONVERSATION_SYSTEM_PROMPT.includes("Never reveal"), "System prompt must forbid exposing internal mechanics.");

const hi = reply("Hi");
assert(/Hello|Good (morning|afternoon|evening)|How can I help/i.test(hi), `Greeting should be natural: ${hi}`);
assert(!/QT|qtc|abnormal/i.test(hi), "Greeting must not include clinical dump.");

const help = reply("I need your help");
assert(/Of course|I'm here to help|Tell me what you need/i.test(help), `Help request should be supportive: ${help}`);
assert(!/QT|STEMI|atrial fibrillation/i.test(help), "Help request must not include clinical content.");

const stemi = reply("Explain STEMI");
assert(/stemi|st elevation|infarction|reperfusion/i.test(stemi.toLowerCase()), `STEMI answer should be clinical: ${stemi}`);
assert(!/^##/m.test(stemi), "Medical answers must not use report headings.");

const qt = reply("Explain prolonged QT");
assert(/qt|qtc|torsades|electrolyte|medication/i.test(qt.toLowerCase()), `QT answer should be clinical: ${qt}`);

const memory = {
  attachments: [],
  summary: "user: My patient is 58 years old.",
  turns: [
    { role: "user", content: "My patient is 58 years old." },
    { role: "assistant", content: "Understood." },
  ],
};
const followUp = reply("What treatment would you consider?", [], memory);
assert(/58|year|patient|treatment|next step/i.test(followUp.toLowerCase()), `Follow-up should use patient context: ${followUp}`);

const ecgUpload = composeConversationalResponse({
  attachments: [{ analysisSummary: null, confidence: null, documentType: "ECG_PDF", extractedText: null, kind: "ecg", medicalAnalysis: null, mimeType: "application/pdf", originalName: "tracing.pdf", recommendations: [], sizeBytes: 1000, warnings: [] }],
  clinicianName: "Ahmed Yahia",
  context: { criticalAlerts: [], documents: [], previousEcgs: [], reports: [], sources: [] },
  intent: "upload_analysis",
  knowledge: [],
  memory: emptyMemory,
  question: "Here is the ECG",
}).content;
assert(/received the ecg|analyzing it now/i.test(ecgUpload), `ECG upload ack expected: ${ecgUpload}`);
assert(isEcgUploadPendingInterpretation("Here is the ECG", [{ kind: "ecg", documentType: "ECG_PDF", originalName: "tracing.pdf" } as never]), "Pending ECG upload should be detected.");

assert(/atrial fibrillation|stroke|irregular/i.test(reply("Tell me about atrial fibrillation").toLowerCase()), "AF question should produce natural medical prose.");

console.log("Copilot conversation pipeline integration checks passed.");
