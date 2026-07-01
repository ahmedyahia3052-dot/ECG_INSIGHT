import type { ClinicalContext } from "../../copilot-types";
import type { ReasoningResult } from "./types";

export type SafetyResult = {
  caution?: string;
  level: "HIGH" | "MODERATE" | "LOW";
};

function riskFromContext(context: ClinicalContext, question: string) {
  const text = `${question} ${context.currentCase?.diagnosis ?? ""} ${context.criticalAlerts.join(" ")}`.toLowerCase();
  if (context.criticalAlerts.length || /stemi|ventricular tachycardia|vf|complete heart block/.test(text)) {
    return { level: "HIGH" as const, reason: "Critical alert or potentially life-threatening pattern is present or suspected." };
  }
  if (/nstemi|ischemia|atrial fibrillation|long qt|qtc|bundle branch/.test(text)) {
    return { level: "MODERATE" as const, reason: "Clinically significant abnormality requires physician review." };
  }
  return { level: "LOW" as const, reason: "No high-risk feature was retrieved from the current context." };
}

export const SafetyValidation = {
  assess(context: ClinicalContext, question: string, reasoning: ReasoningResult): SafetyResult {
    if (reasoning.emergencyLevel === "HIGH") {
      return { level: "HIGH", caution: "If the patient is symptomatic or unstable, prioritize immediate emergency assessment." };
    }
    const risk = riskFromContext(context, question);
    if (reasoning.mode === "emergency" || risk.level === "HIGH") {
      return { level: "HIGH", caution: "There may be high-risk features here — please prioritize urgent physician review if the patient is symptomatic." };
    }
    if (risk.level === "MODERATE" && reasoning.mode !== "education" && reasoning.mode !== "greeting") {
      return { level: "MODERATE", caution: "Worth correlating with symptoms, vitals, and prior tracings before acting on this alone." };
    }
    return { level: "LOW" };
  },

  apply(content: string, safety: SafetyResult) {
    if (!safety.caution || content.includes(safety.caution)) return content;
    if (safety.level === "HIGH") return `${content}\n\n${safety.caution}`;
    return content;
  },
};
