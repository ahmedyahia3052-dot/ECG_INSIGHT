import React from "react";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import { EcgProViewerFoundationScreen } from "@/components/ecg/viewer/pro-foundation";
import { useEcgWorkspaceCaseResolver } from "@/components/ecg/viewer/useEcgWorkspaceCaseResolver";
import { EmptyState, FullScreenLoader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";

export default function EcgViewerRoute() {
  const { caseId, patientId } = useLocalSearchParams<{ caseId?: string; patientId?: string }>();
  const { authToken, isLoading: authLoading } = useAuth();
  const token = authToken?.token;
  const resolver = useEcgWorkspaceCaseResolver({ caseId, patientId, token });

  if (authLoading || resolver.isResolving) {
    return (
      <View style={styles.loadingRoot} testID="ecg-viewer-resolving">
        <FullScreenLoader label="Preparing ECG Pro Viewer…" />
      </View>
    );
  }

  if (!token) {
    return <EmptyState message="Sign in to open the professional ECG viewer." title="Authentication required" />;
  }

  if (resolver.resolveError && !resolver.resolvedCaseId) {
    return (
      <EmptyState
        message="Upload an ECG case with an image, or open ECG Pro Viewer from ECG Cases."
        title="No ECG case available"
      />
    );
  }

  return <EcgProViewerFoundationScreen caseId={resolver.resolvedCaseId} token={token} />;
}

const styles = StyleSheet.create({
  loadingRoot: { flex: 1, minHeight: 720 },
});
