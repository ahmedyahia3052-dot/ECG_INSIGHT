import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/enterprise/EnterpriseUI";
import type { AsyncStatus } from "@/types/async-state";
import { medicalTheme } from "@/theme/medicalTheme";

type Props = {
  children?: React.ReactNode;
  emptyMessage?: string;
  emptyTitle?: string;
  errorMessage?: string;
  errorTitle?: string;
  isEmpty?: boolean;
  isError?: boolean;
  isLoading?: boolean;
  permissionDeniedMessage?: string;
  status?: AsyncStatus;
};

export function AsyncStateView({
  children,
  emptyMessage = "No records are available yet.",
  emptyTitle = "Nothing to show",
  errorMessage = "Unable to load data. Please retry.",
  errorTitle = "Load failed",
  isEmpty,
  isError,
  isLoading,
  permissionDeniedMessage = "You do not have permission to view this resource.",
  status,
}: Props) {
  const resolvedStatus: AsyncStatus = status
    ?? (isLoading ? "loading" : isError ? "error" : isEmpty ? "empty" : "success");

  if (resolvedStatus === "loading") {
    return (
      <View style={styles.center} testID="async-state-loading">
        <ActivityIndicator color={medicalTheme.primary} />
        <Text style={styles.caption}>Loading…</Text>
      </View>
    );
  }

  if (resolvedStatus === "permission-denied") {
    return <EmptyState message={permissionDeniedMessage} title="Permission denied" />;
  }

  if (resolvedStatus === "network-error") {
    return <EmptyState message="Check your network connection and try again." title="Network error" />;
  }

  if (resolvedStatus === "error") {
    return <EmptyState message={errorMessage} title={errorTitle} />;
  }

  if (resolvedStatus === "empty") {
    return <EmptyState message={emptyMessage} title={emptyTitle} />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  caption: { color: medicalTheme.muted, fontSize: 12, fontWeight: "700", marginTop: 8 },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
});
