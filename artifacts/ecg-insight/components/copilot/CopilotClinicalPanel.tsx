import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";
import type { CopilotAttachment, CopilotClinicalLinkage } from "@/services/copilot";

type CopilotClinicalPanelProps = {
  attachments: CopilotAttachment[];
  clinicalLinkage?: CopilotClinicalLinkage;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function CopilotClinicalPanel({ attachments, clinicalLinkage, collapsed, onToggleCollapse }: CopilotClinicalPanelProps) {
  if (collapsed) {
    return (
      <View style={styles.collapsedRail}>
        <Pressable accessibilityLabel="Expand clinical panel" accessibilityRole="button" onPress={onToggleCollapse} style={styles.collapseButton}>
          <Feather color={medicalTheme.primary} name="chevrons-left" size={16} />
        </Pressable>
      </View>
    );
  }

  const latest = attachments[attachments.length - 1];
  const documentType = latest?.documentType?.replace(/_/g, " ") ?? "No document";
  const summary = latest?.analysisSummary ?? "Upload a medical document to populate clinical context.";
  const findings = (latest?.medicalAnalysis as { findings?: string[] } | undefined)?.findings ?? [];
  const confidence = typeof latest?.confidence === "number" ? `${Math.round(latest.confidence * 100)}%` : "—";

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Clinical Context</Text>
          <Text style={styles.title}>Patient & Document</Text>
        </View>
        {onToggleCollapse ? (
          <Pressable accessibilityLabel="Collapse clinical panel" accessibilityRole="button" onPress={onToggleCollapse} style={styles.collapseButton}>
            <Feather color={medicalTheme.muted} name="chevrons-right" size={16} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Section icon="user" label="Patient" value={clinicalLinkage?.patientId ? `Linked patient ${clinicalLinkage.patientId.slice(0, 8)}…` : "Not linked"} />
        <Section icon="folder" label="Case" value={clinicalLinkage?.caseNumber ?? clinicalLinkage?.caseId ?? "Not linked"} />
        <Section icon="file-text" label="Document type" value={documentType} />
        <Section icon="activity" label="OCR confidence" value={confidence} />
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLabel}>Analysis summary</Text>
          <Text style={styles.summaryText}>{summary}</Text>
        </View>
        {findings.length ? (
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryLabel}>Findings</Text>
            {findings.map((finding, index) => (
              <Text key={`finding-${index}`} style={styles.finding}>• {finding}</Text>
            ))}
          </View>
        ) : null}
        {latest?.recommendations?.length ? (
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryLabel}>Suggested next steps</Text>
            {latest.recommendations.map((item, index) => (
              <Text key={`rec-${index}`} style={styles.finding}>• {item}</Text>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Section({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionIcon}><Feather color={medicalTheme.primary} name={icon} size={14} /></View>
      <View style={styles.sectionText}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <Text style={styles.sectionValue}>{value}</Text>
      </View>
    </View>
  );
}

const glassBorder = "rgba(148,163,184,0.22)";

const styles = StyleSheet.create({
  body: { gap: 10, paddingBottom: 16 },
  collapseButton: { alignItems: "center", borderColor: glassBorder, borderRadius: 999, borderWidth: 1, height: 32, justifyContent: "center", width: 32 },
  collapsedRail: { alignItems: "center", backgroundColor: "rgba(15,23,42,0.88)", borderColor: glassBorder, borderRadius: 16, borderWidth: 1, paddingTop: 12, width: 44 },
  eyebrow: { color: medicalTheme.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  finding: { color: medicalTheme.text, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  panel: { backgroundColor: "rgba(15,23,42,0.88)", borderColor: glassBorder, borderRadius: 18, borderWidth: 1, flex: 1, minWidth: 260, padding: 14 },
  section: { alignItems: "flex-start", borderBottomColor: "rgba(148,163,184,0.12)", borderBottomWidth: 1, flexDirection: "row", gap: 10, paddingVertical: 10 },
  sectionIcon: { alignItems: "center", backgroundColor: "rgba(20,221,230,0.09)", borderRadius: 10, height: 30, justifyContent: "center", width: 30 },
  sectionLabel: { color: medicalTheme.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  sectionText: { flex: 1, gap: 2 },
  sectionValue: { color: medicalTheme.text, fontSize: 13, fontWeight: "800" },
  summaryBlock: { backgroundColor: "rgba(2,6,23,0.45)", borderColor: glassBorder, borderRadius: 12, borderWidth: 1, gap: 6, padding: 10 },
  summaryLabel: { color: medicalTheme.primary, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  summaryText: { color: medicalTheme.text, fontSize: 13, fontWeight: "700", lineHeight: 20 },
  title: { color: medicalTheme.text, fontSize: 16, fontWeight: "900" },
});
