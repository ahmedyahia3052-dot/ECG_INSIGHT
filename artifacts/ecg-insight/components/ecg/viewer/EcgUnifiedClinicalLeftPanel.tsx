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
import { EcgWorkspaceLeftToolSections } from "./EcgWorkspaceLeftToolSections";
import type { EcgLeadId, EcgViewerPatientContext, EcgViewerPreviousStudy, EcgViewerStudyContext } from "./types";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";
import type { EcgViewerControls } from "./useEcgViewerControls";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function CollapsibleSection({
  children,
  defaultOpen = true,
  testID,
  title,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  testID?: string;
  title: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(ECG_WORKSTATION_VISUAL.transitionMs, "easeInEaseOut", "opacity"));
    setOpen((v) => !v);
  };
  return (
    <View style={styles.section} testID={testID}>
      <Pressable accessibilityRole="button" onPress={toggle} style={styles.sectionHeader}>
        <Feather color={ECG_COCKPIT_COLORS.accent} name={open ? "chevron-down" : "chevron-right"} size={12} />
        <Text style={styles.sectionTitle} numberOfLines={1}>
          {title}
        </Text>
      </Pressable>
      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value?: string | number }) {
  if (value == null || value === "") return null;
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

/** Sprint 53 — fixed-width clinical sidebar with docked tools (no canvas overlap). */
export const EcgUnifiedClinicalLeftPanel = memo(function EcgUnifiedClinicalLeftPanel({
  analysis,
  collapsed = false,
  compareCaseId,
  controls,
  digitalEcg,
  digitizing = false,
  leadFocusMode = false,
  notes,
  onEnterDiagnostic,
  onSelectCompare,
  onSelectLead,
  onSelectPrevious,
  onToggleCollapse,
  onToggleCrosshair,
  onToggleLeadFocus,
  onToggleMagnifier,
  onTogglePin,
  patient,
  pinned = true,
  previousStudies,
  selectedLead,
  showCrosshair = false,
  showMagnifier = false,
  study,
  workspace,
}: {
  analysis?: AIAnalysisResult | null;
  collapsed?: boolean;
  compareCaseId?: string | null;
  controls?: EcgViewerControls;
  digitalEcg?: DigitalEcg | null;
  digitizing?: boolean;
  leadFocusMode?: boolean;
  notes?: string;
  onEnterDiagnostic?: () => void;
  onSelectCompare?: (caseId: string) => void;
  onSelectLead?: (lead: EcgLeadId) => void;
  onSelectPrevious?: (caseId: string) => void;
  onToggleCollapse?: () => void;
  onToggleCrosshair?: () => void;
  onToggleLeadFocus?: () => void;
  onToggleMagnifier?: () => void;
  onTogglePin?: () => void;
  patient?: EcgViewerPatientContext;
  pinned?: boolean;
  previousStudies: EcgViewerPreviousStudy[];
  selectedLead?: EcgLeadId;
  showCrosshair?: boolean;
  showMagnifier?: boolean;
  study?: EcgViewerStudyContext;
  workspace?: EcgMeasurementWorkspace;
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
      <View style={styles.collapsedShell} testID="sprint53-left-sidebar-collapsed">
        <Pressable accessibilityLabel="Expand clinical sidebar" onPress={onToggleCollapse} style={styles.collapsedBtn}>
          <Feather color={ECG_COCKPIT_COLORS.accent} name="chevrons-right" size={14} />
        </Pressable>
      </View>
    );
  }

  return (
    <View nativeID="sprint53-workspace-left-sidebar" style={styles.shell} testID="sprint35-clinical-summary-panel">
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Clinical Controls
        </Text>
        <View style={styles.headerActions}>
          <Pressable accessibilityLabel={pinned ? "Unpin sidebar" : "Pin sidebar"} onPress={onTogglePin} style={styles.iconBtn}>
            <Feather color={pinned ? ECG_COCKPIT_COLORS.accent : ECG_COCKPIT_COLORS.textMuted} name="anchor" size={12} />
          </Pressable>
          <Pressable accessibilityLabel="Collapse sidebar" onPress={onToggleCollapse} style={styles.iconBtn}>
            <Feather color={ECG_COCKPIT_COLORS.textMuted} name="chevrons-left" size={12} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator={Platform.OS === "web"}
        style={styles.body}
        testID="sprint53-left-sidebar-scroll"
      >
        <CollapsibleSection defaultOpen title="Patient">
          <InfoLine label="Name" value={patient?.name} />
          <InfoLine label="Age" value={patient?.age} />
          <InfoLine label="Gender" value={patient?.gender} />
          {notes?.trim() ? <Text style={styles.notesText}>{notes.trim()}</Text> : null}
        </CollapsibleSection>

        <CollapsibleSection defaultOpen title="Study">
          <InfoLine label="Case" value={study?.caseNumber} />
          <InfoLine label="Date" value={study?.studyDate ? formatDate(study.studyDate) : undefined} />
          <InfoLine label="Heart Rate" value={study?.heartRate ? `${study.heartRate} bpm` : undefined} />
          <InfoLine label="Hospital" value={study?.hospital} />
        </CollapsibleSection>

        <CollapsibleSection defaultOpen testID="sprint53-acquisition-section" title="Acquisition">
          <InfoLine label="Device" value={study?.acquisitionDevice} />
          <InfoLine label="File Type" value={study?.fileType} />
          <InfoLine label="Image Size" value={study?.imageWidth && study?.imageHeight ? `${study.imageWidth} × ${study.imageHeight}` : undefined} />
          <InfoLine
            label="Paper Speed"
            value={digitalEcg?.calibration?.paperSpeedMmPerSec ? `${digitalEcg.calibration.paperSpeedMmPerSec} mm/s` : undefined}
          />
          <InfoLine label="Gain" value={digitalEcg?.calibration?.gainMmPerMv ? `${digitalEcg.calibration.gainMmPerMv} mm/mV` : undefined} />
          <InfoLine label="Physician" value={study?.physician} />
        </CollapsibleSection>

        <CollapsibleSection defaultOpen={false} title="Workflow">
          <View style={styles.track}>
            <View style={[styles.trackFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.chipWrap}>
            {stages.map((stage, index) => (
              <View
                key={stage.label}
                style={[styles.chip, stage.status === "complete" && styles.chipComplete, stage.status === "current" && styles.chipCurrent]}
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

        {controls && workspace ? (
          <CollapsibleSection defaultOpen testID="sprint53-canvas-tools-section" title="Canvas Tools">
            <EcgWorkspaceLeftToolSections
              controls={controls}
              onEnterDiagnostic={onEnterDiagnostic}
              onToggleCrosshair={onToggleCrosshair}
              onToggleMagnifier={onToggleMagnifier}
              showCrosshair={showCrosshair}
              showMagnifier={showMagnifier}
              workspace={workspace}
            />
          </CollapsibleSection>
        ) : null}

        {hasQuickActions ? (
          <CollapsibleSection defaultOpen={false} title="Quick Actions">
            <Pressable onPress={() => onToggleLeadFocus?.()} style={styles.actionRow}>
              <Text style={styles.actionLabel}>{leadFocusMode ? "Lead Focus: On" : "Lead Focus: Off"}</Text>
            </Pressable>
            {previousStudies.slice(0, 2).map((item) => (
              <View key={item.caseId} style={styles.actionRow}>
                <Pressable onPress={() => onSelectPrevious?.(item.caseId)} style={styles.actionBtn}>
                  <Text numberOfLines={1} style={styles.actionBtnText}>
                    Open {item.caseNumber ?? item.caseId}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => onSelectCompare?.(item.caseId)}
                  style={[styles.actionBtn, compareCaseId === item.caseId && styles.actionBtnActive]}
                  testID={`sprint46-compare-${item.caseId}`}
                >
                  <Text numberOfLines={1} style={[styles.actionBtnText, compareCaseId === item.caseId && styles.actionBtnTextActive]}>
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
    borderRadius: 4,
    borderWidth: 1,
    flex: 1,
    minHeight: 28,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  actionBtnActive: { backgroundColor: ECG_COCKPIT_COLORS.accent, borderColor: ECG_COCKPIT_COLORS.accent },
  actionBtnText: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 10, fontWeight: "700", textAlign: "center" },
  actionBtnTextActive: { color: ECG_COCKPIT_COLORS.bgDeep },
  actionLabel: { color: ECG_COCKPIT_COLORS.text, fontSize: 11, fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: 6, paddingVertical: 4 },
  body: { flex: 1, minHeight: 0 },
  chip: {
    alignItems: "center",
    backgroundColor: ECG_COCKPIT_COLORS.surface,
    borderRadius: 4,
    flexDirection: "row",
    flexShrink: 0,
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  chipComplete: { backgroundColor: "rgba(74,222,128,0.12)" },
  chipCurrent: { backgroundColor: "rgba(20,221,230,0.14)" },
  chipIndex: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 9, fontWeight: "900", width: 10 },
  chipLabel: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 10, fontWeight: "700" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
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
    borderBottomColor: ECG_COCKPIT_COLORS.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 36,
    paddingHorizontal: ECG_SPACING.md,
    paddingVertical: ECG_SPACING.sm,
  },
  headerActions: { flexDirection: "row", flexShrink: 0, gap: ECG_SPACING.xs },
  headerTitle: { ...ECG_TYPOGRAPHY.title, color: ECG_COCKPIT_COLORS.text, flex: 1, fontSize: 12 },
  iconBtn: { alignItems: "center", borderRadius: 4, height: 24, justifyContent: "center", width: 24 },
  infoLabel: { ...ECG_TYPOGRAPHY.label, color: ECG_COCKPIT_COLORS.textMuted, fontSize: 10 },
  infoLine: { gap: 2, paddingVertical: 3 },
  infoValue: { ...ECG_TYPOGRAPHY.body, color: ECG_COCKPIT_COLORS.text, fontSize: 11, lineHeight: 15 },
  notesText: { ...ECG_TYPOGRAPHY.body, color: ECG_COCKPIT_COLORS.textMuted, fontSize: 10, lineHeight: 14, marginTop: ECG_SPACING.xs },
  scrollContent: { flexGrow: 1, gap: ECG_SPACING.sm, paddingBottom: ECG_SPACING.xl * 2, paddingHorizontal: ECG_SPACING.sm, paddingTop: ECG_SPACING.sm },
  section: { paddingVertical: ECG_SPACING.xs },
  sectionBody: { gap: ECG_SPACING.xs, paddingTop: ECG_SPACING.xs },
  sectionHeader: { alignItems: "center", flexDirection: "row", gap: ECG_SPACING.xs, minHeight: 32, paddingVertical: ECG_SPACING.xs },
  sectionTitle: { ...ECG_TYPOGRAPHY.label, color: ECG_COCKPIT_COLORS.accent, flex: 1, fontSize: 11, letterSpacing: 0.3 },
  shell: {
    backgroundColor: ECG_COCKPIT_COLORS.bgPanel,
    borderColor: ECG_COCKPIT_COLORS.border,
    borderRadius: ECG_WORKSTATION_VISUAL.panelBorderRadius,
    flex: 1,
    minHeight: 0,
    minWidth: ECG_WORKSTATION_VISUAL.leftPanelMinWidth,
    overflow: "hidden",
    width: "100%",
  },
  track: { backgroundColor: "rgba(42,58,72,0.45)", borderRadius: 999, height: 3, marginBottom: 6, overflow: "hidden" },
  trackFill: { backgroundColor: ECG_COCKPIT_COLORS.accent, borderRadius: 999, height: "100%" },
});
