import { performance } from "node:perf_hooks";
import { runMeasurementEngine } from "../server/src/modules/ecg-measurement-engine";
import { buildSyntheticTwelveLeadEcg } from "./ecg-diagnostic-engine-synthetic";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function main() {
  const shortEcg = buildSyntheticTwelveLeadEcg({ bpm: 72, durationSeconds: 10, noise: 0 });
  const longEcg = buildSyntheticTwelveLeadEcg({ bpm: 68, durationSeconds: 30, noise: 0.05 });

  const shortRuns: number[] = [];
  for (let index = 0; index < 20; index += 1) {
    const started = performance.now();
    runMeasurementEngine(shortEcg);
    shortRuns.push(performance.now() - started);
  }

  const longStarted = performance.now();
  runMeasurementEngine(longEcg);
  const longMs = performance.now() - longStarted;

  const shortP95 = shortRuns.sort((a, b) => a - b)[Math.floor(shortRuns.length * 0.95)] ?? 0;
  const shortMean = shortRuns.reduce((sum, value) => sum + value, 0) / shortRuns.length;

  assert(shortMean < 500, `short ECG mean ${shortMean.toFixed(1)}ms should be < 500ms`);
  assert(shortP95 < 800, `short ECG p95 ${shortP95.toFixed(1)}ms should be < 800ms`);
  assert(longMs < 3000, `long ECG ${longMs.toFixed(1)}ms should be < 3000ms`);

  console.log(
    JSON.stringify({
      benchmark: "sprint59-measurement-engine",
      longEcgMs: Number(longMs.toFixed(2)),
      shortEcgMeanMs: Number(shortMean.toFixed(2)),
      shortEcgP95Ms: Number(shortP95.toFixed(2)),
    }),
  );
  console.log("sprint59-measurement-engine.benchmark.ts: PASS");
}

main();
