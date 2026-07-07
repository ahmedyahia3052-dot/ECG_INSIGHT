import type { ApiECGCase, ApiPatient } from "@/services/clinical";
import type { MedicalIntelligenceReport } from "@/services/medicalIntelligence";
import type { ClinicalReport } from "@/services/reports";
import type { DigitalEcg } from "@/services/ecgProcessing";

import type { AIAnalysisResult, AIExplainability } from "@/services/ai";
import { buildCardiologistModel } from "../ai-cardiologist/buildCardiologistModel";
import type { CardiologistWorkspaceModel } from "../ai-cardiologist/types";
import { STANDARD_ECG_LEADS } from "../types";
import type { EcgClinicalMeasurement } from "../measurementTypes";
import type {
  EnterpriseClinicalReportModel,
  EnterpriseCriticalAlert,
  EnterpriseLeadSummary,
  EnterprisePreviousComparison,
} from "./types";

function patientAge(dob?: string | null) {
  if (!dob) return "—";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "—";
  const years = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000));
  return `${years} y`;
}

function criticalAlertsFromFindings(
  findings: CardiologistWorkspaceModel["arrhythmias"],
  ischemia: CardiologistWorkspaceModel["ischemia"],
  intervals: CardiologistWorkspaceModel["intervals"],
): EnterpriseCriticalAlert[] {
  const alerts: EnterpriseCriticalAlert[] = [];
  for (const item of [...findings, ...ischemia]) {
    if (item.severity === "critical" || item.severity === "urgent") {
      alerts.push({
        priority: item.severity === "critical" ? "P1" : "P2",
        recommendedAction: item.severity === "critical" ? "Immediate physician review and escalation per ACS protocol." : "Urgent cardiology review recommended.",
        severity: item.severity,
        title: item.label,
      });
    }
  }
  const qtc = intervals.find((row) => row.name === "QTc");
  if (qtc?.value != null && qtc.value > 500) {
    alerts.push({
      priority: "P1",
      recommendedAction: "Review medications, electrolytes, and consider cardiology consult.",
      severity: "critical",
      title: "Critical QT Prolongation",
    });
  }
  return alerts;
}

function buildLeadSummary(
  findings: CardiologistWorkspaceModel["ischemia"],
  hypertrophy: CardiologistWorkspaceModel["hypertrophy"],
): EnterpriseLeadSummary[] {
  return [...STANDARD_ECG_LEADS, "Rhythm Strip" as const].map((lead) => {
    const related = [...findings, ...hypertrophy].filter((f) => f.affectedLeads.includes(lead as never));
    return {
      confidence: related.length ? Math.max(...related.map((f) => f.confidence)) : 0,
      findings: related.map((f) => f.label),
      lead,
      status: related.length ? "abnormal" : "normal",
    };
  });
}

function buildPreviousComparison(_ecgCase: ApiECGCase): EnterprisePreviousComparison {
  return {
    available: false,
    clinicalChangeSummary: "No prior ECG linked for automated comparison.",
    findingsAdded: [],
    findingsRemoved: [],
  };
}

export function buildEnterpriseReportModel(input: {
  analysis?: AIAnalysisResult | null;
  clinicalReport?: ClinicalReport | null;
  digitalEcg?: DigitalEcg | null;
  ecgCase: ApiECGCase;
  explainability?: AIExplainability | null;
  imageUrl?: string;
  measurements?: EcgClinicalMeasurement[];
  medicalReport?: MedicalIntelligenceReport | null;
  patient: ApiPatient;
  processedImageUrl?: string;
  reportType?: EnterpriseClinicalReportModel["reportType"];
}): EnterpriseClinicalReportModel {
  const model = buildCardiologistModel({
    analysis: input.analysis,
    digitalEcg: input.digitalEcg,
    explainability: input.explainability,
    medicalReport: input.medicalReport,
  });
  const studyDate = input.ecgCase.uploadDate ?? input.clinicalReport?.acquisitionDate ?? new Date().toISOString();
  const study = new Date(studyDate);

  const manualMeasurements = (input.measurements ?? []).filter((m) => !m.hidden);
  const miFindings = input.medicalReport?.findings ?? [];

  const aiFindings = miFindings.length
    ? miFindings.map((finding) => ({
        affectedLeads: (finding.explainability.supportingEvidence.join(" ").match(/Lead [IVVa-z0-9]+/g) ?? []) as never[],
        clinicalImportance: finding.urgency,
        confidence: Math.round(finding.confidence.score * 100),
        evidence: finding.explainability.supportingEvidence,
        explanation: finding.explainability.rationale,
        guideline: finding.category,
        severity: finding.severity,
        status: finding.urgency,
        supportingMeasurements: manualMeasurements
          .filter((m) => finding.explainability.supportingEvidence.some((e) => e.toLowerCase().includes(m.kind)))
          .map((m) => `${m.name}: ${m.value} ${m.unit}`),
        title: finding.label,
      }))
    : [...model.arrhythmias, ...model.blocks, ...model.hypertrophy, ...model.ischemia].map((f) => ({
        affectedLeads: f.affectedLeads,
        clinicalImportance: f.severity,
        confidence: f.confidence,
        evidence: f.criteria ?? [f.explanation],
        explanation: f.explanation,
        guideline: f.category,
        severity: f.severity,
        status: f.severity,
        supportingMeasurements: manualMeasurements.filter((m) => f.explanation.toLowerCase().includes(m.kind.replace(/_/g, " "))).map((m) => `${m.name}: ${m.value} ${m.unit}`),
        title: f.label,
      }));

  const differential = input.medicalReport?.findings.flatMap((f) =>
    f.differentialDiagnosis.map((d) => ({
      clinicalNotes: d.explanation,
      contradictingFindings: f.explainability.conflictingEvidence,
      diagnosis: d.label,
      probability: Math.round(d.likelihood * 100),
      supportingFindings: d.distinguishingFeatures,
    })),
  ).slice(0, 8) ?? model.differential.map((d) => ({
    clinicalNotes: d.explanation,
    contradictingFindings: [],
    diagnosis: d.label,
    probability: d.confidence,
    supportingFindings: d.distinguishingFeatures,
  }));

  const recommendations = input.medicalReport?.recommendations.map((r) => ({
    action: r.action,
    priority: r.priority,
    rationale: r.rationale,
    timeframe: r.timeframe,
  })) ?? model.recommendations;

  const impressionLines = [
    model.primaryDiagnosis.label,
    model.rhythm.rhythm,
    model.clinicalImpression,
    ...(input.clinicalReport?.finalPhysicianImpression ? [input.clinicalReport.finalPhysicianImpression] : []),
  ].filter(Boolean);

  const uniqueImpression = [...new Set(impressionLines.map((line) => line.trim()).filter(Boolean))];

  return {
    aiFindings,
    clinicalImpression: uniqueImpression.length ? uniqueImpression : ["Pending structured clinical impression."],
    confidence: [
      { label: "Image Confidence", percent: model.confidence.imageQuality.includes("%") ? parseInt(model.confidence.imageQuality, 10) || 0 : 75 },
      { label: "Digitization Confidence", percent: input.digitalEcg?.validation?.digitizationAccuracy ?? 70 },
      { label: "Measurement Confidence", percent: manualMeasurements.length ? 85 : 60 },
      { label: "AI Confidence", percent: model.confidence.overall },
      { label: "Interpretation Confidence", percent: model.primaryDiagnosis.confidence },
      { label: "Overall Confidence", percent: input.medicalReport ? Math.round(input.medicalReport.overallConfidence.score * 100) : model.confidence.overall },
    ],
    criticalAlerts: criticalAlertsFromFindings(model.arrhythmias, model.ischemia, model.intervals),
    differential,
    doctorReview: {
      approvalDate: input.clinicalReport?.signedAt ?? input.clinicalReport?.finalizedAt,
      doctorNotes: input.clinicalReport?.clinicalIndication ?? "",
      electronicSignature: input.clinicalReport?.electronicSignaturePath ? "Electronically signed" : undefined,
      finalDiagnosis: input.clinicalReport?.finalPhysicianImpression ?? model.primaryDiagnosis.label,
      licenseNumber: input.clinicalReport?.physicianLicenseNumber,
      signatureName: input.clinicalReport?.physicianName,
    },
    ecgParameters: [
      { confidence: model.confidence.signalQuality, label: "Heart Rate", unit: "bpm", value: model.rhythm.heartRate != null ? String(Math.round(model.rhythm.heartRate)) : "—" },
      ...model.intervals.map((row) => ({ confidence: row.status, label: row.name, unit: row.unit, value: row.value != null ? String(Math.round(row.value)) : "—" })),
      { label: "P Axis", unit: "°", value: model.axis.degrees != null ? String(model.axis.degrees) : "—" },
      { label: "QRS Axis", unit: "°", value: model.axis.degrees != null ? String(model.axis.degrees) : "—" },
      { label: "T Axis", unit: "°", value: "—" },
      { label: "Rhythm", unit: "", value: model.rhythm.rhythm },
      { label: "Gain", unit: "mm/mV", value: String(input.digitalEcg?.calibration?.gainMmPerMv ?? 10) },
      { label: "Speed", unit: "mm/s", value: String(input.digitalEcg?.calibration?.paperSpeedMmPerSec ?? 25) },
      { label: "Filter", unit: "", value: "Standard clinical bandpass" },
      { label: "Sampling Frequency", unit: "Hz", value: input.digitalEcg?.leads[0]?.samplingRate != null ? String(input.digitalEcg.leads[0].samplingRate) : "—" },
      { label: "Signal Quality", unit: "", value: model.confidence.signalQuality },
      { label: "Measurement Confidence", unit: "", value: manualMeasurements.length ? "High (manual calipers present)" : "Engine derived" },
    ],
    header: {
      acquisitionSource: input.ecgCase.ecgType ?? "Digital ECG",
      caseId: input.ecgCase.caseNumber ?? input.ecgCase.caseId,
      department: input.patient.department ?? "Cardiology",
      device: input.ecgCase.aiModelVersion ?? "ECG Insight Workstation",
      gender: input.patient.gender ?? "—",
      mrn: input.patient.medicalRecordNumber ?? input.patient.id,
      orderingPhysician: input.clinicalReport?.referringPhysician ?? input.ecgCase.assignedDoctor?.name ?? "—",
      organization: input.ecgCase.hospitalName ?? input.clinicalReport?.organizationName ?? "ECG Insight Enterprise",
      patientAge: patientAge(input.patient.dateOfBirth),
      patientName: `${input.patient.firstName} ${input.patient.lastName}`.trim(),
      reportStatus: input.clinicalReport?.status ?? "draft",
      reviewingPhysician: input.clinicalReport?.physicianName ?? "—",
      studyDate: study.toLocaleDateString(),
      studyTime: study.toLocaleTimeString(),
    },
    leadSummary: buildLeadSummary(model.ischemia, model.hypertrophy),
    previousComparison: buildPreviousComparison(input.ecgCase),
    recommendations,
    reportNumber: input.clinicalReport?.reportNumber,
    reportType: input.reportType ?? "clinical",
    snapshots: {
      aiOverlayUrl: input.processedImageUrl ?? input.imageUrl,
      caliperSnapshotNote: manualMeasurements.length ? `${manualMeasurements.length} manual measurement(s) attached.` : "No manual calipers recorded.",
      digitizedEcgUrl: input.processedImageUrl,
      originalEcgUrl: input.imageUrl,
      processedEcgUrl: input.processedImageUrl,
    },
  };
}
