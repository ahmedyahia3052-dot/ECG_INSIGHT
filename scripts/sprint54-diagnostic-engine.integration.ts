import { runIntegrationMain } from "./finish-integration";
import { buildSyntheticTwelveLeadEcg } from "./ecg-diagnostic-engine-synthetic";
import { measureFromLeads } from "../server/src/modules/ecg-measurement";
import { interpretFromMeasurement } from "../server/src/modules/ecg-interpretation/engine";
import {
  clearMeasurementStudioStore,
  exportMeasurementPayload,
  recordMeasurementSnapshot,
  runDiagnosticPipelineSync,
} from "../server/src/modules/ecg-diagnostic-engine";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const { calibration, leads } = buildSyntheticTwelveLeadEcg({ bpm: 80 });
  const pipeline = runDiagnosticPipelineSync({ calibration, leads });
  const clinical = measureFromLeads({ calibration, leads });
  const interpretation = interpretFromMeasurement(clinical);

  assert(pipeline.measurements.heartRateBpm > 0, "enterprise measurements present");
  assert(clinical.measurements.some((item) => item.label === "QT Dispersion"), "legacy bundle includes QT dispersion");
  assert(clinical.measurements.some((item) => item.label === "R Wave Amplitude"), "legacy bundle includes R wave amplitude");
  assert(clinical.confidence > 0, "legacy confidence populated from diagnostic engine");
  assert(interpretation.findings.length > 0, "interpretation rules consume diagnostic measurements");
  assert(pipeline.clinicalFindings.every((item) => item.measurements.length > 0), "each diagnosis references measurements");
  assert(pipeline.structuredFindings.length > 0, "structured findings generated");

  clearMeasurementStudioStore("sprint54-integration");
  recordMeasurementSnapshot("sprint54-integration", pipeline);
  const exported = exportMeasurementPayload("sprint54-integration", pipeline);
  assert(exported.clinicalFindings.length === pipeline.clinicalFindings.length, "export preserves findings");

  const runs = Array.from({ length: 5 }, () => {
    const { performanceMs: _performanceMs, ...rest } = runDiagnosticPipelineSync({ calibration, leads });
    return JSON.stringify(rest);
  });
  assert(runs.every((payload) => payload === runs[0]), "regression: five runs produce identical JSON");

  console.log("sprint54-diagnostic-engine.integration.ts: all tests passed");
}

runIntegrationMain(main);
