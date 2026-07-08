import type { MeasureLeadsInput } from "./types";
import { runDiagnosticPipelineSync, toLegacyMeasurementResult } from "../ecg-diagnostic-engine";
import { emptyMeasurementResult } from "./empty-result";

export { emptyMeasurementResult, serializeMeasurementSummary } from "./empty-result";

export function measureFromLeads(input: MeasureLeadsInput) {
  const { calibration, leads } = input;
  const leadII = leads.find((lead) => lead.lead === "II") ?? leads[0];
  if (!leadII?.samples.length) {
    return emptyMeasurementResult();
  }

  const pipeline = runDiagnosticPipelineSync({ calibration, leads });
  return toLegacyMeasurementResult(pipeline, leadII.samplingRate);
}
