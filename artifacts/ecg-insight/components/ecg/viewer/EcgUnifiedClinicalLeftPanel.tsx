import { Feather } from "@expo/vector-icons";
import React, { memo, useMemo, useState } from "react";
import { LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, UIManager, View } from "react-native";

import { formatDate } from "@/components/enterprise/EnterpriseUI";
import type { AIAnalysisResult } from "@/services/ai";
import type { DigitalEcg } from "@/services/ecgProcessing";

import { ECG_COCKPIT_COLORS } from "./ecgCockpitColors";
import { ECG_SPACING, ECG_TYPOGRAPHY } from "./ecgSpacingTokens";
import { ECG_WORKSTATION_VISUAL } from "./ecgWorkstationVisualTokens";
import { EcgLeadSelectorGrid } from "./EcgLeadSelectorGrid";
import type { EcgLeadId, EcgViewerPatientContext, EcgViewerPreviousStudy, EcgViewerStudyContext } from "./types";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function CollapsibleSection({
  children,
  defaultOpen = true,
  title,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  title: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(ECG_WORKSTATION_VISUAL.transitionMs, "easeInEaseOut", "opacity"));
    setOpen((v) => !v);
  };
  return (
    <View style={styles.section}>
      <Pressable onPress={toggle} style={styles.sectionHeader}>
        <Feather color={ECG_COCKPIT_COLORS.accent} name={open ? "chevron-down" : "chevron-right"} size={11} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </Pressable>
      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value?: string | number }) {
  if (value == null || value === "") return null;
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.infoLeader} />
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/** Sprint 33.5 — aligned two-column clinical summary. */
export const EcgUnifiedClinicalLeftPanel = memo(function EcgUnifiedClinicalLeftPanel({
  analysis,
  collapsed = false,
  compareCaseId,
  digitalEcg,
  digitizing = false,
  leadFocusMode = false,
  notes,
  onSelectCompare,
  onSelectLead,
  onSelectPrevious,
  onToggleCollapse,
  onToggleLeadFocus,
  onTogglePin,
  patient,
  pinned = true,
  previousStudies,
  selectedLead,
  study,
}: {
  analysis?: AIAnalysisResult | null;
  collapsed?: boolean;
  compareCaseId?: string | null;
  digitalEcg?: DigitalEcg | null;
  digitizing?: boolean;
  leadFocusMode?: boolean;
  notes?: string;
  onSelectCompare?: (caseId: string) => void;
  onSelectLead?: (lead: EcgLeadId) => void;
  onSelectPrevious?: (caseId: string) => void;
  onToggleCollapse?: () => void;
  onToggleLeadFocus?: () => void;
  onTogglePin?: () => void;
  patient?: EcgViewerPatientContext;
  pinned?: boolean;
  previousStudies: EcgViewerPreviousStudy[];
  selectedLead?: EcgLeadId;
  study?: EcgViewerStudyContext;
}) {
  const stages = useMemo(() => {
    const d = digitalEcg;
    const hasDigitized = d?.status === "available" && (d.leads?.length ?? 0) > 0;
    const items = [
      { complete: true, label: "Upload" },
      { complete: !!d?.preprocessing || hasDigitized, label: "Quality" },
      { complete: hasDigitized, label: "Process" },
      { complete: !!d?.measurementEngine, label: "Measure" },
      { complete: !!analysis?.diagnosis, label: "AI" },
    ];
    let currentSet = false;
    return items.map((item) => {
      if (digitizing && item.label === "Process") return { ...item, status: "current" as const };
      if (item.complete) return { ...item, status: "complete" as const };
      if (!currentSet) {
        currentSet = true;
        return { ...item, status: "current" as const };
      }
      return { ...item, status: "pending" as const };
    });
  }, [analysis?.diagnosis, digitalEcg, digitizing]);

  const progress = Math.round((stages.filter((s) => s.status === "complete").length / stages.length) * 100);
  const hasQuickActions = previousStudies.length > 0 || leadFocusMode;

  if (collapsed) {
    return (
      <View style={styles.collapsedShell} testID="sprint35-clinical-summary-panel">
        <Pressable accessibilityLabel="Expand clinical summary" onPress={onToggleCollapse} style={styles.collapsedBtn}>
          <Feather color={ECG_COCKPIT_COLORS.accent} name="chevrons-right" size={13} />
        </Pressable>
      </View>
    );
  }

  return (
    <View nativeID="sprint335-clinical-summary-panel" style={styles.shell} testID="sprint35-clinical-summary-panel">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clinical Summary</Text>
        <View style={styles.headerActions}>
          <Pressable accessibilityLabel={pinned ? "Unpin panel" : "Pin panel"} onPress={onTogglePin} style={styles.iconBtn}>
            <Feather color={pinned ? ECG_COCKPIT_COLORS.accent : ECG_COCKPIT_COLORS.textMuted} name="anchor" size={11} />
          </Pressable>
          <Pressable accessibilityLabel="Collapse panel" onPress={onToggleCollapse} style={styles.iconBtn}>
            <Feather color={ECG_COCKPIT_COLORS.textMuted} name="chevrons-left" size={11} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} style={styles.body}>
        <CollapsibleSection defaultOpen title="Patient">
          <InfoLine label="Name" value={patient?.name} />
          <InfoLine label="Age" value={patient?.age} />
          <InfoLine label="Gender" value={patient?.gender} />
          {notes?.trim() ? <Text style={styles.notesText} numberOfLines={2}>{notes.trim()}</Text> : null}
        </CollapsibleSection>

        <CollapsibleSection defaultOpen title="Study">
          <InfoLine label="Case" value={study?.caseNumber} />
          <InfoLine label="Date" value={study?.studyDate ? formatDate(study.studyDate) : undefined} />
          <InfoLine label="HR" value={study?.heartRate ? `${study.heartRate} bpm` : undefined} />
        </CollapsibleSection>

        <CollapsibleSection defaultOpen={false} title="Device">
          <InfoLine label="Device" value={study?.acquisitionDevice} />
          <InfoLine label="Speed" value={digitalEcg?.calibration?.paperSpeedMmPerSec ? `${digitalEcg.calibration.paperSpeedMmPerSec} mm/s` : undefined} />
          <InfoLine label="Gain" value={digitalEcg?.calibration?.gainMmPerMv ? `${digitalEcg.calibration.gainMmPerMv} mm/mV` : undefined} />
        </CollapsibleSection>

        <CollapsibleSection defaultOpen={false} title="Workflow">
          <View style={styles.track}>
            <View style={[styles.trackFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.chipWrap}>
            {stages.map((stage, index) => (
              <View
                key={stage.label}
                style={[
                  styles.chip,
                  stage.status === "complete" && styles.chipComplete,
                  stage.status === "current" && styles.chipCurrent,
                ]}
                testID={`sprint335-pipeline-${index + 1}`}
              >
                <Text style={styles.chipIndex}>{index + 1}</Text>
                <Text numberOfLines={1} style={styles.chipLabel}>
                  {stage.label}
                </Text>
              </View>
            ))}
          </View>
        </CollapsibleSection>

        <CollapsibleSection defaultOpen={false} title="Leads">
          <EcgLeadSelectorGrid onSelectLead={onSelectLead} selectedLead={selectedLead} />
        </CollapsibleSection>

        {hasQuickActions ? (
          <CollapsibleSection defaultOpen={false} title="Quick Actions">
            <Pressable onPress={() => onToggleLeadFocus?.()} style={styles.actionRow}>
              <Text style={styles.actionLabel}>{leadFocusMode ? "Lead Focus: On" : "Lead Focus: Off"}</Text>
            </Pressable>
            {previousStudies.slice(0, 2).map((item) => (
              <View key={item.caseId} style={styles.actionRow}>
                <Pressable onPress={() => onSelectPrevious?.(item.caseId)} style={styles.actionBtn}>
                  <Text style={styles.actionBtnText} numberOfLines={1}>
                    Open {item.caseNumber ?? item.caseId}
                  </Text>
                </Pressable>
                <Pressable onPress={() => onSelectCompare?.(item.caseId)} style={[styles.actionBtn, compareCaseId === item.caseId && styles.actionBtnActive]} testID={`sprint46-compare-${item.caseId}`}>
                  <Text style={[styles.actionBtnText, compareCaseId === item.caseId && styles.actionBtnTextActive]} numberOfLines={1}>
                    Compare
                  </Text>
                </Pressable>
              </View>
            ))}
          </CollapsibleSection>
        ) : null}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  actionBtn: {
    borderColor: ECG_COCKPIT_COLORS.border,
    borderRadius: 3,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  actionBtnActive: { backgroundColor: ECG_COCKPIT_COLORS.accent, borderColor: ECG_COCKPIT_COLORS.accent },
  actionBtnText: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 8, fontWeight: "800", textAlign: "center" },
  actionBtnTextActive: { color: ECG_COCKPIT_COLORS.bgDeep },
  actionLabel: { color: ECG_COCKPIT_COLORS.text, fontSize: 9, fontWeight: "800" },
  actionRow: { flexDirection: "row", gap: 3, paddingVertical: 2 },
  body: { flex: 1, minHeight: 0 },
  chip: {
    alignItems: "center",
    backgroundColor: ECG_COCKPIT_COLORS.surface,
    borderRadius: 3,
    flexDirection: "row",
    flexShrink: 0,
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  chipComplete: { backgroundColor: "rgba(74,222,128,0.12)" },
  chipCurrent: { backgroundColor: "rgba(20,221,230,0.14)" },
  chipIndex: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 7, fontWeight: "900", width: 8 },
  chipLabel: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 8, fontWeight: "800" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 3 },
  collapsedBtn: { alignItems: "center", flex: 1, justifyContent: "center" },
  collapsedShell: {
    backgroundColor: ECG_COCKPIT_COLORS.bgPanel,
    borderColor: ECG_COCKPIT_COLORS.border,
    borderRadius: ECG_WORKSTATION_VISUAL.panelBorderRadius,
    flex: 1,
    minWidth: ECG_WORKSTATION_VISUAL.leftCollapsedWidth,
    width: "100%",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: ECG_SPACING.sm,
    paddingVertical: ECG_SPACING.xs,
  },
  headerActions: { flexDirection: "row", gap: ECG_SPACING.xs },
  headerTitle: { ...ECG_TYPOGRAPHY.title, color: ECG_COCKPIT_COLORS.text },
  iconBtn: { alignItems: "center", borderRadius: 3, height: 18, justifyContent: "center", width: 18 },
  infoLabel: { ...ECG_TYPOGRAPHY.label, color: ECG_COCKPIT_COLORS.textMuted, width: 54 },
  infoLeader: { borderBottomColor: "rgba(139,163,184,0.25)", borderBottomWidth: 1, flex: 1, marginHorizontal: ECG_SPACING.xs, marginTop: 6 },
  infoLine: { alignItems: "center", flexDirection: "row", minHeight: 16, paddingVertical: 1 },
  infoValue: { ...ECG_TYPOGRAPHY.body, color: ECG_COCKPIT_COLORS.text, maxWidth: "46%", textAlign: "right" },
  notesText: { ...ECG_TYPOGRAPHY.body, color: ECG_COCKPIT_COLORS.textMuted, lineHeight: 12, marginTop: ECG_SPACING.xs },
  scroll: { gap: ECG_SPACING.xs, paddingBottom: ECG_SPACING.sm, paddingHorizontal: ECG_SPACING.sm },
  section: { paddingVertical: ECG_SPACING.xs },
  sectionBody: { gap: ECG_SPACING.xs, paddingLeft: 12, paddingTop: ECG_SPACING.xs },
  sectionHeader: { alignItems: "center", flexDirection: "row", gap: ECG_SPACING.xs, paddingVertical: ECG_SPACING.xs },
  sectionTitle: { ...ECG_TYPOGRAPHY.label, color: ECG_COCKPIT_COLORS.accent, letterSpacing: 0.2 },
  shell: {
    backgroundColor: ECG_COCKPIT_COLORS.bgPanel,
    borderColor: ECG_COCKPIT_COLORS.border,
    borderRadius: ECG_WORKSTATION_VISUAL.panelBorderRadius,
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    width: "100%",
  },
  track: { backgroundColor: "rgba(42,58,72,0.45)", borderRadius: 999, height: 2, marginBottom: 4, overflow: "hidden" },
  trackFill: { backgroundColor: ECG_COCKPIT_COLORS.accent, borderRadius: 999, height: "100%" },
});
