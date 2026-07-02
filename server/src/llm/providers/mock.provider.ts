import type { LlmChatMessage, LlmCompletionDTO, LlmGenerateInput, LlmHealthDTO } from "../types";
import { estimateTokenCount } from "../errors";
import type { ILlmProvider } from "./llm-provider.interface";

type MockSessionContext = {
  activeTopic: string | null;
  educationalMode: boolean;
  internalIntent: string;
  isFollowUp: boolean;
  userRole: string;
};

function parseSessionContext(messages: LlmChatMessage[]): MockSessionContext | null {
  const systemText = messages.filter((item) => item.role === "system").map((item) => item.content).join("\n");
  const contextBlock = systemText.match(/Internal session context[\s\S]*?(?=\n\n|$)/)?.[0];
  if (!contextBlock) return null;

  const read = (key: string) => {
    const escaped = key.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
    return contextBlock.match(new RegExp(`- ${escaped}: (.+)`))?.[1]?.trim() ?? null;
  };
  return {
    activeTopic: read("Active topic"),
    educationalMode: systemText.includes("TUTOR MODE"),
    internalIntent: read("Intent") ?? "unknown",
    isFollowUp: read("Follow-up") === "yes",
    userRole: read("User role") ?? "unknown",
  };
}

function buildMockReply(messages: LlmChatMessage[]): string {
  const userMessages = messages.filter((item) => item.role === "user").map((item) => item.content.trim());
  const lastUser = userMessages.at(-1) ?? "";
  const systemText = messages.filter((item) => item.role === "system").map((item) => item.content).join("\n");
  const session = parseSessionContext(messages);
  const repeatedQuestion = userMessages.length >= 2 && userMessages.at(-1) === userMessages.at(-2);

  const tutorStructured = (title: string, explanation: string, pearl: string, points: string[], next: string) =>
    `## ${title}\n\n## Explanation\n${explanation}\n\n### Clinical Pearl\n${pearl}\n\n## Key Points\n${points.map((point) => `- ${point}`).join("\n")}\n\n## Next Lesson\n${next}`;

  let text = "Happy to help — tell me a bit more about what you'd like to explore.";

  if (repeatedQuestion && lastUser) {
    text = tutorStructured(
      "Reviewing Your Question Again",
      `You asked about "${lastUser}" again — here is a fresh walkthrough using what we already discussed in this thread.`,
      "Repeating a concept from a new angle often solidifies retention.",
      ["Same topic, clearer framing", "Build on prior turns in this chat", "Ask /quiz when ready to test yourself"],
      "Say **next** or use /teach to continue the curriculum.",
    );
  } else if (/\/quiz\b/i.test(lastUser)) {
    text = tutorStructured(
      "ECG Quick Quiz",
      "Question 1: Which interval reflects AV nodal conduction? Question 2: Which lead pair helps estimate frontal plane axis?",
      "Quiz yourself before looking up answers — retrieval practice beats passive rereading.",
      ["PR interval = AV conduction", "Lead I and aVF for axis", "Regularly irregular rhythm suggests AF"],
      "Use /teach for the next lesson when you're ready.",
    );
  } else if (/\/summarize\b/i.test(lastUser)) {
    text = tutorStructured(
      "Conversation Summary",
      "We reviewed your recent questions in this thread and the main teaching points covered so far.",
      "Summaries are most useful when you note one gap to revisit.",
      ["Key topics from this chat are captured above", "Use /teach to resume structured lessons"],
      "Continue with /teach or ask a follow-up question.",
    );
  } else if (/\/explain\b/i.test(lastUser)) {
    text = tutorStructured(
      "Concept Explanation",
      "I'll explain the requested topic step-by-step in plain clinical language.",
      "Anchor each abstract term to something you can see on the tracing.",
      ["Definition first", "Then physiology", "Then clinical relevance"],
      "Use /quiz to test understanding.",
    );
  } else if (/\/case\b/i.test(lastUser)) {
    text = tutorStructured(
      "ECG Case Discussion",
      "A 58-year-old has substernal pressure. Vitals are stable. What is your first ECG-focused step?",
      "Always secure rate, rhythm, and ST segments before advanced localization.",
      ["Immediate 12-lead ECG", "Serial troponins when ischemia is suspected", "Correlate symptoms with territory"],
      "Use /explain STEMI when you want criteria review.",
    );
  } else if (systemText.includes("TUTOR MODE") && /where should i start|what should i learn first|how do i start/i.test(lastUser)) {
    text = tutorStructured(
      "Starting Your ECG Journey",
      "Start with cardiac anatomy — how chamber depolarization maps to each ECG waveform — before intervals or ischemia patterns.",
      "Fundamentals first prevents pattern-matching without understanding.",
      ["Anatomy → conduction → paper → leads", "One lesson at a time", "Use /teach to jump to a topic"],
      "Next: **Electrical Conduction** — say `next`.",
    );
  } else if (systemText.includes("TUTOR MODE") && /next|continue|what next/i.test(lastUser)) {
    text = tutorStructured(
      "Continuing Step by Step",
      "We'll build on the previous ECG lesson before advancing to morphology or pathology.",
      "Each step should feel complete before moving on.",
      ["Review prior key points", "Ask /quiz to test retention", "Use /teach for a specific topic"],
      "Say which topic you'd like next or use /teach.",
    );
  } else if (systemText.includes("TUTOR MODE") && /learn ecg|teach me ecg|want to learn ecg|from zero|learn ECG/i.test(lastUser)) {
    text = tutorStructured(
      "Learn ECG Step by Step",
      "We'll build ECG fundamentals from zero — one concept at a time through the full curriculum.",
      "Structured progression beats jumping to STEMI criteria on day one.",
      ["13-lesson ECG path", "Use /teach, /quiz, /case", "Say where to start"],
      "Try `/teach cardiac anatomy` or ask **where should I start?**",
    );
  } else if (systemText.includes("TUTOR MODE") || systemText.includes("TEACH MODE") || /\/teach\b/i.test(lastUser)) {
    text = tutorStructured(
      "Cardiac Anatomy",
      "The heart has four chambers. Atrial depolarization precedes ventricular depolarization, and each chamber contributes to the vectors seen across the 12 ECG leads.",
      "Relate chamber location to the leads that best view that territory before memorizing criteria.",
      ["RA/LA depolarization forms the P wave", "Ventricular mass drives QRS voltage", "Coronary territories map to territories on the tracing"],
      "Next up: **Electrical Conduction** — say `next` or `/teach conduction`.",
    );
  } else if (/Resolved question: How is hypertension diagnosed/i.test(systemText) && /diagnos/i.test(lastUser)) {
    text = "Hypertension is diagnosed with repeated blood pressure readings in a calm setting, often confirmed with ambulatory or home monitoring, plus assessment of end-organ effects.";
  } else if (session) {
    if (session.internalIntent === "greeting" || /^hello|hi\b/i.test(lastUser.trim())) {
      text = "Hello — I'm here to help with cardiology questions, case discussion, or step-by-step teaching whenever you're ready.";
    } else if (session.educationalMode) {
      if (/where should i start|what should i learn first|how do i start/i.test(lastUser)) {
        text = tutorStructured(
          "Starting Your ECG Journey",
          "Begin with cardiac anatomy — how chamber depolarization maps to each waveform — before intervals or ischemia patterns.",
          "Fundamentals first prevents pattern-matching without understanding.",
          ["Anatomy → conduction → paper → leads", "One lesson at a time", "Use /teach to jump to a topic"],
          "Next: **Electrical Conduction** — say `next`.",
        );
      } else if (/next|continue|what next/i.test(lastUser)) {
        text = tutorStructured(
          "Continuing Step by Step",
          "We'll build on the previous lesson before advancing to morphology or pathology.",
          "Each step should feel complete before moving on.",
          ["Review prior key points", "Ask /quiz to test retention", "Use /teach for a specific topic"],
          "Say which topic you'd like next or use /teach.",
        );
      } else if (/learn ecg|teach me ecg|want to learn ecg|from zero/i.test(lastUser)) {
        text = tutorStructured(
          "ECG From Zero",
          "We'll build ECG step by step from fundamentals through clinical interpretation.",
          "Structured progression beats jumping to STEMI criteria on day one.",
          ["13-lesson curriculum", "Use /teach, /quiz, /case", "Say where to start"],
          "Try `/teach cardiac anatomy` to begin.",
        );
      } else if (session.userRole === "medical_student") {
        text = "Great — tell me what you'd like to focus on. ECG is an excellent place to start if you're early in cardiology.";
      } else {
        text = "Happy to tutor you — we'll take this one concept at a time. What would you like to focus on next?";
      }
    } else if (session.isFollowUp && session.activeTopic && session.activeTopic !== "none") {
      if (/diagnos/i.test(lastUser) && /hypertension/i.test(session.activeTopic)) {
        text = "Hypertension is diagnosed with repeated blood pressure readings in a calm setting, often confirmed with ambulatory or home monitoring, plus assessment of end-organ effects.";
      } else if (/diagnos/i.test(lastUser)) {
        text = `${session.activeTopic} is assessed with a focused history, examination, and targeted investigations guided by the presentation.`;
      } else if (/lvh|hypertrophy|why does it/i.test(lastUser) && session.activeTopic && /hypertension/i.test(session.activeTopic)) {
        text = "Chronic pressure overload in hypertension increases afterload, which can lead to left ventricular hypertrophy over time through myocyte remodeling.";
      } else if (/treat|drug|medication|anticoag/i.test(lastUser)) {
        text = `Management of ${session.activeTopic} depends on severity, comorbidities, and guideline-based risk assessment.`;
      } else {
        text = `Continuing on ${session.activeTopic} — tell me which aspect you'd like to go deeper on.`;
      }
    } else if (session.internalIntent === "emergency_advice" || /severe shortness of breath|crushing chest pain|unconscious|not breathing|anaphylaxis|stroke symptoms/i.test(lastUser)) {
      text = "That could be urgent — prioritize immediate clinical assessment, check vitals and oxygenation, and seek emergency care if symptoms are severe or worsening.";
    } else if (session.internalIntent === "clarification_request" || session.internalIntent === "ecg_interpretation") {
      text = "To interpret an ECG I'd work through rate, rhythm, intervals, and ST-T changes systematically — share the tracing or describe the key findings when you have them.";
    } else if (/\becg\b|\bekg\b|electrocardiogram|tracing|st elevation|qt prolongation|bundle branch|sinus tachycardia|hyperkalemia|paced rhythm/i.test(lastUser)) {
      text = "I can walk through that ECG topic clearly — tell me which waveform or finding you'd like to focus on.";
    } else if (session.userRole === "patient") {
      text = /heart failure/i.test(lastUser)
        ? "Heart failure means the heart is not pumping as effectively as the body needs, which can cause breathlessness, fatigue, and fluid buildup."
        : "I'll explain this in plain language. Tell me what you'd like to understand and we'll go through it gently step by step.";
    } else if (session.internalIntent === "case_discussion" || session.internalIntent === "clinical_reasoning") {
      text = "For chest pain I'd start with immediate vitals, a 12-lead ECG, and troponin, then assess red flags and decide on observation, serial testing, or urgent referral.";
    } else if (/hypertension|blood pressure/i.test(lastUser)) {
      text = "Hypertension is sustained elevation of blood pressure above guideline thresholds. Diagnosis relies on repeated measurements and cardiovascular risk assessment.";
    } else if (/atrial fibrillation|\baf\b/i.test(lastUser)) {
      text = "Atrial fibrillation is an irregularly irregular supraventricular rhythm. I'd think about rate control, rhythm strategy, stroke risk, and anticoagulation when appropriate.";
    } else if (/chest pain|this patient|patient has|diaphoresis|year-old/i.test(lastUser)) {
      text = "Tell me more about the presentation — onset, associated symptoms, vitals, and any initial tests — and we can think through the next steps together.";
    } else if (/heart failure|simple terms|plain language/i.test(lastUser)) {
      text = "Heart failure means the heart is not pumping as effectively as the body needs, which can cause breathlessness, fatigue, and fluid buildup.";
    } else if (/anticoag|new atrial fibrillation|cha2ds2|has-bled/i.test(lastUser)) {
      text = "For new atrial fibrillation I'd weigh stroke risk with CHA2DS2-VASc, bleeding risk, and then discuss anticoagulation options in line with guidelines.";
    } else if (/diabetes/i.test(lastUser)) {
      text = "Diabetes involves impaired glucose regulation over time, with important effects on cardiovascular and kidney risk.";
    } else if (/what causes it/i.test(lastUser) && session.activeTopic && session.activeTopic !== "none") {
      text = `Common causes of ${session.activeTopic} depend on the subtype and patient context — I can walk through the main mechanisms if helpful.`;
    } else if (/explain|what is|tell me about/i.test(lastUser)) {
      text = "I can walk you through the key points clearly. What part would you like to start with?";
    } else if (/interpret.*ecg|ecg tracing|ischaemia|ischemia/i.test(lastUser)) {
      text = "To interpret an ECG I'd look systematically at rate, rhythm, ST-T changes, and correlate with symptoms — share the tracing or key findings if you have them.";
    }
  } else if (/^hello|hi\b|how are you/i.test(lastUser.trim())) {
    text = "Hello — I'm here to help with cardiology questions, case discussion, or step-by-step teaching whenever you're ready.";
  } else if (/interpret.*ecg|ecg tracing|ischaemia|ischemia|^interpret this ecg/i.test(lastUser)) {
    text = "To interpret an ECG I'd look systematically at rate, rhythm, ST-T changes, and correlate with symptoms — share the tracing or key findings if you have them.";
  } else if (/what would you do next|what should i do next/i.test(lastUser)) {
    text = "For chest pain I'd start with immediate vitals, a 12-lead ECG, and troponin, then assess red flags and decide on observation, serial testing, or urgent referral.";
  } else if (/why does it cause lvh|lvh/i.test(lastUser)) {
    text = "Chronic pressure overload in hypertension increases afterload, which can lead to left ventricular hypertrophy over time through myocyte remodeling.";
  }

  return text;
}

function completeMock(input: LlmGenerateInput): LlmCompletionDTO {
  const started = performance.now();
  const promptText = input.messages.map((message) => message.content).join("\n");
  const text = buildMockReply(input.messages);

  if (input.onToken) {
    for (const token of text.match(/.{1,14}(\s|$)/g) ?? [text]) {
      input.onToken(token);
    }
  }

  const latencyMs = Math.max(0, Math.round(performance.now() - started));
  return {
    content: text,
    model: "mock-local",
    toolCalls: [],
    usage: {
      latencyMs,
      promptTokens: estimateTokenCount(promptText),
      responseTokens: estimateTokenCount(text),
    },
  };
}

export class MockProvider implements ILlmProvider {
  readonly providerName = "mock";
  readonly model = "mock-local";

  async generateChat(input: LlmGenerateInput): Promise<LlmCompletionDTO> {
    return completeMock(input);
  }

  async generateStream(input: LlmGenerateInput): Promise<LlmCompletionDTO> {
    return completeMock(input);
  }

  async healthCheck(): Promise<LlmHealthDTO> {
    return {
      latency: 0,
      model: this.model,
      online: true,
      provider: this.providerName,
      status: "degraded",
    };
  }

  async listModels(): Promise<string[]> {
    return [this.model];
  }
}
