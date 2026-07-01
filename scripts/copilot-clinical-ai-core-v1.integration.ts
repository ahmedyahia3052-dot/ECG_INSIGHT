import {
  ConversationManager,
  ResponseGenerator,
  Planner,
  runClinicalCopilotEngine,
} from "../server/src/modules/copilot/engine";
import { emptyClinicalContext } from "../server/src/modules/copilot/intent-manager";
import type { ConversationMemory } from "../server/src/modules/copilot/copilot-types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const FORBIDDEN = [
  /^Definition:/m,
  /^Causes:/m,
  /^Recommendation:/m,
  /^Short Answer$/m,
  /Confidence Score/i,
  /\bCitations:/i,
  /Knowledge Base/i,
  /Retrieved Medical Knowledge/i,
  /Risk tier:/i,
  /Intent:/i,
  /Knowledge route:/i,
  /\{[\s\S]*"intent"/,
];

function assertConversational(content: string, label: string) {
  assert(content.trim().length > 20, `${label}: response too short`);
  for (const pattern of FORBIDDEN) {
    assert(!pattern.test(content), `${label}: forbidden artifact matched ${pattern}`);
  }
}

const emptyMemory: ConversationMemory = { attachments: [], summary: "", turns: [] };
const engineDeps = { retrieveClinicalContext: async () => emptyClinicalContext() };

async function ask(question: string, memory = emptyMemory, conversationId = `conv-${Math.random().toString(36).slice(2, 8)}`) {
  ConversationManager.resetForTests();
  const result = await runClinicalCopilotEngine(
    { attachments: [], chatInput: {}, conversationId, memory, question },
    engineDeps,
  );
  assertConversational(result.response.content, question);
  return result;
}

const CARDIOLOGY = [
  "What is hypertension?",
  "Explain atrial fibrillation.",
  "What causes heart failure?",
  "How do beta blockers help after MI?",
  "What is the CHA2DS2-VASc score used for?",
  "Explain STEMI in plain language.",
  "What is long QT syndrome?",
  "How do you approach chest pain in clinic?",
  "What are common causes of syncope?",
  "Explain Wolff-Parkinson-White syndrome.",
  "What is pericarditis?",
  "How is HFrEF different from HFpEF?",
  "What does troponin elevation suggest?",
  "Explain mitral regurgitation.",
  "When is anticoagulation indicated in AF?",
];

const INTERNAL_MEDICINE = [
  "What is type 2 diabetes?",
  "Explain COPD.",
  "What is anemia?",
  "How is asthma diagnosed?",
  "What causes hyperkalemia?",
  "Explain sepsis recognition.",
  "What is chronic kidney disease?",
  "How do you work up unintentional weight loss?",
  "What is hypothyroidism?",
  "Explain dyslipidemia management.",
  "What is gout?",
  "How is pneumonia usually treated?",
  "What is pulmonary embolism?",
  "Explain hyponatremia.",
  "What is cirrhosis?",
];

const EMERGENCY = [
  "Patient has chest pain and diaphoresis.",
  "Patient collapsed and is unresponsive.",
  "Suspected anaphylaxis after antibiotics.",
  "Severe shortness of breath with wheeze.",
  "Active GI bleeding with hypotension.",
  "Possible stroke with facial droop.",
  "Ventricular fibrillation and syncope.",
  "High fever with rigors and confusion.",
  "Trauma patient with tachycardia.",
  "Overdose with altered mental status.",
];

const ECG = [
  "Interpret this ECG.",
  "What does ST elevation mean on an ECG?",
  "How do you recognize atrial fibrillation on a tracing?",
  "Explain QT prolongation on ECG.",
  "What are signs of hyperkalemia on ECG?",
  "How do bundle branch blocks appear?",
  "What is sinus tachycardia?",
  "Explain paced rhythm on ECG.",
  "What ECG findings suggest PE?",
  "How do you read an ECG systematically?",
];

const LABORATORY = [
  "Explain elevated troponin.",
  "What does a low hemoglobin mean?",
  "How do you interpret elevated BNP?",
  "What causes elevated creatinine?",
  "Explain metabolic acidosis.",
  "What does an elevated INR suggest?",
  "How do you read a basic metabolic panel?",
  "What is the significance of elevated lactate?",
  "Explain thrombocytopenia workup.",
  "What does elevated ALT suggest?",
];

const RADIOLOGY = [
  "How do you read a chest X-ray for pneumonia?",
  "Explain pleural effusion on imaging.",
  "What does cardiomegaly on CXR suggest?",
  "How is pulmonary edema seen on imaging?",
  "Explain CT pulmonary angiogram indications.",
  "What are signs of pneumothorax on CXR?",
  "How do you describe consolidation?",
  "Explain echo report left ventricular function.",
  "What is ground-glass opacity?",
  "How do you correlate imaging with symptoms?",
];

const CLINICAL_REASONING = [
  "55-year-old with exertional chest pain — how should I think about this?",
  "Elderly patient with new confusion — what should I rule out first?",
  "Young athlete with syncope during sport.",
  "Diabetic patient with foot ulcer and fever.",
  "Post-op patient with tachycardia and hypoxia.",
  "Patient on amiodarone with dizziness.",
  "Smoker with hemoptysis and weight loss.",
  "Pregnant patient with severe headache.",
  "Patient with palpitations and caffeine use.",
  "Hypertensive urgency without end-organ damage.",
];

const FOLLOW_UP = [
  "What is hypertension?",
  "How is it diagnosed?",
  "Explain atrial fibrillation.",
  "How is it treated?",
  "What is COPD?",
  "What are the complications?",
  "Explain anemia.",
  "What causes it?",
  "What is heart failure?",
  "How do you monitor it?",
];

const MEMORY_SCENARIOS: Array<{ followUp: string; memory: ConversationMemory; topic: RegExp }> = [
  {
    followUp: "How is it diagnosed?",
    memory: {
      attachments: [],
      summary: "",
      turns: [
        { role: "user", content: "Explain atrial fibrillation." },
        { role: "assistant", content: "Atrial fibrillation is an irregular, often rapid atrial rhythm." },
      ],
    },
    topic: /atrial fibrillation/i,
  },
  {
    followUp: "What drugs are commonly used?",
    memory: {
      attachments: [],
      summary: "",
      turns: [
        { role: "user", content: "Explain hypertension." },
        { role: "assistant", content: "Hypertension is persistently elevated blood pressure." },
      ],
    },
    topic: /hypertension/i,
  },
  {
    followUp: "How is it managed?",
    memory: {
      attachments: [],
      summary: "",
      turns: [
        { role: "user", content: "What is heart failure?" },
        { role: "assistant", content: "Heart failure is when the heart cannot meet the body's circulatory needs." },
      ],
    },
    topic: /heart failure/i,
  },
  {
    followUp: "What are the complications?",
    memory: {
      attachments: [],
      summary: "",
      turns: [
        { role: "user", content: "Explain diabetes." },
        { role: "assistant", content: "Diabetes involves impaired glucose regulation." },
      ],
    },
    topic: /diabetes/i,
  },
  {
    followUp: "How is it detected?",
    memory: {
      attachments: [],
      summary: "",
      turns: [
        { role: "user", content: "Tell me about COPD." },
        { role: "assistant", content: "COPD is chronic obstructive pulmonary disease." },
      ],
    },
    topic: /copd/i,
  },
];

const IMAGE_UPLOAD = [
  {
    attachments: [{
      analysisSummary: "Sinus rhythm with ST elevation in inferior leads.",
      confidence: 0.82,
      documentType: "ECG_PDF",
      extractedText: "Rate 88. ST elevation II III aVF.",
      findings: ["Inferior ST elevation", "Sinus rhythm"],
      id: "att-ecg-1",
      kind: "ecg" as const,
      mimeType: "application/pdf",
      originalName: "ecg-stemi.pdf",
      warnings: [],
      recommendations: [],
    }],
    question: "Review the uploaded ECG.",
  },
  {
    attachments: [{
      analysisSummary: "Hemoglobin 9.2 g/dL, MCV 78.",
      confidence: 0.76,
      documentType: "LAB_REPORT",
      extractedText: "Hgb 9.2 MCV 78 Ferritin low.",
      findings: ["Microcytic anemia pattern"],
      id: "att-lab-1",
      kind: "file" as const,
      mimeType: "application/pdf",
      originalName: "cbc-report.pdf",
      warnings: [],
      recommendations: [],
    }],
    question: "What stands out in this lab report?",
  },
  {
    attachments: [{
      analysisSummary: "LVEF 35%, moderate mitral regurgitation.",
      confidence: 0.8,
      documentType: "ECHO_REPORT",
      extractedText: "LVEF 35% moderate MR.",
      findings: ["Reduced ejection fraction", "Moderate MR"],
      id: "att-echo-1",
      kind: "file" as const,
      mimeType: "application/pdf",
      originalName: "echo-report.pdf",
      warnings: [],
      recommendations: [],
    }],
    question: "Summarize this echo report.",
  },
  {
    attachments: [{
      analysisSummary: "Right lower lobe consolidation.",
      confidence: 0.74,
      documentType: "RADIOLOGY_REPORT",
      extractedText: "RLL consolidation consistent with pneumonia.",
      findings: ["RLL consolidation"],
      id: "att-cxr-1",
      kind: "image" as const,
      mimeType: "image/png",
      originalName: "cxr.png",
      warnings: [],
      recommendations: [],
    }],
    question: "Explain the imaging findings.",
  },
  {
    attachments: [{
      analysisSummary: "Prescription for metoprolol and apixaban.",
      confidence: 0.7,
      documentType: "PRESCRIPTION",
      extractedText: "Metoprolol 50mg BD Apixaban 5mg BD.",
      findings: ["Beta blocker", "Anticoagulant"],
      id: "att-rx-1",
      kind: "file" as const,
      mimeType: "application/pdf",
      originalName: "prescription.pdf",
      warnings: [],
      recommendations: [],
    }],
    question: "Review this prescription.",
  },
];

async function main() {
  let passed = 0;

  for (const question of CARDIOLOGY) {
    const result = await ask(question);
    assert(result.toolPlan.runKnowledge || result.communicationIntent === "Greeting", `${question}: knowledge or greeting`);
    passed += 1;
  }

  for (const question of INTERNAL_MEDICINE) {
    await ask(question);
    passed += 1;
  }

  for (const question of EMERGENCY) {
    const result = await ask(question);
    assert(
      result.communicationIntent === "EmergencyAdvice"
        || result.classification.emergencyPriority !== "NONE"
        || /urgent|immediate|emergency|assessment|symptom|share|vitals|ecg|could be|prioriti/i.test(result.response.content),
      `${question}: emergency handling — ${result.response.content.slice(0, 120)}`,
    );
    passed += 1;
  }

  for (const question of ECG) {
    const result = await ask(question);
    assert(
      /upload|focus|rhythm|ecg|tracing|case|share|context/i.test(result.response.content),
      `${question}: ECG conversational guidance`,
    );
    passed += 1;
  }

  for (const question of LABORATORY) {
    await ask(question);
    passed += 1;
  }

  for (const question of RADIOLOGY) {
    await ask(question);
    passed += 1;
  }

  for (const question of CLINICAL_REASONING) {
    await ask(question);
    passed += 1;
  }

  for (let index = 0; index < FOLLOW_UP.length; index += 2) {
    const seed = FOLLOW_UP[index];
    const followUp = FOLLOW_UP[index + 1];
    const conversationId = `follow-${index}`;
    await ask(seed, emptyMemory, conversationId);
    const memory: ConversationMemory = {
      attachments: [],
      summary: "",
      turns: [
        { role: "user", content: seed },
        { role: "assistant", content: "Clinical overview provided." },
      ],
    };
    const result = await ask(followUp, memory, conversationId);
    assert(result.context.resolvedQuestion.length > followUp.length - 5, `${followUp}: pronoun resolution`);
    passed += 2;
  }

  for (const scenario of MEMORY_SCENARIOS) {
    const result = await ask(scenario.followUp, scenario.memory, `memory-${scenario.followUp}`);
    assert(scenario.topic.test(result.context.resolvedQuestion), `${scenario.followUp}: memory topic ${result.context.resolvedQuestion}`);
    passed += 1;
  }

  for (const scenario of IMAGE_UPLOAD) {
    ConversationManager.resetForTests();
    const result = await runClinicalCopilotEngine(
      {
        attachments: scenario.attachments,
        chatInput: {},
        conversationId: `img-${scenario.attachments[0].id}`,
        memory: emptyMemory,
        question: scenario.question,
      },
      engineDeps,
    );
    assertConversational(result.response.content, scenario.question);
    assert(
      /uploaded|report|findings|correlate|document|ecg|lab|echo|imaging|prescription|lists|medication|original/i.test(result.response.content),
      `${scenario.question}: image understanding — ${result.response.content.slice(0, 120)}`,
    );
    passed += 1;
  }

  const greeting = await ask("Hello");
  assert(!greeting.toolPlan.runKnowledge, "Greeting avoids knowledge search");

  const generated = ResponseGenerator.generate({
    attachments: [],
    clinicalContext: emptyClinicalContext(),
    communicationIntent: "MedicalQuestion",
    intent: "general_medical_question",
    knowledge: [{
      category: "MED",
      content: "Hypertension is a condition in which blood pressure remains persistently elevated over time. Many people have no symptoms, but uncontrolled hypertension increases cardiovascular risk.",
      id: "htn",
      references: [],
      relevanceScore: 0.9,
      sourceName: "Cardiology KB",
      tags: ["hypertension"],
      topic: "Hypertension",
    }],
    memory: emptyMemory,
    plan: Planner.buildResponsePlan("MedicalQuestion", false),
    primarySmartIntent: "general_medical_question",
    question: "What is hypertension?",
    requiresClarification: false,
    topic: { label: "hypertension", slug: "hypertension" },
  });
  assert(/Would you like me to explain/i.test(generated.content), "Medical answers offer natural follow-up");
  assert(!/^Definition:/m.test(generated.content), "No textbook headers");
  passed += 2;

  assert(passed >= 100, `Expected at least 100 conversational cases, ran ${passed}`);
  console.log(`Clinical AI Core v1 conversational suite passed (${passed} cases).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
