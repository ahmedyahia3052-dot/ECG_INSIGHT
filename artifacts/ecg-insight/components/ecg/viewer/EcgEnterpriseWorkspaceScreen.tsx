import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

import { EmptyState, FullScreenLoader, PageSection } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { getCase, getPatient, getPatientEcgHistory } from "@/services/clinical";
import { digitizeECG, getDigitalECG } from "@/services/ecgProcessing";

import { EcgMonitorViewerFoundation } from "./EcgMonitorViewerFoundation";
import { mapQueryPhase, resolveEcgMonitorScreenPhase } from "./ecgMonitorRoute";

const WORKSPACE_QUERY_OPTIONS = {
  retry: 2,
  retryDelay: (attempt: number) => Math.min(750 * 2 ** attempt, 4_000),
  staleTime: 0,
} as const;

export function EcgEnterpriseWorkspaceScreen({
  caseId,
  demoMode = false,
  testIdPrefix = "sprint13-ecg-monitor",
}: {
  caseId?: string;
  demoMode?: boolean;
  testIdPrefix?: string;
}) {
  const queryClient = useQueryClient();
  const { authToken, isLoading: authLoading } = useAuth();
  const token = authToken?.token;
  const resolvedCaseId = typeof caseId === "string" ? caseId : undefined;

  const caseQuery = useQuery({
    enabled: !!token && !!resolvedCaseId,
    queryFn: () => getCase(token!, resolvedCaseId!),
    queryKey: ["ecg-workspace-case", token, resolvedCaseId],
    ...WORKSPACE_QUERY_OPTIONS,
  });
  const patientId = caseQuery.data?.case.patientId;
  const patientQuery = useQuery({
    enabled: !!token && !!patientId,
    queryFn: () => getPatient(token!, patientId!),
    queryKey: ["ecg-workspace-patient", token, patientId],
    ...WORKSPACE_QUERY_OPTIONS,
  });
  const historyQuery = useQuery({
    enabled: !!token && !!patientId,
    queryFn: () => getPatientEcgHistory(token!, patientId!),
    queryKey: ["ecg-workspace-history", token, patientId],
    retry: 1,
    staleTime: 30_000,
  });

  const digitalEcgQuery = useQuery({
    enabled: !!token && !!resolvedCaseId,
    queryFn: () => getDigitalECG(token!, resolvedCaseId!),
    queryKey: ["ecg-monitor-digital-ecg", token, resolvedCaseId],
    retry: false,
  });

  const digitizeMutation = useMutation({
    mutationFn: () => digitizeECG(token!, { caseId: resolvedCaseId! }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ecg-monitor-digital-ecg", token, resolvedCaseId] });
    },
  });

  const digitizedRef = useRef(false);

  useEffect(() => {
    if (!demoMode || !token || !resolvedCaseId || digitizedRef.current || digitizeMutation.isPending) return;
    if (digitalEcgQuery.isLoading || digitalEcgQuery.isFetching) return;
    if (digitalEcgQuery.data?.digitalEcg) return;
    digitizedRef.current = true;
    digitizeMutation.mutate();
  }, [
    demoMode,
    digitalEcgQuery.data?.digitalEcg,
    digitalEcgQuery.isFetching,
    digitalEcgQuery.isLoading,
    digitizeMutation.isPending,
    digitizeMutation.mutate,
    resolvedCaseId,
    token,
  ]);

  const screenPhase = resolveEcgMonitorScreenPhase({
    authLoading,
    caseId: resolvedCaseId,
    casePatientId: patientId,
    casePhase: mapQueryPhase(!!token && !!resolvedCaseId, caseQuery.isError, caseQuery.isSuccess),
    hasCase: !!caseQuery.data?.case,
    hasPatient: !!patientQuery.data?.patient,
    patientPhase: mapQueryPhase(!!token && !!patientId, patientQuery.isError, patientQuery.isSuccess),
    token,
  });

  if (screenPhase === "auth-loading" || screenPhase === "case-loading" || screenPhase === "patient-loading") {
    const label =
      screenPhase === "patient-loading"
        ? "Loading patient context for ECG workspace…"
        : screenPhase === "case-loading"
          ? demoMode
            ? "Loading developer demo ECG workspace…"
            : "Loading ECG Pro clinical workspace…"
          : "Restoring secure session…";
    return (
      <View style={styles.loadingRoot} testID={`${testIdPrefix}-loading`}>
        <FullScreenLoader label={label} />
      </View>
    );
  }

  if (screenPhase === "auth-required") {
    return (
      <PageSection>
        <EmptyState message="Sign in to open the ECG Pro clinical workspace." title="Authentication required" />
      </PageSection>
    );
  }

  if (screenPhase !== "ready" || !caseQuery.data?.case || !patientQuery.data?.patient) {
    return (
      <View testID={`${testIdPrefix}-unavailable`}>
        <PageSection>
          <EmptyState
            message="Upload an ECG case with an image, or open ECG Workspace from an existing patient case."
            title="ECG workspace unavailable"
          />
        </PageSection>
      </View>
    );
  }

  return (
    <View style={styles.page} testID="ecg-enterprise-workspace-ready">
      <PageSection style={styles.pageInner}>
        <EcgMonitorViewerFoundation
          ecgCase={caseQuery.data.case}
          historyCases={historyQuery.data?.cases ?? []}
          patient={patientQuery.data.patient}
        />
      </PageSection>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingRoot: { flex: 1, minHeight: 720 },
  page: { flex: 1, minHeight: 720 },
  pageInner: { flex: 1, minHeight: 720 },
});
