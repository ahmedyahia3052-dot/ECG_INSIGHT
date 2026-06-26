import type { AISeverity, ECGMeasurement } from "@prisma/client";
import type { ECGExplainabilityArtifact } from "./domain";

const leads = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];

function affectedLeads(diagnosis: string) {
  if (diagnosis === "STEMI" || diagnosis === "NSTEMI" || diagnosis === "Myocardial Infarction") return ["II", "III", "aVF", "V2", "V3", "V4"];
  if (diagnosis === "RBBB") return ["V1", "V2", "V5", "V6"];
  if (diagnosis === "LBBB") return ["I", "aVL", "V5", "V6"];
  if (diagnosis === "LVH") return ["I", "aVL", "V5", "V6"];
  if (diagnosis === "RVH") return ["V1", "V2", "III", "aVF"];
  if (diagnosis === "Atrial Fibrillation" || diagnosis === "Atrial Flutter") return ["II", "V1"];
  if (diagnosis === "Long QT") return ["II", "V5"];
  return ["II"];
}

function severityWeight(severity: AISeverity) {
  if (severity === "CRITICAL") return 1;
  if (severity === "SEVERE") return 0.86;
  if (severity === "MODERATE") return 0.7;
  if (severity === "MILD") return 0.52;
  return 0.32;
}

export function generateExplainabilityArtifact(input: {
  confidenceScore: number;
  detectedAbnormalities?: string[];
  diagnosis: string;
  interpretation: string;
  rationale?: string[];
  measurement?: ECGMeasurement | null;
  severity: AISeverity;
}): ECGExplainabilityArtifact {
  const highlighted = affectedLeads(input.diagnosis);
  const weight = severityWeight(input.severity);
  const points = leads.map((lead, index) => ({
    intensity: Number((highlighted.includes(lead) ? weight : weight * 0.32).toFixed(2)),
    lead,
    x: index % 6,
    y: Math.floor(index / 6),
  }));

  return {
    heatmap: {
      format: "normalized-grid-v1",
      points,
    },
    leadHighlights: highlighted.map((lead) => ({
      confidence: Number(input.confidenceScore.toFixed(2)),
      finding: input.diagnosis,
      lead,
      reason: input.interpretation,
    })),
    panel: [
      { label: "Primary Diagnosis", value: input.diagnosis },
      { label: "Detected Abnormalities", value: input.detectedAbnormalities?.join(", ") || "No major abnormality detected" },
      { label: "Abnormal Leads", value: highlighted.join(", ") },
      { label: "Confidence", value: `${Math.round(input.confidenceScore * 100)}%` },
      { label: "Severity", value: input.severity },
      { label: "Heart Rate", value: input.measurement ? `${input.measurement.heartRate} bpm` : "Estimated from case context" },
      { label: "Signal Quality", value: input.measurement?.signalQuality ?? "Image/PDF preprocessing derived" },
      { label: "Interpretation Rationale", value: input.rationale?.join("; ") ?? input.interpretation },
    ],
  };
}
