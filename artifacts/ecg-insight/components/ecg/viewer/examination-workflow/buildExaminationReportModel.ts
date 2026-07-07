import type { AIAnalysisResult } from "@/services/ai";
import type { ApiECGCase } from "@/services/clinical";
import type { DigitalEcg } from "@/services/ecgProcessing";
import type { MedicalIntelligenceReport } from "@/services/medicalIntelligence";

import { buildCardiologistModel } from "../ai-cardiologist/buildCardiologistModel";
import type { ExaminationSession } from "./types";

export type ExaminationReportModel = {
  aiFindings: string[];
  clinicalHistory: string[];
  doctorFindings: Array<{ label: string; reason?: string; status: string }>;
  electronicSignature?: { hash: string; signedAt: string; signedByName: string };
  finalDiagnosis: string;
  finalImpression: string;
  measurements: string[];
  patientName: string;
  recommendations: string[];
  studyDate: string;
};

export function buildExaminationReportModel(input: {
  analysis?: AIAnalysisResult | null;
  caseRecord: ApiECGCase;
  digitalEcg?: DigitalEcg | null;
  medicalReport?: MedicalIntelligenceReport | null;
  operatorName?: string;
  patient?: { firstName?: string; fullName?: string; lastName?: string } | null;
  session: ExaminationSession;
}): ExaminationReportModel {
  const cardiologist = buildCardiologistModel({
    analysis: input.analysis,
    digitalEcg: input.digitalEcg,
    medicalReport: input.medicalReport,
  });

  const clinicalHistory = [
    input.session.clinicalInfo.chiefComplaint ? `Chief complaint: ${input.session.clinicalInfo.chiefComplaint}` : null,
    input.session.clinicalInfo.symptoms?.length ? `Symptoms: ${input.session.clinicalInfo.symptoms.join(", ")}` : null,
    input.session.clinicalInfo.medications ? `Medications: ${input.session.clinicalInfo.medications}` : null,
    input.session.clinicalInfo.history ? `History: ${input.session.clinicalInfo.history}` : null,
    input.session.clinicalInfo.riskFactors?.length ? `Risk factors: ${input.session.clinicalInfo.riskFactors.join(", ")}` : null,
  ].filter(Boolean) as string[];

  const measurements = [
    input.digitalEcg?.calibration
      ? `Calibration ${input.digitalEcg.calibration.gainMmPerMv} mm/mV @ ${input.digitalEcg.calibration.paperSpeedMmPerSec} mm/s`
      : null,
    input.analysis?.heartRate != null ? `Heart rate ${input.analysis.heartRate} bpm` : null,
    ...cardiologist.intervals.slice(0, 6).map((row) => `${row.name}: ${row.value ?? "—"} ${row.unit}`),
  ].filter(Boolean) as string[];

  const allFindings = [...cardiologist.arrhythmias, ...cardiologist.blocks, ...cardiologist.hypertrophy, ...cardiologist.ischemia];
  const aiFindings = allFindings.slice(0, 8).map((row) => row.label);

  const doctorFindings = input.session.doctorFindings.map((row) => ({
    label: row.modifiedText ?? row.label,
    reason: row.reason,
    status: row.status,
  }));

  return {
    aiFindings,
    clinicalHistory,
    doctorFindings,
    electronicSignature: input.session.signature
      ? {
          hash: input.session.signature.hash.slice(0, 16),
          signedAt: input.session.signature.signedAt,
          signedByName: input.session.signature.signedByName,
        }
      : undefined,
    finalDiagnosis: input.session.finalDiagnosis ?? input.analysis?.diagnosis ?? "Pending physician validation",
    finalImpression: input.session.finalImpression ?? cardiologist.clinicalImpression,
    measurements,
    patientName:
      input.patient?.fullName ??
      (`${input.patient?.firstName ?? ""} ${input.patient?.lastName ?? ""}`.trim() || "Patient"),
    recommendations:
      input.session.finalRecommendations ??
      cardiologist.recommendations.slice(0, 5).map((row) => row.action),
    studyDate: input.caseRecord.acquisitionDate ?? new Date().toISOString(),
  };
}
