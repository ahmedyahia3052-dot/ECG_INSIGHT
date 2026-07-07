import React, { memo, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { formatDate } from "@/components/enterprise/EnterpriseUI";

import { ECG_COCKPIT_COLORS } from "./ecgCockpitColors";
import { ECG_SPACING, ECG_TYPOGRAPHY } from "./ecgSpacingTokens";
import type { AIAnalysisResult, AIExplainability } from "@/services/ai";
import type { DigitalEcg } from "@/services/ecgProcessing";

import { EcgAiAnnotationInspector } from "./EcgAiAnnotationInspector";
import { EcgAiReviewWorkflowPanel } from "./EcgAiReviewWorkflowPanel";
import { EcgClinicalCard } from "./EcgClinicalCard";
import { EcgHistoryEnginePanel } from "./EcgHistoryEnginePanel";
import { EcgMeasurementStudioPanel } from "./EcgMeasurementStudioPanel";
import type { CaseTimelineEvent } from "./clinical-workflow";
import type { EcgClinicalFindingsModel, EcgViewerPreviousStudy } from "./types";
import type { EcgAiOverlayWorkspace } from "./useEcgAiOverlayWorkspace";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";

function MetricRow({
  label,
  source,
  value,
  tone,
}: {
  label: string;
  source?: string;
  tone?: "critical" | "primary" | "success" | "warning";
  value: string;
}) {
  const color =
    tone === "critical" ? ECG_COCKPIT_COLORS.critical : tone === "warning" ? ECG_COCKPIT_COLORS.warning : tone === "success" ? ECG_COCKPIT_COLORS.success : ECG_COCKPIT_COLORS.text;
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricLeft}>
        <Text style={styles.metricLabel}>{label}</Text>
        {source ? <Text style={styles.metricSource}>{source}</Text> : null}
      </View>
      <Text style={[styles.metricValue, { color }]} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

function PanelSection({ children, id, title }: { children: React.ReactNode; id: string; title: string }) {
  return (
    <EcgClinicalCard id={id} title={title}>
      {children}
    </EcgClinicalCard>
  );
}

type ClinicalTab = "measurements" | "ai" | "reports" | "history";

const TABS: Array<{ id: ClinicalTab; label: string }> = [
  { id: "measurements", label: "Measurements" },
  { id: "ai", label: "AI Findings" },
  { id: "reports", label: "Reports" },
  { id: "history", label: "History" },
];

export const EcgClinicalRightPanel = memo(function EcgClinicalRightPanel({
  aiConfirmed = false,
  aiOverlay,
  analysis,
  caseNumber,
  clinicalNotes,
  department,
  digitalEcg,
  digitalEcgLoading,
  explainability,
  findings,
  focusSection,
  focusTab,
  hospital,
  imageHeight,
  imageWidth,
  onCompareStudy,
  onConfirmAi,
  onDigitize,
  onExportPdf,
  onExportPng,
  onNotesChange,
  onOpenReview,
  operatorName,
  patient,
  previousStudies = [],
  referringPhysician,
  studyDate,
  timelineEvents = [],
  visitId,
  workspace,
}: {
  aiConfirmed?: boolean;
  aiOverlay: EcgAiOverlayWorkspace;
  analysis?: AIAnalysisResult | null;
  caseNumber?: string;
  clinicalNotes?: string;
  department?: string;
  digitalEcg?: DigitalEcg | null;
  digitalEcgLoading?: boolean;
  explainability?: AIExplainability | null;
  findings: EcgClinicalFindingsModel;
  focusSection?: "notes";
  focusTab?: ClinicalTab | "patient";
  hospital?: string;
  imageHeight?: number;
  imageWidth?: number;
  onCompareStudy?: (caseId: string) => void;
  onConfirmAi?: () => void;
  onDigitize?: () => void;
  onExportPdf?: () => void;
  onExportPng?: () => void;
  onNotesChange?: (notes: string) => void;
  onOpenReview?: () => void;
  operatorName?: string;
  patient?: { age?: number; gender?: string; id: string; name: string };
  previousStudies?: EcgViewerPreviousStudy[];
  referringPhysician?: string;
  studyDate?: string;
  timelineEvents?: CaseTimelineEvent[];
  visitId?: string;
  workspace: EcgMeasurementWorkspace;
}) {
  const severity = analysis?.severity ?? "normal";

  const [activeTab, setActiveTab] = useState<ClinicalTab>("measurements");

  useEffect(() => {
    if (!focusTab) return;
    if (focusTab === "patient") {
      setActiveTab("measurements");
      return;
    }
    setActiveTab(focusTab);
  }, [focusTab]);

  useEffect(() => {
    if (focusSection === "notes") setActiveTab("history");
  }, [focusSection]);

  const measurementsTab = (
    <View style={styles.measurementsPane} testID="sprint35-measurements-tab-pane">
      <EcgMeasurementStudioPanel digitalEcg={digitalEcg} findings={findings} workspace={workspace} />
    </View>
  );

  const aiTab = (
    <View style={styles.aiPane} testID="sprint35-ai-findings-tab-pane">
      <EcgAiReviewWorkflowPanel
        analysis={analysis}
        confirmed={aiConfirmed}
        explainability={explainability}
        onConfirm={onConfirmAi}
        onOpenReview={onOpenReview}
      />
      <PanelSection id="diagnosis" title="AI Interpretation">
        <MetricRow label="Primary" tone={severity === "critical" || severity === "severe" ? "critical" : "primary"} value={analysis?.diagnosis ?? findings.interpretation.value} />
        <MetricRow label="Confidence" value={findings.confidence.value} />
      </PanelSection>
      <EcgClinicalCard id="ai-inspector" title="AI Inspector">
        <EcgAiAnnotationInspector workspace={aiOverlay} />
      </EcgClinicalCard>
    </View>
  );

  const reportsTab = (
    <>
      <PanelSection id="export" title="Export">
        {onExportPdf ? (
          <Pressable onPress={onExportPdf} style={styles.actionButtonOutline}>
            <Text style={styles.actionLabelOutline}>Export PDF</Text>
          </Pressable>
        ) : null}
        {onExportPng ? (
          <Pressable onPress={onExportPng} style={styles.actionButtonOutline}>
            <Text style={styles.actionLabelOutline}>Export PNG</Text>
          </Pressable>
        ) : null}
      </PanelSection>
      <PanelSection id="status" title="Report Status">
        <MetricRow label="Digitization" value={digitalEcg?.status === "available" ? "Complete" : digitalEcgLoading ? "Running" : "Pending"} />
        <MetricRow label="AI Review" value={analysis?.diagnosis ?? "Pending"} />
      </PanelSection>
    </>
  );

  const historyTab = (
    <>
      <EcgHistoryEnginePanel currentDiagnosis={analysis?.diagnosis} onCompare={onCompareStudy} previousStudies={previousStudies} />
      <PanelSection id="timeline" title="Study Timeline">
        {studyDate ? <MetricRow label="Current Study" value={formatDate(studyDate)} /> : null}
        {previousStudies.slice(0, 3).map((item) => (
          <MetricRow key={item.caseId} label={item.caseNumber ?? item.caseId} value={item.studyDate ? formatDate(item.studyDate) : "Pending"} />
        ))}
      </PanelSection>
    </>
  );

  const tabContent =
    activeTab === "measurements"
      ? measurementsTab
      : activeTab === "ai"
        ? aiTab
        : activeTab === "reports"
          ? reportsTab
          : historyTab;

  return (
    <View style={styles.fill} testID="sprint35-clinical-right-panel" nativeID="sprint25-clinical-right-panel">
      <View accessibilityRole="tablist" style={styles.tabBar} testID="sprint35-clinical-tabs">
        {TABS.map((tab) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.id }}
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={({ hovered, pressed }) => [
              styles.tab,
              activeTab === tab.id && styles.tabActive,
              (hovered || pressed) && styles.tabHover,
            ]}
            testID={`sprint26-clinical-tab-${tab.id}`}
          >
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} style={styles.tabBody}>
        <View key={activeTab} style={styles.tabPane}>
          {tabContent}
        </View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    backgroundColor: ECG_COCKPIT_COLORS.accent,
    borderRadius: 4,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionButtonOutline: {
    alignItems: "center",
    borderColor: ECG_COCKPIT_COLORS.accentMuted,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionLabel: { color: ECG_COCKPIT_COLORS.bgDeep, fontSize: 11, fontWeight: "900" },
  actionLabelOutline: { color: ECG_COCKPIT_COLORS.accent, fontSize: 11, fontWeight: "900" },
  aiPane: { gap: 8, paddingBottom: 4 },
  fill: { flex: 1, minWidth: 0, width: "100%" },
  measurementsPane: { gap: 6 },
  metricCard: {
    alignItems: "center",
    backgroundColor: ECG_COCKPIT_COLORS.surface,
    borderRadius: 3,
    flexDirection: "row",
    gap: 4,
    justifyContent: "space-between",
    paddingHorizontal: 5,
    paddingVertical: 4,
  },
  metricLabel: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 8, fontWeight: "800", width: 72 },
  metricLeft: { flex: 1, minWidth: 0 },
  metricSource: { color: ECG_COCKPIT_COLORS.accent, fontSize: 7, fontWeight: "800" },
  metricValue: { color: ECG_COCKPIT_COLORS.text, flexShrink: 0, fontSize: 10, fontWeight: "900", maxWidth: "52%", textAlign: "right" },
  scroll: { gap: 4, paddingBottom: 6, paddingHorizontal: 2 },
  tab: {
    alignItems: "center",
    borderBottomColor: "transparent",
    borderBottomWidth: 2,
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: "center",
    marginHorizontal: ECG_SPACING.xs,
    minHeight: 30,
    minWidth: 0,
    paddingHorizontal: ECG_SPACING.sm,
    transitionDuration: "150ms",
  } as never,
  tabActive: { borderBottomColor: ECG_COCKPIT_COLORS.accent },
  tabBar: {
    borderBottomColor: ECG_COCKPIT_COLORS.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    flexShrink: 0,
    gap: ECG_SPACING.xs,
    paddingHorizontal: ECG_SPACING.xs,
    paddingTop: ECG_SPACING.xs,
  },
  tabBody: { flex: 1, minHeight: 0 },
  tabHover: { backgroundColor: "rgba(20,221,230,0.06)" },
  tabLabel: { ...ECG_TYPOGRAPHY.label, color: ECG_COCKPIT_COLORS.textMuted, textAlign: "center" },
  tabLabelActive: { color: ECG_COCKPIT_COLORS.accent },
  tabPane: { gap: 6 },
  warningText: { color: ECG_COCKPIT_COLORS.warning, fontSize: 10, fontWeight: "700", lineHeight: 14 },
});
