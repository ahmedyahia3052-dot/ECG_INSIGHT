/**
 * Sprint 62 — ECG Interpretation Engine Enterprise integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MOD = resolve(ROOT, "server/src/modules/ecg-interpretation-engine");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  {
    file: resolve(MOD, "services/interpretation-engine.service.ts"),
    markers: [
      "buildEnterpriseInterpretation",
      "createDefaultInterpretationEngineDependencies",
      "INTERPRETATION_ENGINE_VERSION",
    ],
  },
  {
    file: resolve(MOD, "controllers/interpretation.routes.ts"),
    markers: ["ecgInterpretationEngineRouter", "/interpret", "/interpret/:caseId"],
  },
  {
    file: resolve(MOD, "interpreters/section-interpreters.ts"),
    markers: [
      "interpretRhythmSection",
      "interpretRateSection",
      "interpretAxisSection",
      "interpretIntervalsSection",
      "interpretConductionSection",
      "interpretHypertrophySection",
      "interpretStSegmentSection",
      "interpretTWaveSection",
      "interpretQWaveSection",
      "interpretClinicalImpressionSection",
    ],
  },
  {
    file: resolve(ROOT, "server/src/modules/index.ts"),
    markers: ["ecgInterpretationEngineRouter"],
  },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 62 ECG Interpretation Engine integration markers: PASS");
