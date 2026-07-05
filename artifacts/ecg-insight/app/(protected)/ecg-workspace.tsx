import React from "react";
import { useLocalSearchParams } from "expo-router";

import { EcgEnterpriseWorkspaceScreen } from "@/components/ecg/viewer/EcgEnterpriseWorkspaceScreen";
import { useEcgWorkspaceCaseResolver } from "@/components/ecg/viewer/useEcgWorkspaceCaseResolver";
import { EmptyState, FullScreenLoader, PageSection } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { StyleSheet, View } from "react-native";

export default function EcgWorkspaceRoute() {
  const { caseId, patientId } = useLocalSearchParams<{ caseId?: string; patientId?: string }>();
  const { authToken, isLoading: authLoading } = useAuth();
  const token = authToken?.token;
  const resolver = useEcgWorkspaceCaseResolver({ caseId, patientId, token });

  if (authLoading || resolver.isResolving) {
    return (
      <View style={styles.loadingRoot} testID="ecg-workspace-resolving">
        <FullScreenLoader label="Preparing ECG Pro clinical workspace…" />
      </View>
    );
  }

  if (!token) {
    return (
      <PageSection>
        <EmptyState message="Sign in to open the enterprise ECG workspace." title="Authentication required" />
      </PageSection>
    );
  }

  if (resolver.resolveError && !resolver.resolvedCaseId) {
    return (
      <View testID="ecg-workspace-no-demo">
        <PageSection>
          <EmptyState
            message="Create an ECG case with an uploaded image, then reopen ECG Workspace. Demo mode loads the first available case automatically."
            title="No sample ECG available"
          />
        </PageSection>
      </View>
    );
  }

  return (
    <EcgEnterpriseWorkspaceScreen
      caseId={resolver.resolvedCaseId}
      demoMode={resolver.demoMode}
      testIdPrefix="ecg-workspace"
    />
  );
}

const styles = StyleSheet.create({
  loadingRoot: { flex: 1, minHeight: 720 },
});
