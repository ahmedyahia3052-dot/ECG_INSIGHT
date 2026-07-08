import type { ECGAnalysisInput, ECGAnalysisOutput } from "./domain";

export interface AIProvider {
  analyze(input: ECGAnalysisInput & { actorId?: string }): Promise<ECGAnalysisOutput>;
  modelVersion: string;
  name: "deep_learning" | "mock" | "onnx_runtime" | "rule_based";
}
