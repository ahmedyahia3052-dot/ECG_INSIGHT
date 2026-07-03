import type { ClinicalContext } from "../copilot-types";
import type { NormalizedAttachmentContext } from "../attachment/types";

export type ClinicalValidationResult = {
  confidence: number;
  contradictions: string[];
  flags: string[];
  requiresPhysicianReview: boolean;
};

function detectContradictions(contexts: NormalizedAttachmentContext[]) {
  const contradictions: string[] = [];
  const stemi = contexts.some((item) => item.findings.some((finding) => /stemi|st elevation/i.test(finding)));
  const normal = contexts.some((item) => /normal sinus|no acute|within normal limits/i.test(item.summary));
  if (stemi && normal) contradictions.push("Conflicting ischemic vs normal language across uploaded files.");
  return contradictions;
}

export function validateClinicalResponse(input: {
  answer: string;
  attachmentContexts?: NormalizedAttachmentContext[];
  clinicalContext?: ClinicalContext;
  question: string;
}): ClinicalValidationResult {
  const flags: string[] = [];
  const answer = input.answer.toLowerCase();
  const question = input.question.toLowerCase();
  const contexts = input.attachmentContexts ?? [];

  if (/definitive diagnosis|100% certain|guaranteed/.test(answer)) {
    flags.push("Overconfident diagnostic language detected — response softened for clinical safety.");
  }
  if (contexts.some((item) => item.confidence < 0.65) && !/verify|review|uncertain|limited ocr/i.test(answer)) {
    flags.push("Low-confidence attachment context not acknowledged in response.");
  }
  if (/stemi|vf|ventricular fibrillation|complete heart block/.test(`${question} ${answer}`) && !/urgent|emergency|immediate|physician/i.test(answer)) {
    flags.push("High-acuity pattern discussed without explicit urgent review guidance.");
  }

  const contradictions = detectContradictions(contexts);
  const confidence = contexts.length
    ? Math.min(...contexts.map((item) => item.confidence))
    : input.clinicalContext?.criticalAlerts.length ? 0.55 : 0.82;

  return {
    confidence,
    contradictions,
    flags,
    requiresPhysicianReview: flags.length > 0 || contradictions.length > 0 || confidence < 0.65,
  };
}

export function applyClinicalValidation(answer: string, validation: ClinicalValidationResult) {
  let content = answer.trim();
  if (validation.contradictions.length) {
    content += `\n\nNote: ${validation.contradictions.join(" ")}`;
  }
  if (validation.requiresPhysicianReview && !/physician review|qualified physician|clinical review/i.test(content)) {
    content += "\n\nSome findings have low confidence or potential contradictions — physician review is required before clinical action.";
  }
  return content;
}
