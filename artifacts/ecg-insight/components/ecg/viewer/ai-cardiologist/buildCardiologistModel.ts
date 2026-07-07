import type { AIAnalysisResult, AIExplainability } from "@/services/ai";
import type { DigitalEcg } from "@/services/ecgProcessing";
import type { MedicalIntelligenceReport } from "@/services/medicalIntelligence";

import { classifyAxis, intervalStatus, leadsForDiagnosis } from "./diagnosisLeadMap";
import type {
  CardiologistBuildInput,
  CardiologistDifferentialRow,
  CardiologistRecommendationRow,
  CardiologistStFinding,
  CardiologistStructuredFinding,
  CardiologistWaveRow,
  CardiologistWorkspaceModel,
} from "./types";

const RHYTHM_CODES = new Set(["NSR", "SBRAD", "STACH", "AF", "AFL", "PAC", "PVC", "SVT", "VT", "VF", "ASYSTOLE", "PEA"]);
const BLOCK_CODES = new Set(["LBBB", "RBBB", "BIFASC", "TRIFASC", "AVB1", "AVB2I", "AVB2II", "AVB3", "WPW"]);
const HYPERTROPHY_CODES = new Set(["LVH", "RVH", "LAE", "RAE", "HYPERTROPHY"]);
const ISCHEMIA_CODES = new Set(["STEMI", "NSTEMI", "PERICARDITIS", "PE"]);

function toFinding(
  code: string,
  label: string,
  category: string,
  severity: string,
  confidence: number,
  confidenceLevel: string,
  explanation: string,
  criteria?: string[],
): CardiologistStructuredFinding {
  return {
    affectedLeads: leadsForDiagnosis(code, label),
    category,
    code,
    confidence,
    confidenceLevel,
    criteria,
    explanation,
    id: `${code}-${label}`,
    label,
    severity,
  };
}

function mapReportFinding(finding: MedicalIntelligenceReport["findings"][number]): CardiologistStructuredFinding {
  return toFinding(
    finding.code,
    finding.label,
    finding.category,
    finding.severity,
    Math.round(finding.confidence.score * 100),
    finding.confidence.level,
    finding.explainability.rationale || finding.explainability.supportingEvidence.join("; "),
    finding.explainability.supportingEvidence,
  );
}

function buildWaveAnalysis(engine?: DigitalEcg["measurementEngine"], stMm?: number): CardiologistWaveRow[] {
  const st = stMm ?? engine?.amplitudes?.stDeviationMm ?? 0;
  const pAmp = engine?.amplitudes?.pWaveAmplitudeMv ?? 0;
  const tAmp = engine?.amplitudes?.tWaveAmplitudeMv ?? 0;
  const qrs = engine?.intervals?.qrsDurationMs ?? null;
  const qt = engine?.intervals?.qtIntervalMs ?? null;

  return [
    {
      explanation: pAmp > 0.05 ? "P waves detected with measurable amplitude on digitized signal." : "P wave amplitude low or absent — evaluate rhythm context.",
      interpretation: pAmp > 0.05 ? "Present" : "Not clearly detected",
      status: pAmp > 0.05 ? "normal" : "borderline",
      wave: "P wave",
    },
    {
      explanation: qrs != null ? `QRS duration ${qrs} ms.` : "QRS morphology derived from measurement engine.",
      interpretation: qrs != null && qrs >= 120 ? "Wide QRS" : "Normal duration",
      status: qrs != null && qrs >= 120 ? "abnormal" : qrs != null ? "normal" : "unknown",
      wave: "QRS",
    },
    {
      explanation:
        st > 1 ? `ST elevation pattern suggested (${st.toFixed(1)} mm).` : st < -0.5 ? `ST depression pattern suggested (${st.toFixed(1)} mm).` : "ST segment near isoelectric baseline.",
      interpretation: st > 1 ? "ST elevation" : st < -0.5 ? "ST depression" : "Isoelectric",
      status: Math.abs(st) > 1 ? "abnormal" : "normal",
      wave: "ST Segment",
    },
    {
      explanation: tAmp > 0.1 ? "T wave amplitude within measurable range." : "T wave amplitude reduced or inverted pattern possible.",
      interpretation: tAmp > 0.1 ? "Normal polarity suggested" : "Low or abnormal T wave",
      status: tAmp > 0.1 ? "normal" : "borderline",
      wave: "T wave",
    },
    {
      explanation: qt != null ? `QT interval ${qt} ms on measured waveform.` : "QT interval pending measurement.",
      interpretation: qt != null && qt > 440 ? "Prolonged QT" : "Within expected range",
      status: qt != null && qt > 440 ? "abnormal" : qt != null ? "normal" : "unknown",
      wave: "QT",
    },
  ];
}

function buildStAnalysis(
  findings: CardiologistStructuredFinding[],
  engine?: DigitalEcg["measurementEngine"],
): CardiologistStFinding[] {
  const stMm = engine?.amplitudes?.stDeviationMm ?? 0;
  const rows: CardiologistStFinding[] = [];

  for (const finding of findings.filter((item) => ISCHEMIA_CODES.has(item.code) || /st|ischemia|infarct/i.test(item.label))) {
    const pattern: CardiologistStFinding["pattern"] =
      /depression/i.test(finding.label) ? "depression" : /reciprocal/i.test(finding.explanation) ? "reciprocal" : /diffuse/i.test(finding.label) ? "diffuse" : "elevation";
    rows.push({
      affectedLeads: finding.affectedLeads,
      explanation: finding.explanation,
      label: finding.label,
      pattern,
    });
  }

  if (!rows.length && stMm > 1) {
    rows.push({
      affectedLeads: ["II", "III", "aVF"],
      explanation: `ST deviation ${stMm.toFixed(1)} mm measured on digitized waveform.`,
      label: "ST Elevation pattern",
      pattern: "elevation",
    });
  }
  if (!rows.length && stMm < -0.5) {
    rows.push({
      affectedLeads: ["V4", "V5", "V6"],
      explanation: `ST depression ${stMm.toFixed(1)} mm measured on digitized waveform.`,
      label: "ST Depression pattern",
      pattern: "depression",
    });
  }

  return rows;
}

function buildDifferential(report?: MedicalIntelligenceReport | null, analysis?: AIAnalysisResult | null, digitalEcg?: DigitalEcg | null): CardiologistDifferentialRow[] {
  if (report?.findings.length) {
    const primary = report.findings[0];
    if (primary?.differentialDiagnosis.length) {
      return primary.differentialDiagnosis.map((item) => ({
        confidence: Math.round(item.likelihood * 100),
        distinguishingFeatures: item.distinguishingFeatures,
        explanation: item.explanation,
        label: item.label,
        rank: item.rank,
      }));
    }
  }

  const top = digitalEcg?.aiDiagnosis?.topDiagnoses ?? [];
  if (top.length) {
    return top.slice(0, 5).map((item, index) => ({
      confidence: Math.round((item.probability ?? item.confidence) * 100),
      distinguishingFeatures: item.evidence,
      explanation: item.label,
      label: item.label,
      rank: index + 1,
    }));
  }

  if (analysis?.diagnosis) {
    return [{ confidence: Math.round((analysis.confidenceScore ?? 0) * 100), distinguishingFeatures: [], explanation: analysis.interpretation, label: analysis.diagnosis, rank: 1 }];
  }

  return [];
}

function buildRecommendations(
  report?: MedicalIntelligenceReport | null,
  analysis?: AIAnalysisResult | null,
  digitalEcg?: DigitalEcg | null,
): CardiologistRecommendationRow[] {
  if (report?.recommendations.length) {
    return report.recommendations.map((item) => ({
      action: item.action,
      priority: item.priority,
      rationale: item.rationale,
      timeframe: item.timeframe,
    }));
  }

  const recs = digitalEcg?.interpretationEngine?.recommendations ?? analysis?.recommendations ?? [];
  return recs.map((action) => ({ action, priority: "routine", rationale: "Derived from clinical interpretation engine." }));
}

export function buildCardiologistModel(input: CardiologistBuildInput): CardiologistWorkspaceModel {
  const { analysis, digitalEcg, explainability, medicalReport } = input;
  const engine = digitalEcg?.measurementEngine;
  const flat = digitalEcg?.measurements;
  const interpretation = digitalEcg?.interpretationEngine;

  const reportFindings = medicalReport?.findings.map(mapReportFinding) ?? [];
  const interpretationFindings =
    interpretation?.findings.map((item) =>
      toFinding(item.code, item.label, item.category, item.severity, Math.round(item.confidence * 100), item.confidence >= 0.7 ? "high" : "medium", item.evidence.map((e) => `${e.feature}: ${e.value}`).join("; ")),
    ) ?? [];

  const mergedFindings = reportFindings.length ? reportFindings : interpretationFindings;

  const heartRate = engine?.heartRate ?? flat?.heartRate ?? analysis?.heartRate ?? null;
  const rhythmLabel = engine?.rhythm?.replace(/_/g, " ") ?? analysis?.rhythm ?? interpretation?.primaryDiagnosis ?? "Pending analysis";
  const regularity: CardiologistWorkspaceModel["rhythm"]["regularity"] =
    engine?.rhythm === "irregular" ? "Irregular" : engine?.rhythm ? "Regular" : "Unknown";
  const rrMs = engine?.intervals?.rrIntervalMs ?? flat?.rrIntervalMs ?? null;
  const rrVariability =
    heartRate && rrMs
      ? `${Math.round((Math.abs(rrMs - 60000 / Math.max(heartRate, 1)) / rrMs) * 100)}%`
      : "Not measured";
  const prMs = engine?.intervals?.prIntervalMs ?? flat?.prIntervalMs ?? null;
  const prStatus = prMs == null ? "Unknown" : prMs > 200 ? "Prolonged" : prMs < 120 ? "Short" : "Normal";

  const axisDeg = engine?.axis?.meanQrsAxisDeg ?? null;
  const axisInfo = classifyAxis(axisDeg);
  const axisConfidence = medicalReport?.findings.find((f) => f.category === "axis")?.confidence.score ?? engine?.confidence ?? interpretation?.confidence ?? 0;

  const intervals = ["PR", "QRS", "QT", "QTc", "RR", "PP"].map((name) => {
    const value =
      name === "PR"
        ? prMs
        : name === "QRS"
          ? engine?.intervals?.qrsDurationMs ?? null
          : name === "QT"
            ? engine?.intervals?.qtIntervalMs ?? flat?.qtIntervalMs ?? null
            : name === "QTc"
              ? engine?.intervals?.qtcBazettMs ?? flat?.qtcBazettMs ?? null
              : name === "RR"
                ? rrMs
                : rrMs;
    const meta = intervalStatus(name, value);
    return { flag: meta.flag, name, normalRange: meta.normalRange, status: meta.status, unit: "ms", value };
  });

  const arrhythmias = mergedFindings.filter((f) => RHYTHM_CODES.has(f.code) || f.category === "rhythm");
  const blocks = mergedFindings.filter((f) => BLOCK_CODES.has(f.code) || f.category === "conduction");
  const hypertrophy = mergedFindings.filter((f) => HYPERTROPHY_CODES.has(f.code) || f.category === "hypertrophy");
  const ischemia = mergedFindings.filter((f) => ISCHEMIA_CODES.has(f.code) || f.category === "ischemia");

  const waveAnalysis = buildWaveAnalysis(engine, engine?.amplitudes?.stDeviationMm);
  const stAnalysis = buildStAnalysis(ischemia, engine);

  const primaryLabel =
    medicalReport?.primaryDiagnosis.label ??
    interpretation?.primaryDiagnosis ??
    digitalEcg?.aiDiagnosis?.primaryDiagnosis ??
    analysis?.diagnosis ??
    "Pending AI cardiologist analysis";
  const primaryCode = medicalReport?.primaryDiagnosis.code ?? mergedFindings[0]?.code ?? "PENDING";
  const rawPrimaryConfidence =
    medicalReport?.primaryDiagnosis.confidence.score ?? analysis?.confidenceScore ?? interpretation?.confidence ?? engine?.confidence ?? 0;
  const primaryConfidence = Math.round(rawPrimaryConfidence <= 1 ? rawPrimaryConfidence * 100 : rawPrimaryConfidence);

  const clinicalImpression =
    medicalReport?.explainabilitySummary ??
    interpretation?.report?.summary ??
    analysis?.interpretation ??
    digitalEcg?.aiDiagnosis?.clinicalReasoning ??
    "Run digitization and AI analysis to generate a structured cardiologist interpretation.";

  const signalQuality = digitalEcg?.validation?.signalContinuityPercent != null
    ? `${Math.round(digitalEcg.validation.signalContinuityPercent)}% continuity`
    : digitalEcg?.quality?.score != null
      ? `Quality score ${Math.round(digitalEcg.quality.score * 100)}%`
      : "Unknown";
  const leadQuality =
    digitalEcg?.validation?.leadDetectionPercent != null
      ? `${Math.round(digitalEcg.validation.leadDetectionPercent)}% leads detected`
      : digitalEcg?.leadSegments?.length
        ? `${digitalEcg.leadSegments.length}/12 segments`
        : "Unknown";
  const imageQuality =
    digitalEcg?.validation?.digitizationAccuracy != null
      ? `${Math.round(digitalEcg.validation.digitizationAccuracy)}% digitization accuracy`
      : digitalEcg?.calibration?.gridDetected
        ? "Grid detected"
        : "Pending";

  const evidenceUsed = [
    ...(medicalReport?.findings[0]?.explainability.supportingEvidence ?? []),
    ...(explainability?.leadHighlights?.map((h) => `${h.lead}: ${h.finding}`) ?? []),
  ].slice(0, 8);

  return {
    arrhythmias,
    axis: {
      classification: axisInfo.classification,
      confidence: Math.round((axisConfidence <= 1 ? axisConfidence * 100 : axisConfidence) || 0),
      degrees: axisDeg,
      explanation: axisInfo.explanation,
    },
    blocks,
    clinicalImpression,
    confidence: {
      evidenceUsed,
      imageQuality,
      leadQuality,
      overall: medicalReport ? Math.round(medicalReport.overallConfidence.score * 100) : primaryConfidence,
      overallLevel: medicalReport?.overallConfidence.level ?? (primaryConfidence >= 70 ? "high" : primaryConfidence >= 50 ? "medium" : "low"),
      signalQuality,
    },
    differential: buildDifferential(medicalReport, analysis, digitalEcg),
    hypertrophy,
    intervals,
    ischemia,
    loaded: Boolean(medicalReport || digitalEcg?.measurementEngine || analysis),
    primaryDiagnosis: { code: primaryCode, confidence: primaryConfidence, label: primaryLabel },
    recommendations: buildRecommendations(medicalReport, analysis, digitalEcg),
    rhythm: {
      heartRate,
      pWaveDetected: (engine?.amplitudes?.pWaveAmplitudeMv ?? 0) > 0.05,
      prStatus,
      regularity,
      rhythm: rhythmLabel,
      rrVariability,
    },
    stAnalysis,
    waveAnalysis,
  };
}

export function buildCardiologistModelFromSources(
  analysis?: AIAnalysisResult | null,
  explainability?: AIExplainability | null,
  digitalEcg?: DigitalEcg | null,
  medicalReport?: MedicalIntelligenceReport | null,
) {
  return buildCardiologistModel({ analysis, digitalEcg, explainability, medicalReport });
}
