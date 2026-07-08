import React from "react";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import { EcgExaminationWorkflowGate } from "@/components/ecg/viewer/EcgExaminationWorkflowGate";
import { EcgLiveMonitorWorkspaceScreen } from "@/components/ecg/viewer/EcgLiveMonitorWorkspaceScreen";
import { useEcgWorkspaceCaseResolver } from "@/components/ecg/viewer/useEcgWorkspaceCaseResolver";
import { EmptyState, PageSection } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";

export default function EcgLiveMonitorRoute() {
  const { caseId, patientId } = useLocalSearchParams<{ caseId?: string; patientId?: string }>();
  const { authToken, isLoading: authLoading } = useAuth();
  const token = authToken?.token;
  const resolver = useEcgWorkspaceCaseResolver({ caseId, patientId, token });

  if (authLoading) {
    return (
      <View style={styles.loadingRoot} testID="ecg-live-monitor-auth-loading">
        <PageSection>
          <EmptyState message="Restoring secure clinical session…" title="Loading" />
        </PageSection>
      </View>
    );
  }

  if (!token) {
    return (
      <PageSection>
        <EmptyState message="Sign in to open the Live ECG Monitor workspace." title="Authentication required" />
      </PageSection>
    );
  }

  return (
    <EcgExaminationWorkflowGate
      candidateCases={resolver.candidateCases}
      demoCaseId={resolver.demoCaseId}
      destination="ecg-live-monitor"
      loadingLabel="Resolving ECG examination for live monitor…"
      phase={resolver.phase}
      refetch={() => void resolver.refetch()}
      resolvedCaseId={resolver.resolvedCaseId}
    >
      {(resolvedCaseId) => (
        <EcgLiveMonitorWorkspaceScreen
          caseId={resolvedCaseId}
          demoMode={resolver.demoMode}
          testIdPrefix="sprint37-live-monitor"
        />
      )}
    </EcgExaminationWorkflowGate>
  );
}

const styles = StyleSheet.create({
  loadingRoot: { flex: 1, minHeight: 720 },
});
