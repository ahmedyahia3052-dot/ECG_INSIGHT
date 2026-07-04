import { useQuery } from "@tanstack/react-query";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { EmptyState, FullScreenLoader, PageSection } from "@/components/enterprise/EnterpriseUI";
import { EcgMonitorViewerFoundation } from "@/components/ecg/viewer/EcgMonitorViewerFoundation";
import { mapQueryPhase, resolveEcgMonitorScreenPhase } from "@/components/ecg/viewer/ecgMonitorRoute";
import { useAuth } from "@/context/AuthContext";
import { getCase, getPatient, getPatientEcgHistory } from "@/services/clinical";

const MONITOR_QUERY_OPTIONS = {
  retry: 2,
  retryDelay: (attempt: number) => Math.min(750 * 2 ** attempt, 4_000),
  staleTime: 0,
} as const;

export default function EcgMonitorScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const { authToken, isLoading: authLoading } = useAuth();
  const token = authToken?.token;
  const resolvedCaseId = typeof caseId === "string" ? caseId : undefined;

  const caseQuery = useQuery({
    enabled: !!token && !!resolvedCaseId,
    queryFn: () => getCase(token!, resolvedCaseId!),
    queryKey: ["ecg-monitor-case", token, resolvedCaseId],
    ...MONITOR_QUERY_OPTIONS,
  });
  const patientId = caseQuery.data?.case.patientId;
  const patientQuery = useQuery({
    enabled: !!token && !!patientId,
    queryFn: () => getPatient(token!, patientId!),
    queryKey: ["ecg-monitor-patient", token, patientId],
    ...MONITOR_QUERY_OPTIONS,
  });
  const historyQuery = useQuery({
    enabled: !!token && !!patientId,
    queryFn: () => getPatientEcgHistory(token!, patientId!),
    queryKey: ["ecg-monitor-history", token, patientId],
    retry: 1,
    staleTime: 30_000,
  });

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
        ? "Loading patient context for ECG monitor…"
        : screenPhase === "case-loading"
          ? "Loading ECG monitor workspace…"
          : "Restoring secure session…";
    return (
      <View style={styles.loadingRoot} testID="sprint13-ecg-monitor-loading">
        <FullScreenLoader label={label} />
      </View>
    );
  }

  if (screenPhase === "auth-required") {
    return (
      <PageSection>
        <EmptyState message="Sign in to open the ECG monitor workspace." title="Authentication required" />
      </PageSection>
    );
  }

  if (screenPhase !== "ready" || !caseQuery.data?.case || !patientQuery.data?.patient) {
    return (
      <View testID="sprint13-ecg-monitor-unavailable">
        <PageSection>
          <EmptyState
            message="Select a valid ECG case to open the Sprint 13 monitor workspace."
            title="ECG monitor unavailable"
          />
        </PageSection>
      </View>
    );
  }

  return (
    <PageSection style={styles.page}>
      <EcgMonitorViewerFoundation
        ecgCase={caseQuery.data.case}
        historyCases={historyQuery.data?.cases ?? []}
        patient={patientQuery.data.patient}
      />
    </PageSection>
  );
}

const styles = StyleSheet.create({
  loadingRoot: { flex: 1, minHeight: 720 },
  page: { flex: 1, minHeight: 720 },
});
