import React from "react";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import { EcgLiveMonitorWorkspaceScreen } from "@/components/ecg/viewer/EcgLiveMonitorWorkspaceScreen";
import { useEcgWorkspaceCaseResolver } from "@/components/ecg/viewer/useEcgWorkspaceCaseResolver";
import { EmptyState, FullScreenLoader, PageSection } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";

export default function EcgLiveMonitorRoute() {
  const { caseId, patientId } = useLocalSearchParams<{ caseId?: string; patientId?: string }>();
  const { authToken, isLoading: authLoading } = useAuth();
  const token = authToken?.token;
  const resolver = useEcgWorkspaceCaseResolver({ caseId, patientId, token });

  if (authLoading || resolver.isResolving) {
    return (
      <View style={styles.loadingRoot} testID="ecg-live-monitor-resolving">
        <FullScreenLoader label="Preparing hospital live ECG monitor…" />
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

  if (resolver.resolveError && !resolver.resolvedCaseId) {
    return (
      <View testID="ecg-live-monitor-no-case">
        <PageSection>
          <EmptyState
            message="Open Live Monitor from an ECG case, or upload a case with an image first."
            title="No ECG case available for live monitor"
          />
        </PageSection>
      </View>
    );
  }

  return (
    <EcgLiveMonitorWorkspaceScreen
      caseId={resolver.resolvedCaseId}
      demoMode={resolver.demoMode}
      testIdPrefix="sprint37-live-monitor"
    />
  );
}

const styles = StyleSheet.create({
  loadingRoot: { flex: 1, minHeight: 720 },
});
