import { env } from "../config/env";
import { analyzeECG } from "./engine";
import type { ECGAnalysisInput, ECGAnalysisOutput } from "./domain";
import { hasLocalOnnxModel, LocalOnnxProvider } from "./onnx-runtime.service";

export interface AIProvider {
  analyze(input: ECGAnalysisInput & { actorId?: string }): Promise<ECGAnalysisOutput>;
  modelVersion: string;
  name: "deep_learning" | "mock" | "onnx_runtime" | "rule_based";
}

export class RuleBasedProvider implements AIProvider {
  modelVersion = "ecg-insight-rule-engine-v2.0.0";
  name = "rule_based" as const;

  async analyze(input: ECGAnalysisInput & { actorId?: string }) {
    const result = analyzeECG(input);
    return {
      ...result,
      provider: {
        modelVersion: this.modelVersion,
        name: this.name,
      },
    };
  }
}

export class MockProvider implements AIProvider {
  modelVersion = "ecg-insight-mock-provider-v1.0.0";
  name = "mock" as const;

  async analyze(input: ECGAnalysisInput & { actorId?: string }): Promise<ECGAnalysisOutput> {
    const result = analyzeECG({ ...input, measurement: null });
    return {
      ...result,
      confidenceScore: 0.99,
      confidenceScorePercent: 99,
      provider: {
        modelVersion: this.modelVersion,
        name: this.name,
      },
    };
  }
}

export class DeepLearningProvider implements AIProvider {
  private readonly fallback = new RuleBasedProvider();
  modelVersion = "ecg-insight-deep-learning-adapter-v1.0.0";
  name = "deep_learning" as const;

  async analyze(input: ECGAnalysisInput & { actorId?: string }): Promise<ECGAnalysisOutput> {
    if (!env.AI_MODEL_ENDPOINT) {
      return this.fallbackWithProvider(input, "Deep learning endpoint not configured; rule-based clinical engine used.");
    }

    try {
      const response = await fetch(env.AI_MODEL_ENDPOINT, {
        body: JSON.stringify({
          case: {
            caseId: input.case.caseId,
            clinicalNotes: input.case.clinicalNotes,
            ecgType: input.case.ecgType,
            priority: input.case.priority,
          },
          measurement: input.measurement,
        }),
        headers: {
          "content-type": "application/json",
          ...(env.AI_MODEL_API_KEY ? { authorization: `Bearer ${env.AI_MODEL_API_KEY}` } : {}),
        },
        method: "POST",
      });
      if (!response.ok) {
        return this.fallbackWithProvider(input, `Deep learning endpoint returned ${response.status}; rule-based clinical engine used.`);
      }

      const payload = await response.json() as Partial<ECGAnalysisOutput>;
      const fallback = await this.fallback.analyze(input);
      return {
        ...fallback,
        ...payload,
        confidenceScore: typeof payload.confidenceScore === "number" ? payload.confidenceScore : fallback.confidenceScore,
        confidenceScorePercent: typeof payload.confidenceScorePercent === "number"
          ? payload.confidenceScorePercent
          : Math.round((payload.confidenceScore ?? fallback.confidenceScore) * 100),
        interpretationRationale: [
          ...(payload.interpretationRationale ?? fallback.interpretationRationale),
          "Deep learning provider response merged with validated clinical rule features.",
        ],
        provider: {
          modelVersion: this.modelVersion,
          name: this.name,
        },
      };
    } catch (error) {
      return this.fallbackWithProvider(input, error instanceof Error ? error.message : "Deep learning provider failed.");
    }
  }

  private async fallbackWithProvider(input: ECGAnalysisInput & { actorId?: string }, reason: string) {
    const fallback = await this.fallback.analyze(input);
    return {
      ...fallback,
      interpretationRationale: [...fallback.interpretationRationale, reason],
      provider: {
        modelVersion: this.modelVersion,
        name: this.name,
      },
    };
  }
}

export function getAIProvider(): AIProvider {
  if (hasLocalOnnxModel()) return new LocalOnnxProvider();
  if (env.AI_PROVIDER === "mock") return new MockProvider();
  if (env.AI_PROVIDER === "deep_learning") return new DeepLearningProvider();
  return new RuleBasedProvider();
}
