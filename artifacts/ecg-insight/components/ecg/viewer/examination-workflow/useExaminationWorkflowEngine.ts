import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AIAnalysisResult } from "@/services/ai";
import type { ApiECGCase } from "@/services/clinical";
import type { DigitalEcg } from "@/services/ecgProcessing";
import type { MedicalIntelligenceReport } from "@/services/medicalIntelligence";

import { buildCardiologistModel } from "../ai-cardiologist/buildCardiologistModel";
import {
  advanceExaminationStep,
  fetchExaminationSession,
  refreshExaminationQuality,
  reviewExaminationFinding,
  saveExaminationImpression,
  signExaminationSession,
  updateExaminationClinicalInfo,
} from "./examinationApi";
import { buildExaminationReportModel } from "./buildExaminationReportModel";
import {
  buildExaminationStepViews,
  EXAMINATION_STEP_ORDER,
  lifecycleLabel,
  type DoctorFindingReviewStatus,
  type ExaminationSession,
  type ExaminationStepId,
} from "./types";

export function useExaminationWorkflowEngine(input: {
  accessToken?: string;
  analysis?: AIAnalysisResult | null;
  caseId?: string;
  caseRecord: ApiECGCase;
  digitalEcg?: DigitalEcg | null;
  measurementCount?: number;
  medicalReport?: MedicalIntelligenceReport | null;
  onFocusTab?: (tab: "acquisition" | "ai" | "cdss" | "measurements" | "reports") => void;
  operatorName?: string;
  patient?: { age?: number; firstName?: string; fullName?: string; gender?: string; id?: string; lastName?: string; medicalHistory?: string; medications?: string; diabetes?: boolean; hypertension?: boolean; ischemicHeartDisease?: boolean; obesity?: boolean } | null;
}) {
  const queryClient = useQueryClient();
  const [localClinicalInfo, setLocalClinicalInfo] = useState({
    chiefComplaint: input.caseRecord.clinicalIndication ?? "",
    clinicalContext: input.caseRecord.clinicalNotes ?? "",
    history: input.patient?.medicalHistory ?? "",
    medications: input.patient?.medications ?? "",
    riskFactors: [
      input.patient?.hypertension ? "Hypertension" : null,
      input.patient?.diabetes ? "Diabetes" : null,
      input.patient?.obesity ? "Obesity" : null,
      input.patient?.ischemicHeartDisease ? "Ischemic heart disease" : null,
    ].filter(Boolean) as string[],
    symptoms: input.caseRecord.clinicalIndication ? [input.caseRecord.clinicalIndication] : [],
  });

  const sessionQuery = useQuery({
    enabled: Boolean(input.accessToken && input.caseId),
    queryFn: () => fetchExaminationSession(input.caseId!, input.accessToken!),
    queryKey: ["examination-session", input.caseId],
  });

  const session = sessionQuery.data?.session;

  useEffect(() => {
    if (!session?.clinicalInfo) return;
    setLocalClinicalInfo((current) => ({
      chiefComplaint: session.clinicalInfo.chiefComplaint ?? current.chiefComplaint,
      clinicalContext: session.clinicalInfo.clinicalContext ?? current.clinicalContext,
      history: session.clinicalInfo.history ?? current.history,
      medications: session.clinicalInfo.medications ?? current.medications,
      riskFactors: session.clinicalInfo.riskFactors ?? current.riskFactors,
      symptoms: session.clinicalInfo.symptoms ?? current.symptoms,
    }));
  }, [session?.clinicalInfo]);

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["examination-session", input.caseId] });
  }, [input.caseId, queryClient]);

  const saveClinicalInfoMutation = useMutation({
    mutationFn: () =>
      updateExaminationClinicalInfo(input.caseId!, input.accessToken!, localClinicalInfo),
    onSuccess: invalidate,
  });

  const advanceMutation = useMutation({
    mutationFn: (stepId?: ExaminationStepId) =>
      advanceExaminationStep(input.caseId!, input.accessToken!, stepId),
    onSuccess: invalidate,
  });

  const qualityMutation = useMutation({
    mutationFn: () =>
      refreshExaminationQuality(input.caseId!, input.accessToken!, {
        leadCount: input.digitalEcg?.leads?.length ?? input.digitalEcg?.leadSegments?.length,
        measurementCount: input.measurementCount,
      }),
    onSuccess: invalidate,
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: {
      findingId: string;
      label: string;
      modifiedText?: string;
      reason?: string;
      status: DoctorFindingReviewStatus;
    }) => reviewExaminationFinding(input.caseId!, input.accessToken!, payload),
    onSuccess: invalidate,
  });

  const impressionMutation = useMutation({
    mutationFn: (payload: { finalDiagnosis?: string; finalImpression?: string; finalRecommendations?: string[] }) =>
      saveExaminationImpression(input.caseId!, input.accessToken!, payload),
    onSuccess: invalidate,
  });

  const signMutation = useMutation({
    mutationFn: () => signExaminationSession(input.caseId!, input.accessToken!),
    onSuccess: invalidate,
  });

  const stepViews = useMemo(
    () => buildExaminationStepViews(session ?? fallbackSession(input)),
    [input, session],
  );

  const cardiologistModel = useMemo(
    () =>
      buildCardiologistModel({
        analysis: input.analysis,
        digitalEcg: input.digitalEcg,
        medicalReport: input.medicalReport,
      }),
    [input.analysis, input.digitalEcg, input.medicalReport],
  );

  const allFindings = useMemo(
    () => [...cardiologistModel.arrhythmias, ...cardiologistModel.blocks, ...cardiologistModel.hypertrophy, ...cardiologistModel.ischemia],
    [cardiologistModel],
  );

  const pendingFindings = useMemo(() => {
    const reviewed = new Set((session?.doctorFindings ?? []).map((row) => row.findingId));
    return allFindings.filter((finding) => !reviewed.has(finding.id));
  }, [allFindings, session?.doctorFindings]);

  const reportModel = useMemo(
    () =>
      buildExaminationReportModel({
        analysis: input.analysis,
        caseRecord: input.caseRecord,
        digitalEcg: input.digitalEcg,
        medicalReport: input.medicalReport,
        operatorName: input.operatorName,
        patient: input.patient,
        session: session ?? fallbackSession(input),
      }),
    [input, session],
  );

  const navigateStep = useCallback(
    (stepId: ExaminationStepId) => {
      if (stepId === "acquire-ecg" || stepId === "digitize-ecg") input.onFocusTab?.("acquisition");
      if (stepId === "measurement-studio") input.onFocusTab?.("measurements");
      if (stepId === "ai-cardiologist") input.onFocusTab?.("ai");
      if (stepId === "clinical-decision-support") input.onFocusTab?.("cdss");
      if (stepId === "generate-final-report") input.onFocusTab?.("reports");
    },
    [input],
  );

  const progress = useMemo(() => {
    const completed = session?.completedSteps.length ?? 0;
    return Math.round((completed / EXAMINATION_STEP_ORDER.length) * 100);
  }, [session?.completedSteps.length]);

  return {
    advance: (stepId?: ExaminationStepId) => advanceMutation.mutateAsync(stepId),
    advancePending: advanceMutation.isPending,
    lifecycleLabel: lifecycleLabel(session?.lifecycleStatus ?? "pending"),
    localClinicalInfo,
    navigateStep,
    pendingFindings,
    progress,
    quality: session?.quality,
    refreshQuality: () => qualityMutation.mutateAsync(),
    reportModel,
    reviewFinding: reviewMutation.mutateAsync,
    saveClinicalInfo: () => saveClinicalInfoMutation.mutateAsync(),
    saveImpression: impressionMutation.mutateAsync,
    session,
    sessionLoading: sessionQuery.isLoading,
    setLocalClinicalInfo,
    sign: () => signMutation.mutateAsync(),
    signPending: signMutation.isPending,
    stepViews,
    timeline: session?.timeline ?? [],
  };
}

function fallbackSession(input: {
  caseId?: string;
  caseRecord: ApiECGCase;
  operatorName?: string;
}): ExaminationSession {
  const stamp = new Date().toISOString();
  return {
    caseId: input.caseId ?? input.caseRecord.id,
    clinicalInfo: {},
    completedSteps: [],
    createdAt: stamp,
    currentStepId: "create-examination",
    doctorFindings: [],
    id: "local",
    lifecycleStatus: "pending",
    pipelineVersion: "examination-workflow-v48.0",
    startedById: "local",
    startedByName: input.operatorName ?? "Clinician",
    timeline: [],
    updatedAt: stamp,
  };
}
