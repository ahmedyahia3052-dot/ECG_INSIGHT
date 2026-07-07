import { getKnowledgeEntry } from "../knowledge-base";
import type { ExplainabilityArtifact, MedicalDiagnosisCode, RuleFinding } from "../types";
import type { EcgClinicalMeasurementResult } from "../../ecg-measurement/types";

export function buildExplainability(
  finding: RuleFinding,
  allFindings: RuleFinding[],
  measurement: EcgClinicalMeasurementResult,
): ExplainabilityArtifact {
  const knowledge = getKnowledgeEntry(finding.code);
  const supportingEvidence = finding.evidence
    .filter((e) => e.met)
    .map((e) => `${e.feature}: ${e.value}${e.threshold ? ` (threshold: ${e.threshold})` : ""}`);

  const conflictingEvidence = findConflictingEvidence(finding, allFindings, measurement);
  const missingEvidence = findMissingEvidence(finding, measurement, knowledge?.diagnosticCriteria ?? []);
  const possibleAlternatives = findAlternatives(finding, allFindings);

  const rationale = buildRationale(finding, supportingEvidence, conflictingEvidence, missingEvidence);

  return {
    diagnosisCode: finding.code,
    diagnosisLabel: finding.label,
    rationale,
    supportingEvidence,
    conflictingEvidence,
    missingEvidence,
    possibleAlternatives,
  };
}

function buildRationale(
  finding: RuleFinding,
  supporting: string[],
  conflicting: string[],
  missing: string[],
): string {
  const parts = [
    `${finding.label} was selected by rule ${finding.ruleId} based on ${finding.triggeredBy.join(", ")}.`,
  ];
  if (supporting.length) {
    parts.push(`Key supporting evidence: ${supporting.slice(0, 3).join("; ")}.`);
  }
  if (conflicting.length) {
    parts.push(`Conflicting features noted: ${conflicting.slice(0, 2).join("; ")}.`);
  }
  if (missing.length) {
    parts.push(`Additional data needed: ${missing.slice(0, 2).join("; ")}.`);
  }
  return parts.join(" ");
}

function findConflictingEvidence(
  finding: RuleFinding,
  allFindings: RuleFinding[],
  measurement: EcgClinicalMeasurementResult,
): string[] {
  const conflicts: string[] = [];

  const competingRhythms = allFindings.filter(
    (f) => f.category === "rhythm" && f.code !== finding.code && f.category === finding.category,
  );
  for (const comp of competingRhythms) {
    conflicts.push(`Competing rhythm finding: ${comp.label} (${comp.ruleId})`);
  }

  if (finding.code === "AF" && measurement.rhythm !== "irregular") {
    conflicts.push("Rhythm classified as regular, which argues against AF");
  }
  if (finding.code === "NSR" && measurement.heartRate > 100) {
    conflicts.push(`Heart rate ${measurement.heartRate} bpm exceeds normal sinus range`);
  }
  if (finding.code === "STEMI" && measurement.amplitudes.stDeviationMm < 1) {
    conflicts.push(`ST elevation ${measurement.amplitudes.stDeviationMm} mm below STEMI threshold`);
  }
  if (finding.code === "LBBB" && measurement.axis.meanQrsAxisDeg >= 0) {
    conflicts.push("Axis not consistent with typical LBBB pattern");
  }

  return conflicts;
}

function findMissingEvidence(
  finding: RuleFinding,
  measurement: EcgClinicalMeasurementResult,
  criteria: string[],
): string[] {
  const missing: string[] = [];

  if (finding.category === "ischemia" && measurement.confidence < 0.7) {
    missing.push("High-quality multi-lead ST analysis for territory localization");
  }
  if (finding.code === "AF") {
    missing.push("Prolonged rhythm strip to confirm irregularly irregular pattern");
  }
  if (finding.code === "WPW") {
    missing.push("Delta wave confirmation in multiple leads");
  }
  if (finding.code === "PE") {
    missing.push("Clinical pretest probability and imaging confirmation");
  }
  if (finding.code === "NSTEMI" || finding.code === "STEMI") {
    missing.push("Serial troponin measurements");
    missing.push("Comparison with prior ECG");
  }

  const coveredFeatures = new Set(finding.evidence.map((e) => e.feature.toLowerCase()));
  for (const criterion of criteria.slice(0, 3)) {
    const key = criterion.split(" ")[0]?.toLowerCase() ?? "";
    if (key && !coveredFeatures.has(key) && !criterion.toLowerCase().includes("clinical")) {
      missing.push(criterion);
    }
  }

  return [...new Set(missing)].slice(0, 5);
}

function findAlternatives(
  finding: RuleFinding,
  allFindings: RuleFinding[],
): ExplainabilityArtifact["possibleAlternatives"] {
  const knowledge = getKnowledgeEntry(finding.code);
  const alternatives: ExplainabilityArtifact["possibleAlternatives"] = [];

  for (const diff of (knowledge?.differentialDiagnosis ?? []).slice(0, 3)) {
    const matchedFinding = allFindings.find((f) => f.label.toLowerCase().includes(diff.toLowerCase().slice(0, 8)));
    if (matchedFinding && matchedFinding.code !== finding.code) {
      alternatives.push({
        code: matchedFinding.code,
        label: matchedFinding.label,
        reason: `Also detected: ${matchedFinding.label}`,
      });
    } else {
      alternatives.push({
        code: finding.code,
        label: diff,
        reason: `Listed differential: distinguish by specific ECG morphology and clinical context`,
      });
    }
  }

  return alternatives.slice(0, 5);
}

export function buildExplainabilitySummary(artifacts: ExplainabilityArtifact[]): string {
  if (!artifacts.length) {
    return "No diagnostic findings to explain. ECG measurements within expected automated detection thresholds.";
  }
  const primary = artifacts[0];
  return `${primary.diagnosisLabel}: ${primary.rationale} ${artifacts.length > 1 ? `Additionally, ${artifacts.length - 1} concurrent finding(s) evaluated.` : ""}`;
}
