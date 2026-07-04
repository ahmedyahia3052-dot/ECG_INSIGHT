import { useQuery } from "@tanstack/react-query";
import React from "react";
import { StyleSheet, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { EmptyState, PageSection } from "@/components/enterprise/EnterpriseUI";
import { EcgMonitorViewerFoundation } from "@/components/ecg/viewer/EcgMonitorViewerFoundation";
import { useAuth } from "@/context/AuthContext";
import { getCase, getPatient, getPatientEcgHistory } from "@/services/clinical";

export default function EcgMonitorScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const { authToken } = useAuth();
  const token = authToken?.token;

  const caseQuery = useQuery({
    enabled: !!token && !!caseId,
    queryFn: () => getCase(token!, caseId!),
    queryKey: ["ecg-monitor-case", token, caseId],
    retry: false,
  });
  const patientQuery = useQuery({
    enabled: !!token && !!caseQuery.data?.case.patientId,
    queryFn: () => getPatient(token!, caseQuery.data!.case.patientId),
    queryKey: ["ecg-monitor-patient", token, caseQuery.data?.case.patientId],
    retry: false,
  });
  const historyQuery = useQuery({
    enabled: !!token && !!caseQuery.data?.case.patientId,
    queryFn: () => getPatientEcgHistory(token!, caseQuery.data!.case.patientId),
    queryKey: ["ecg-monitor-history", token, caseQuery.data?.case.patientId],
    retry: false,
  });

  if (caseQuery.isLoading) return <Text style={styles.loading}>Loading ECG monitor workspace…</Text>;
  if (!caseQuery.data?.case || !patientQuery.data?.patient) {
    return (
      <PageSection>
        <EmptyState message="Select a valid ECG case to open the Sprint 13 monitor workspace." title="ECG monitor unavailable" />
      </PageSection>
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
  loading: { padding: 16 },
  page: { flex: 1, minHeight: 720 },
});
