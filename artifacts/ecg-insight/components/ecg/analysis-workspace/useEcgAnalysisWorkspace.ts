import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

import { buildEcgClinicalFindings } from "@/components/ecg/viewer/useEcgClinicalFindings";
import { buildCaseTimelineEvents } from "@/components/ecg/viewer/clinical-workflow";
import { getAIExplainability, getAIResult, submitDoctorReview } from "@/services/ai";
import { API_URL } from "@/services/api";
import {
  approveCase,
  getCase,
  getPatientEcgHistory,
  rejectCase,
  reviewCase,
  updateCaseStatus,
} from "@/services/clinical";
import { getDigitalECG } from "@/services/ecgProcessing";
import { downloadReportPdf, generateReport, listReports, reportPrintUrl } from "@/services/reports";

export function useEcgAnalysisWorkspace(accessToken: string | undefined, caseId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [doctorDiagnosis, setDoctorDiagnosis] = useState("");
  const [doctorImpression, setDoctorImpression] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const caseQuery = useQuery({
    enabled: !!accessToken && !!caseId,
    queryFn: () => getCase(accessToken!, caseId),
    queryKey: ["ecg-analysis-workspace-case", accessToken, caseId],
    retry: false,
  });

  const analysisQuery = useQuery({
    enabled: !!accessToken && !!caseId,
    queryFn: () => getAIResult(accessToken!, caseId),
    queryKey: ["ecg-analysis-workspace-ai", accessToken, caseId],
    retry: false,
  });

  const explainabilityQuery = useQuery({
    enabled: !!accessToken && !!caseId,
    queryFn: () => getAIExplainability(accessToken!, caseId),
    queryKey: ["ecg-analysis-workspace-explainability", accessToken, caseId],
    retry: false,
  });

  const digitalEcgQuery = useQuery({
    enabled: !!accessToken && !!caseId,
    queryFn: () => getDigitalECG(accessToken!, caseId),
    queryKey: ["ecg-analysis-workspace-digital", accessToken, caseId],
    retry: false,
  });

  const historyQuery = useQuery({
    enabled: !!accessToken && !!caseQuery.data?.case.patientId,
    queryFn: () => getPatientEcgHistory(accessToken!, caseQuery.data!.case.patientId),
    queryKey: ["ecg-analysis-workspace-history", accessToken, caseQuery.data?.case.patientId],
    retry: false,
  });

  const reportsQuery = useQuery({
    enabled: !!accessToken && !!caseId,
    queryFn: async () => {
      const params = new URLSearchParams({ caseId, pageSize: "5" });
      return listReports(accessToken!, params);
    },
    queryKey: ["ecg-analysis-workspace-reports", accessToken, caseId],
    retry: false,
  });

  const ecgCase = caseQuery.data?.case;
  const analysis = analysisQuery.data?.analysis;
  const explainability = explainabilityQuery.data?.explainability;
  const digitalEcg = digitalEcgQuery.data?.digitalEcg;

  useEffect(() => {
    if (!ecgCase) return;
    setDoctorDiagnosis(ecgCase.doctorDiagnosis ?? ecgCase.finalDiagnosis ?? ecgCase.aiDiagnosis ?? analysis?.diagnosis ?? "");
    setDoctorImpression(ecgCase.clinicalComments ?? analysis?.interpretation ?? "");
    setClinicalNotes(ecgCase.clinicalNotes ?? "");
    setRecommendations(ecgCase.recommendations ?? analysis?.recommendations?.join("\n") ?? "");
  }, [analysis, ecgCase]);

  const findings = useMemo(
    () => (ecgCase ? buildEcgClinicalFindings(ecgCase, undefined, analysis, explainability, digitalEcg) : null),
    [analysis, digitalEcg, ecgCase, explainability],
  );

  const timelineEvents = useMemo(
    () =>
      ecgCase
        ? buildCaseTimelineEvents({
            analysis,
            caseRecord: ecgCase,
            currentViewMode: "ai-review",
            digitalEcg,
          })
        : [],
    [analysis, digitalEcg, ecgCase],
  );

  const previousImageUrl = useMemo(() => {
    const cases = historyQuery.data?.cases ?? [];
    const prior = cases.find((item) => item.id !== ecgCase?.id);
    const path = prior?.imagePath ?? prior?.ecgImage;
    if (!path) return undefined;
    return path.startsWith("http") ? path : `${API_URL.replace(/\/api$/, "")}${path}`;
  }, [ecgCase?.id, historyQuery.data?.cases]);

  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["ecg-analysis-workspace-case", accessToken, caseId] }),
      queryClient.invalidateQueries({ queryKey: ["ecg-analysis-workspace-ai", accessToken, caseId] }),
      queryClient.invalidateQueries({ queryKey: ["ecg-analysis-workspace-reports", accessToken, caseId] }),
      queryClient.invalidateQueries({ queryKey: ["enterprise-ecg-cases", accessToken] }),
    ]);
  }, [accessToken, caseId, queryClient]);

  const saveReviewMutation = useMutation({
    mutationFn: async () => {
      await reviewCase(accessToken!, caseId, {
        clinicalComments: doctorImpression,
        doctorDiagnosis,
        recommendations,
      });
      await submitDoctorReview(accessToken!, caseId, {
        comments: doctorImpression,
        diagnosis: doctorDiagnosis,
        interpretation: clinicalNotes || doctorImpression,
      }).catch(() => null);
    },
    onSuccess: async () => {
      setStatusMessage("Clinical review saved.");
      await invalidate();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      await saveReviewMutation.mutateAsync();
      return approveCase(accessToken!, caseId);
    },
    onSuccess: async () => {
      setStatusMessage("ECG analysis approved.");
      await invalidate();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      rejectCase(accessToken!, caseId, {
        clinicalComments: doctorImpression,
        reason: doctorImpression || "Rejected during analysis review.",
      }),
    onSuccess: async () => {
      setStatusMessage("ECG analysis rejected.");
      await invalidate();
    },
  });

  const requestReviewMutation = useMutation({
    mutationFn: () => updateCaseStatus(accessToken!, caseId, "awaiting_second_opinion"),
    onSuccess: async () => {
      setStatusMessage("Second opinion review requested.");
      await invalidate();
    },
  });

  const reportMutation = useMutation({
    mutationFn: () => generateReport(accessToken!, caseId),
    onSuccess: async (payload) => {
      setStatusMessage(`Report generated: ${payload.report.reportNumber}`);
      await invalidate();
    },
  });

  const exportPdf = useCallback(async () => {
    if (!accessToken) return;
    const activeReport = reportsQuery.data?.reports?.[0];
    const report = activeReport ?? (await reportMutation.mutateAsync()).report;
    if (Platform.OS !== "web" || typeof window === "undefined") {
      setStatusMessage("PDF export is available on web.");
      return;
    }
    const blob = await downloadReportPdf(accessToken, report.id);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setStatusMessage(`Exported PDF: ${report.reportNumber}`);
  }, [accessToken, reportMutation, reportsQuery.data?.reports]);

  const printReport = useCallback(() => {
    const activeReport = reportsQuery.data?.reports?.[0];
    if (!activeReport || Platform.OS !== "web" || typeof window === "undefined") {
      setStatusMessage("Generate a report before printing.");
      return;
    }
    window.open(reportPrintUrl(activeReport.id), "_blank", "noopener,noreferrer");
    setStatusMessage(`Opened print view for ${activeReport.reportNumber}`);
  }, [reportsQuery.data?.reports]);

  const readOnly = ecgCase?.status === "finalized" || ecgCase?.status === "signed";

  return {
    analysis,
    approve: () => approveMutation.mutate(),
    approving: approveMutation.isPending,
    caseId,
    clinicalNotes,
    digitalEcg,
    doctorDiagnosis,
    doctorImpression,
    ecgCase,
    explainability,
    exportPdf: () => void exportPdf(),
    findings,
    historyCases: historyQuery.data?.cases ?? [],
    isLoading: caseQuery.isLoading,
    openFullReview: () => router.push(`/ecg-cases/${caseId}/review` as never),
    previousImageUrl,
    printReport,
    readOnly,
    recommendations,
    reject: () => rejectMutation.mutate(),
    rejecting: rejectMutation.isPending,
    reports: reportsQuery.data?.reports ?? [],
    requestReview: () => requestReviewMutation.mutate(),
    requestingReview: requestReviewMutation.isPending,
    saveReview: () => saveReviewMutation.mutate(),
    savingReview: saveReviewMutation.isPending,
    setClinicalNotes,
    setDoctorDiagnosis,
    setDoctorImpression,
    setRecommendations,
    statusMessage,
    timelineEvents,
  };
}

export type EcgAnalysisWorkspaceState = ReturnType<typeof useEcgAnalysisWorkspace>;
