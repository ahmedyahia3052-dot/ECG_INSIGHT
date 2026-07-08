import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { EmptyState, formatDate, FullScreenLoader, medicalTheme, PageSection, patientDisplayName, PrimaryButton } from "@/components/enterprise/EnterpriseUI";
import type { ApiECGCase } from "@/services/clinical";

import type { EcgWorkspaceResolvePhase } from "./useEcgWorkspaceCaseResolver";

function ExaminationSelector({
  cases,
  destination,
  onSelect,
}: {
  cases: ApiECGCase[];
  destination: "ecg-live-monitor" | "ecg-workspace";
  onSelect: (caseId: string) => void;
}) {
  return (
    <PageSection>
      <View style={styles.selectorRoot} testID="ecg-examination-selector">
        <Text style={styles.selectorTitle}>Select ECG Examination</Text>
        <Text style={styles.selectorSubtitle}>
          Multiple examinations are available. Choose the study to open in the {destination === "ecg-workspace" ? "ECG Workspace" : "Live Monitor"}.
        </Text>
        <ScrollView contentContainerStyle={styles.selectorList}>
          {cases.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onSelect(item.id)}
              style={styles.selectorRow}
              testID={`ecg-examination-selector-item-${item.id}`}
            >
              <View style={styles.selectorMeta}>
                <Text style={styles.selectorCase}>{item.caseNumber ?? item.caseId}</Text>
                <Text style={styles.selectorPatient}>{patientDisplayName(item.patient)}</Text>
                <Text style={styles.selectorDate}>{formatDate(item.acquisitionDate ?? item.uploadDate)} • {item.ecgType}</Text>
              </View>
              <PrimaryButton label="Open" onPress={() => onSelect(item.id)} variant="primary" />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </PageSection>
  );
}

function ExaminationEmptyState({
  actionHandlers,
  demoCaseId,
  onLoadDemo,
  onRetry,
  showRetry,
}: {
  actionHandlers: { importEcg: () => void; openStudy: () => void; uploadEcg: () => void };
  demoCaseId?: string;
  onLoadDemo: () => void;
  onRetry?: () => void;
  showRetry?: boolean;
}) {
  return (
    <View testID="ecg-examination-empty-state">
      <PageSection>
        <EmptyState
          message="Start a new examination, import an existing study, or load a demo case to enter the hospital ECG workflow."
          title="No ECG Examination Found"
          action={
            <View style={styles.actionRow}>
              <PrimaryButton icon="upload" label="Upload ECG" onPress={actionHandlers.uploadEcg} testID="ecg-empty-upload" variant="primary" />
              <PrimaryButton icon="download" label="Import ECG" onPress={actionHandlers.importEcg} testID="ecg-empty-import" variant="outline" />
              <PrimaryButton icon="folder" label="Open Existing Study" onPress={actionHandlers.openStudy} testID="ecg-empty-open-study" variant="outline" />
              {demoCaseId ? (
                <PrimaryButton icon="activity" label="Load Demo Case" onPress={onLoadDemo} testID="ecg-empty-load-demo" variant="outline" />
              ) : null}
              {showRetry && onRetry ? <PrimaryButton label="Retry Connection" onPress={onRetry} variant="outline" /> : null}
            </View>
          }
        />
      </PageSection>
    </View>
  );
}

export function EcgExaminationWorkflowGate({
  candidateCases,
  children,
  demoCaseId,
  destination,
  loadingLabel,
  phase,
  refetch,
  resolvedCaseId,
}: {
  candidateCases: ApiECGCase[];
  children: (caseId: string) => React.ReactNode;
  demoCaseId?: string;
  destination: "ecg-live-monitor" | "ecg-workspace";
  loadingLabel: string;
  phase: EcgWorkspaceResolvePhase;
  refetch?: () => void;
  resolvedCaseId?: string;
}) {
  const router = useRouter();

  const openCase = (caseId: string) => {
    router.replace(`/${destination}?caseId=${caseId}` as never);
  };

  if (phase === "resolving") {
    return (
      <View style={styles.loadingRoot} testID="ecg-workspace-resolving">
        <FullScreenLoader label={loadingLabel} />
      </View>
    );
  }

  if (phase === "select-examination") {
    return <ExaminationSelector cases={candidateCases} destination={destination} onSelect={openCase} />;
  }

  if (phase === "empty" || phase === "error") {
    return (
      <ExaminationEmptyState
        actionHandlers={{
          importEcg: () => router.push("/upload-ecg" as never),
          openStudy: () => router.push("/ecg-cases" as never),
          uploadEcg: () => router.push("/upload-ecg" as never),
        }}
        demoCaseId={demoCaseId}
        onLoadDemo={() => {
          if (demoCaseId) router.replace(`/${destination}?caseId=${demoCaseId}` as never);
        }}
        onRetry={refetch}
        showRetry={phase === "error"}
      />
    );
  }

  if (phase === "ready" && resolvedCaseId) {
    return <>{children(resolvedCaseId)}</>;
  }

  return (
    <ExaminationEmptyState
      actionHandlers={{
        importEcg: () => router.push("/upload-ecg" as never),
        openStudy: () => router.push("/ecg-cases" as never),
        uploadEcg: () => router.push("/upload-ecg" as never),
      }}
      demoCaseId={demoCaseId}
      onLoadDemo={() => {
        if (demoCaseId) router.replace(`/${destination}?caseId=${demoCaseId}` as never);
      }}
      onRetry={refetch}
      showRetry
    />
  );
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 8 },
  loadingRoot: { flex: 1, minHeight: 720 },
  selectorCase: { color: medicalTheme.text, fontSize: 15, fontWeight: "800" },
  selectorDate: { color: medicalTheme.muted, fontSize: 12, marginTop: 2 },
  selectorList: { gap: 8, paddingVertical: 8 },
  selectorMeta: { flex: 1, minWidth: 0 },
  selectorPatient: { color: medicalTheme.primary, fontSize: 13, fontWeight: "700", marginTop: 2 },
  selectorRoot: { gap: 8 },
  selectorRow: {
    alignItems: "center",
    backgroundColor: medicalTheme.surface,
    borderColor: medicalTheme.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectorSubtitle: { color: medicalTheme.muted, fontSize: 13, lineHeight: 18 },
  selectorTitle: { color: medicalTheme.text, fontSize: 20, fontWeight: "900" },
});
