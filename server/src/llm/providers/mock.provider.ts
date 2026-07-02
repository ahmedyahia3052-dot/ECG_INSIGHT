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
  const lastUser = [...messages].reverse().find((item) => item.role === "user")?.content ?? "";
  const systemText = messages.filter((item) => item.role === "system").map((item) => item.content).join("\n");
  const session = parseSessionContext(messages);

  let text = "Happy to help — tell me a bit more about what you'd like to explore.";

  if (/Resolved question: How is hypertension diagnosed/i.test(systemText) && /diagnos/i.test(lastUser)) {
    text = "Hypertension is diagnosed with repeated blood pressure readings in a calm setting, often confirmed with ambulatory or home monitoring, plus assessment of end-organ effects.";
  } else if (systemText.includes("TUTOR MODE") && /where should i start|what should i learn first|how do i start/i.test(lastUser)) {
    text = "Start with cardiac anatomy and how depolarization maps to each waveform, then we'll move to rate and rhythm on the next step.";
  } else if (systemText.includes("TUTOR MODE") && /learn ecg|teach me ecg|want to learn ecg|from zero/i.test(lastUser)) {
    text = "Perfect — we'll build ECG step by step from fundamentals. Say where you'd like to start and we'll go one concept at a time.";
  } else if (session) {
    if (session.internalIntent === "greeting" || /^hello|hi\b/i.test(lastUser.trim())) {
      text = "Hello — I'm here to help with cardiology questions, case discussion, or step-by-step teaching whenever you're ready.";
    } else if (session.educationalMode) {
      if (/where should i start|what should i learn first|how do i start/i.test(lastUser)) {
        text = "Start with cardiac anatomy and how depolarization maps to each waveform, then we'll move to rate and rhythm on the next step.";
      } else if (/next|continue|what next/i.test(lastUser)) {
        text = "Good — let's continue step by step. We'll keep building on the previous concept before moving to morphology or pathology.";
      } else if (/learn ecg|teach me ecg|want to learn ecg|from zero/i.test(lastUser)) {
        text = "Perfect — we'll build ECG step by step from fundamentals. Say where you'd like to start and we'll go one concept at a time.";
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
    };
  }

  async listModels(): Promise<string[]> {
    return [this.model];
  }
}
