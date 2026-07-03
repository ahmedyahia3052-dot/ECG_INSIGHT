import React, { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { medicalTheme, PrimaryButton } from "@/components/enterprise/EnterpriseUI";

type CopilotErrorBoundaryState = {
  error?: Error;
};

export class CopilotErrorBoundary extends Component<PropsWithChildren, CopilotErrorBoundaryState> {
  state: CopilotErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): CopilotErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ecg:copilot-error", { detail: { componentStack: info.componentStack, message: error.message } }));
    }
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Copilot workspace error</Text>
          <Text style={styles.message}>The chat workspace encountered an error. Your conversation data is preserved on the server.</Text>
          <PrimaryButton icon="refresh-cw" label="Retry" onPress={() => this.setState({ error: undefined })} />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { alignItems: "center", flex: 1, gap: 12, justifyContent: "center", padding: 24 },
  message: { color: medicalTheme.muted, fontSize: 14, fontWeight: "700", lineHeight: 21, textAlign: "center" },
  title: { color: medicalTheme.text, fontSize: 20, fontWeight: "900" },
});
