import { apiRequest } from "@/services/api";

import type {
  DoctorFindingReviewStatus,
  ExaminationClinicalInfo,
  ExaminationSession,
  ExaminationStepId,
} from "./types";

export async function fetchExaminationSession(caseId: string, accessToken: string) {
  return apiRequest<{ session: ExaminationSession; summary: Record<string, unknown> }>(
    `/cases/${caseId}/examination/session`,
    { accessToken },
  );
}

export async function updateExaminationClinicalInfo(
  caseId: string,
  accessToken: string,
  clinicalInfo: Partial<ExaminationClinicalInfo>,
) {
  return apiRequest<{ session: ExaminationSession }>(`/cases/${caseId}/examination/clinical-info`, {
    accessToken,
    body: JSON.stringify(clinicalInfo),
    method: "PUT",
  });
}

export async function advanceExaminationStep(caseId: string, accessToken: string, stepId?: ExaminationStepId) {
  return apiRequest<{ session: ExaminationSession }>(`/cases/${caseId}/examination/advance`, {
    accessToken,
    body: JSON.stringify(stepId ? { stepId } : {}),
    method: "POST",
  });
}

export async function refreshExaminationQuality(
  caseId: string,
  accessToken: string,
  input?: { leadCount?: number; measurementCount?: number },
) {
  return apiRequest<{ session: ExaminationSession }>(`/cases/${caseId}/examination/quality`, {
    accessToken,
    body: JSON.stringify(input ?? {}),
    method: "POST",
  });
}

export async function reviewExaminationFinding(
  caseId: string,
  accessToken: string,
  input: {
    findingId: string;
    label: string;
    modifiedText?: string;
    reason?: string;
    status: DoctorFindingReviewStatus;
  },
) {
  return apiRequest<{ session: ExaminationSession }>(`/cases/${caseId}/examination/findings/review`, {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function saveExaminationImpression(
  caseId: string,
  accessToken: string,
  input: { finalDiagnosis?: string; finalImpression?: string; finalRecommendations?: string[] },
) {
  return apiRequest<{ session: ExaminationSession }>(`/cases/${caseId}/examination/impression`, {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function signExaminationSession(caseId: string, accessToken: string) {
  return apiRequest<{ session: ExaminationSession }>(`/cases/${caseId}/examination/sign`, {
    accessToken,
    method: "POST",
  });
}
