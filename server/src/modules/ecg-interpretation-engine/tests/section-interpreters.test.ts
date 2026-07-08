import assert from "node:assert/strict";
import { interpretFromMeasurement } from "../../ecg-interpretation";
import type { EcgClinicalMeasurementResult } from "../../ecg-measurement/types";
import {
  interpretAxisSection,
  interpretClinicalImpressionSection,
  interpretIntervalsSection,
  interpretRateSection,
  interpretRhythmSection,
} from "../interpreters/section-interpreters";
import { buildEnterpriseInterpretation, createDefaultInterpretationEngineDependencies } from "../services/interpretation-engine.service";
import { mapKnowledgeDiagnosisId, lookupKnowledgeEntry } from "../services/knowledge-bridge";

const sampleMeasurement: EcgClinicalMeasurementResult = {
  amplitudes: {
    pWaveAmplitudeMv: 0.12,
    qrsAmplitudeMv: 1.1,
    rWaveProgression: "normal",
    stDeviationMm: 0.1,
    tWaveAmplitudeMv: 0.35,
  },
  axis: { electricalAxisDeg: 45, frontalPlaneAxisDeg: 45, meanQrsAxisDeg: 45 },
  confidence: 0.82,
  heartRate: 78,
  intervals: {
    pWaveDurationMs: 90,
    prIntervalMs: 160,
    qrsDurationMs: 92,
    qtIntervalMs: 380,
    qtcBazettMs: 410,
    qtcFridericiaMs: 400,
    rrIntervalMs: 770,
  },
  measurements: [],
  morphology: [],
  rhythm: "sinus_rhythm",
  stDeviation: 0.1,
};

const legacy = interpretFromMeasurement(sampleMeasurement);
const deps = createDefaultInterpretationEngineDependencies();
const lookup = (code: string) => lookupKnowledgeEntry((id) => deps.getClinicalKnowledgeById(id), code);

assert.equal(mapKnowledgeDiagnosisId("NSR"), "SINUS_RHYTHM");
assert.equal(mapKnowledgeDiagnosisId("AF"), "ATRIAL_FIBRILLATION");

const rhythm = interpretRhythmSection(sampleMeasurement, legacy.findings, lookup);
assert.ok(rhythm.label.length > 0);
assert.ok(rhythm.confidence > 0);

const rate = interpretRateSection(sampleMeasurement);
assert.equal(rate.rateCategory, "normal");
assert.equal(rate.heartRateBpm, 78);

const axis = interpretAxisSection(sampleMeasurement, legacy.findings, lookup);
assert.equal(axis.axisDegrees, 45);

const intervals = interpretIntervalsSection(sampleMeasurement);
assert.equal(intervals.pr.unit, "ms");
assert.equal(intervals.qrs.unit, "ms");
assert.equal(intervals.qt.unit, "ms");
assert.equal(intervals.qtc.unit, "ms");
assert.equal(intervals.rr.unit, "ms");

const impression = interpretClinicalImpressionSection(legacy);
assert.ok(impression.summary.length > 0);
assert.ok(impression.primaryDiagnosis.length > 0);

const enterprise = buildEnterpriseInterpretation(sampleMeasurement, deps, { caseId: "test-case" });
assert.equal(enterprise.engineVersion, "sprint62-ecg-interpretation-engine-v1");
assert.ok(enterprise.rhythm.label);
assert.ok(enterprise.rate.label);
assert.ok(enterprise.axis.label);
assert.ok(enterprise.intervals.interpretation);
assert.ok(enterprise.conduction.label);
assert.ok(enterprise.hypertrophy.label);
assert.ok(enterprise.stSegment.label);
assert.ok(enterprise.tWave.label);
assert.ok(enterprise.qWave.label);
assert.ok(enterprise.clinicalImpression.summary);
assert.equal(enterprise.caseId, "test-case");

console.log("Sprint 62 interpretation engine unit tests: PASS");
