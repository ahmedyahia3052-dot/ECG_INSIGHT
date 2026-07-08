import type { InterpretationEvidence, InterpretationSeverity } from "../../ecg-interpretation/types";

export interface InterpretationSectionBase {
  classification: string;
  confidence: number;
  evidence: InterpretationEvidence[];
  interpretation: string;
  knowledgeDiagnosisId: string | null;
  label: string;
  severity: InterpretationSeverity;
}

export interface RhythmSection extends InterpretationSectionBase {
  rhythmCode: string;
}

export interface RateSection extends InterpretationSectionBase {
  heartRateBpm: number;
  rateCategory: "normal" | "fast" | "slow";
}

export interface AxisSection extends InterpretationSectionBase {
  axisDegrees: number;
}

export interface IntervalValue {
  interpretation: string;
  ms: number;
  normal: boolean;
  unit: "ms";
}

export interface IntervalsSection {
  confidence: number;
  interpretation: string;
  pr: IntervalValue;
  qrs: IntervalValue;
  qt: IntervalValue;
  qtc: IntervalValue;
  rr: IntervalValue;
  severity: InterpretationSeverity;
}

export interface ConductionSection extends InterpretationSectionBase {
  blocks: string[];
}

export interface HypertrophySection extends InterpretationSectionBase {
  findings: string[];
}

export interface StSegmentSection extends InterpretationSectionBase {
  deviationMm: number;
}

export interface TWaveSection extends InterpretationSectionBase {
  amplitudeMv: number;
}

export interface QWaveSection extends InterpretationSectionBase {
  pathologic: boolean;
}

export interface ClinicalImpressionSection {
  confidence: number;
  differentialDiagnoses: string[];
  primaryDiagnosis: string;
  recommendations: string[];
  severity: InterpretationSeverity;
  summary: string;
  urgency: InterpretationSeverity;
}

export interface EnterpriseEcgInterpretation {
  axis: AxisSection;
  caseId?: string;
  clinicalImpression: ClinicalImpressionSection;
  conduction: ConductionSection;
  engineVersion: string;
  generatedAt: string;
  hypertrophy: HypertrophySection;
  intervals: IntervalsSection;
  performanceMs: number;
  qWave: QWaveSection;
  rate: RateSection;
  rhythm: RhythmSection;
  stSegment: StSegmentSection;
  tWave: TWaveSection;
}
