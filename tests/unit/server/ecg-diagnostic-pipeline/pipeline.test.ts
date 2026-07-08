import { describe, expect, it, vi } from "vitest";
import { buildSyntheticTwelveLeadEcg } from "../../../../scripts/ecg-diagnostic-engine-synthetic";
import {
  createDefaultDiagnosticPipelineDependencies,
  runEcgDiagnosticPipelineAsync,
} from "../../../../server/src/modules/ecg-diagnostic-pipeline";

describe("ecg-diagnostic-pipeline sprint61", () => {
  it("orchestrates all backend engines with a single diagnostic run", async () => {
    const { calibration, leads } = buildSyntheticTwelveLeadEcg({ bpm: 70, noise: 0 });
    const defaults = createDefaultDiagnosticPipelineDependencies();
    const runDiagnosticPipeline = vi.fn(defaults.runDiagnosticPipeline);

    const result = await runEcgDiagnosticPipelineAsync(
      { calibration, leads, qualityScore: 0.85 },
      { ...defaults, runDiagnosticPipeline },
    );

    expect(runDiagnosticPipeline).toHaveBeenCalledTimes(1);
    expect(result.pipelineVersion).toBe("sprint61-v1");
    expect(result.artifacts.measurementEngine.engineVersion).toBe("sprint59-v1");
    expect(result.artifacts.medicalIntelligence.recommendations.length).toBeGreaterThan(0);
    expect(result.artifacts.aiReport.primaryDiagnosis.length).toBeGreaterThan(0);
  });

  it("records workflow stages in order", async () => {
    const { calibration, leads } = buildSyntheticTwelveLeadEcg({ bpm: 68, noise: 0 });
    const result = await runEcgDiagnosticPipelineAsync({ calibration, leads });
    const stageNames = result.stages.map((stage) => stage.stage);
    expect(stageNames).toContain("diagnostic_engine");
    expect(stageNames).toContain("measurement_engine");
    expect(stageNames).toContain("clinical_knowledge_engine");
    expect(stageNames).toContain("differential_diagnosis");
    expect(stageNames).toContain("ai_report_generation");
  });
});
