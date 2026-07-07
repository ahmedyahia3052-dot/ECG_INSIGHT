import { Feather } from "@expo/vector-icons";
import React, { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ECG_COCKPIT_COLORS } from "../ecgCockpitColors";
import type { EcgLeadId } from "../types";
import { STANDARD_ECG_LEADS } from "../types";
import type { DiagnosticCompareSync } from "./types";

export const EcgDiagnosticLeadToolsBar = memo(function EcgDiagnosticLeadToolsBar({
  compareSync,
  isolatedLead,
  leadMagnifier,
  onCompareSyncChange,
  onLeadMagnifierChange,
  onSelectLead,
  onToggleIsolation,
  onTogglePin,
  pinnedLeads,
  selectedLead,
}: {
  compareSync: DiagnosticCompareSync;
  isolatedLead: EcgLeadId | null;
  leadMagnifier: boolean;
  onCompareSyncChange: (patch: Partial<DiagnosticCompareSync>) => void;
  onLeadMagnifierChange: (value: boolean) => void;
  onSelectLead: (lead: EcgLeadId) => void;
  onToggleIsolation: (lead: EcgLeadId) => void;
  onTogglePin: (lead: EcgLeadId) => void;
  pinnedLeads: EcgLeadId[];
  selectedLead: EcgLeadId;
}) {
  return (
    <View style={styles.root} testID="sprint46-diagnostic-lead-tools">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {STANDARD_ECG_LEADS.map((lead) => {
          const active = selectedLead === lead;
          const pinned = pinnedLeads.includes(lead);
          const isolated = isolatedLead === lead;
          return (
            <Pressable
              key={lead}
              accessibilityRole="button"
              onPress={() => onSelectLead(lead)}
              onLongPress={() => onTogglePin(lead)}
              style={[styles.leadChip, active && styles.leadChipActive, isolated && styles.leadChipIsolated]}
              testID={`sprint46-lead-chip-${lead}`}
            >
              <Text style={[styles.leadLabel, active && styles.leadLabelActive]}>{lead}</Text>
              {pinned ? <Feather color="#22C55E" name="bookmark" size={10} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.toolRow}>
        <ToolButton
          active={Boolean(isolatedLead)}
          icon="target"
          label="Isolate"
          onPress={() => onToggleIsolation(selectedLead)}
          testID="sprint46-lead-isolate"
        />
        <ToolButton
          active={leadMagnifier}
          icon="zoom-in"
          label="Magnifier"
          onPress={() => onLeadMagnifierChange(!leadMagnifier)}
          testID="sprint46-lead-magnifier"
        />
        <ToolButton
          active={compareSync.leadSync}
          icon="link"
          label="Lead Sync"
          onPress={() => onCompareSyncChange({ leadSync: !compareSync.leadSync })}
          testID="sprint46-compare-lead-sync"
        />
        <ToolButton
          active={compareSync.beatSync}
          icon="activity"
          label="Beat Sync"
          onPress={() => onCompareSyncChange({ beatSync: !compareSync.beatSync })}
          testID="sprint46-compare-beat-sync"
        />
        <ToolButton
          active={compareSync.differenceHighlight}
          icon="layers"
          label="Diff"
          onPress={() => onCompareSyncChange({ differenceHighlight: !compareSync.differenceHighlight })}
          testID="sprint46-compare-difference"
        />
      </View>
    </View>
  );
});

function ToolButton({
  active,
  icon,
  label,
  onPress,
  testID,
}: {
  active?: boolean;
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.toolButton, active && styles.toolButtonActive]} testID={testID}>
      <Feather color={active ? "#22C55E" : ECG_COCKPIT_COLORS.textMuted} name={icon} size={12} />
      <Text style={[styles.toolLabel, active && styles.toolLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  leadChip: {
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.72)",
    borderColor: "rgba(51,65,85,0.8)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    marginRight: 6,
    minWidth: 42,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  leadChipActive: {
    backgroundColor: "rgba(34,197,94,0.18)",
    borderColor: "#22C55E",
  },
  leadChipIsolated: {
    borderColor: "#38BDF8",
  },
  leadLabel: {
    color: ECG_COCKPIT_COLORS.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  leadLabelActive: {
    color: "#ECFDF5",
  },
  root: {
    backgroundColor: "rgba(2,6,23,0.92)",
    borderBottomColor: "rgba(51,65,85,0.55)",
    borderBottomWidth: 1,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  row: {
    alignItems: "center",
    paddingRight: 8,
  },
  toolButton: {
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.72)",
    borderColor: "rgba(51,65,85,0.8)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    marginRight: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  toolButtonActive: {
    backgroundColor: "rgba(34,197,94,0.14)",
    borderColor: "#22C55E",
  },
  toolLabel: {
    color: ECG_COCKPIT_COLORS.textMuted,
    fontSize: 10,
    fontWeight: "600",
  },
  toolLabelActive: {
    color: "#ECFDF5",
  },
  toolRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});
