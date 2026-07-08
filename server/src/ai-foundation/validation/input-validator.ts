import type { ECGAnalysisInput, ECGAnalysisOutput } from "../../ai/domain";
import type { LlmGenerateInput } from "../../llm/types";
import type { MedicalIntelligenceInput } from "../../modules/medical-intelligence/types";
import type { AiInferenceKind, AiInferenceRequest } from "../types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function pushError(errors: string[], message: string) {
  errors.push(message);
}

export function validateInferenceRequest(request: AiInferenceRequest): ValidationResult {
  const errors: string[] = [];

  if (!request.kind) {
    pushError(errors, "Inference kind is required.");
    return { errors, valid: false };
  }

  switch (request.kind) {
    case "ecg_analysis":
      validateEcgInput(request.ecgInput, errors);
      break;
    case "llm_chat":
      validateLlmInput(request.llmInput, errors);
      break;
    case "clinical_reasoning":
      validateClinicalInput(request.measurement, errors);
      break;
    case "ecg_interpretation":
      validateClinicalInput(request.measurement, errors);
      break;
    default:
      pushError(errors, `Unsupported inference kind: ${request.kind as string}`);
  }

  return { errors, valid: errors.length === 0 };
}

function validateEcgInput(input: ECGAnalysisInput | undefined, errors: string[]) {
  if (!input?.case?.id) {
    pushError(errors, "ECG analysis requires a case with id.");
  }
}

function validateLlmInput(input: LlmGenerateInput | undefined, errors: string[]) {
  if (!input?.messages?.length) {
    pushError(errors, "LLM chat requires at least one message.");
    return;
  }
  for (const message of input.messages) {
    if (!message.content?.trim()) {
      pushError(errors, "LLM messages must include non-empty content.");
      break;
    }
  }
}

function validateClinicalInput(measurement: MedicalIntelligenceInput["measurement"] | undefined, errors: string[]) {
  if (!measurement) {
    pushError(errors, "Clinical reasoning requires measurement data.");
    return;
  }
  if (measurement.heartRate < 0 || measurement.heartRate > 300) {
    pushError(errors, "Heart rate must be between 0 and 300 bpm.");
  }
}

export function validateEcgOutput(output: ECGAnalysisOutput): ValidationResult {
  const errors: string[] = [];
  if (output.confidenceScore < 0 || output.confidenceScore > 1) {
    pushError(errors, "Confidence score must be between 0 and 1.");
  }
  if (!output.primaryDiagnosis) {
    pushError(errors, "Primary diagnosis is required.");
  }
  if (!output.interpretation?.trim()) {
    pushError(errors, "Interpretation text is required.");
  }
  if (output.heartRate < 0 || output.heartRate > 300) {
    pushError(errors, "Heart rate must be between 0 and 300 bpm.");
  }
  return { errors, valid: errors.length === 0 };
}

export function validateInferenceKind(kind: string): kind is AiInferenceKind {
  return ["ecg_analysis", "llm_chat", "clinical_reasoning", "ecg_interpretation"].includes(kind);
}
