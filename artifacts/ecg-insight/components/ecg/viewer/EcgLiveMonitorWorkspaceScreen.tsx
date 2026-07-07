import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

import { EmptyState, FullScreenLoader, PageSection } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { getCase, getPatient } from "@/services/clinical";
import { digitizeECG, getDigitalECG } from "@/services/ecgProcessing";

import { EcgLiveMonitorShell } from "./EcgLiveMonitorShell";
import { mapQueryPhase, resolveEcgMonitorScreenPhase } from "./ecgMonitorRoute";

const LIVE_MONITOR_QUERY_OPTIONS = {
  retry: 2,
  retryDelay: (attempt: number) => Math.min(750 * 2 ** attempt, 4_000),
  staleTime: 0,
} as const;

export function EcgLiveMonitorWorkspaceScreen({
  caseId,
  demoMode = false,
  testIdPrefix = "sprint37-live-monitor",
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
    queryKey: ["ecg-live-monitor-case", token, resolvedCaseId],
    ...LIVE_MONITOR_QUERY_OPTIONS,
  });
  const patientId = caseQuery.data?.case.patientId;
  const patientQuery = useQuery({
    enabled: !!token && !!patientId,
    queryFn: () => getPatient(token!, patientId!),
    queryKey: ["ecg-live-monitor-patient", token, patientId],
    ...LIVE_MONITOR_QUERY_OPTIONS,
  });

  const digitalEcgQuery = useQuery({
    enabled: !!token && !!resolvedCaseId,
    queryFn: () => getDigitalECG(token!, resolvedCaseId!),
    queryKey: ["ecg-live-monitor-digital-ecg", token, resolvedCaseId],
    retry: false,
  });

  const digitizeMutation = useMutation({
    mutationFn: () => digitizeECG(token!, { caseId: resolvedCaseId! }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ecg-live-monitor-digital-ecg", token, resolvedCaseId] });
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
        ? "Loading patient context for live ECG monitor…"
        : screenPhase === "case-loading"
          ? demoMode
            ? "Loading developer demo live monitor…"
            : "Loading hospital live ECG monitor…"
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
        <EmptyState message="Sign in to open the Live ECG Monitor workspace." title="Authentication required" />
      </PageSection>
    );
  }

  if (screenPhase !== "ready" || !caseQuery.data?.case || !patientQuery.data?.patient) {
    return (
      <View testID={`${testIdPrefix}-unavailable`}>
        <PageSection>
          <EmptyState
            message="Open Live Monitor from an ECG case with a digitized signal, or upload a new ECG case first."
            title="Live ECG monitor unavailable"
          />
        </PageSection>
      </View>
    );
  }

  return (
    <View style={styles.page} testID="sprint37-live-monitor-workspace-ready">
      <EcgLiveMonitorShell
        digitalEcg={digitalEcgQuery.data?.digitalEcg}
        ecgCase={caseQuery.data.case}
        isDigitizing={digitizeMutation.isPending}
        onDigitize={() => digitizeMutation.mutate()}
        patient={patientQuery.data.patient}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingRoot: { flex: 1, minHeight: 0 },
  page: { flex: 1, minHeight: 0 },
});
