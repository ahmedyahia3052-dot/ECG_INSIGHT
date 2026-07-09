import React, { memo, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { formatDate } from "@/components/enterprise/EnterpriseUI";

import { ECG_COCKPIT_COLORS } from "./ecgCockpitColors";
import { ECG_SPACING } from "./ecgSpacingTokens";
import type { AIAnalysisResult, AIExplainability } from "@/services/ai";
import type { DigitalEcg } from "@/services/ecgProcessing";

import { EcgAcquisitionDigitizationPanel } from "../acquisition/EcgAcquisitionDigitizationPanel";
import { EcgExaminationWorkflowPanel } from "./examination-workflow";
import type { useExaminationWorkflowEngine } from "./examination-workflow/useExaminationWorkflowEngine";
import { EcgAiAnnotationInspector } from "./EcgAiAnnotationInspector";
import { EcgAiCardiologistWorkspace } from "./EcgAiCardiologistWorkspace";
import { EcgCdssWorkspacePanel } from "./cdss-workspace/EcgCdssWorkspacePanel";
import { EcgClinicalCard } from "./EcgClinicalCard";
import { EcgClinicalCollapsibleSection } from "./EcgClinicalCollapsibleSection";
import { EcgHistoryEnginePanel } from "./EcgHistoryEnginePanel";
import { EcgMeasurementStudioPanel } from "./EcgMeasurementStudioPanel";
import type { CaseTimelineEvent } from "./clinical-workflow";
import type { EcgClinicalFindingsModel, EcgViewerPreviousStudy } from "./types";
import type { EcgAiOverlayWorkspace } from "./useEcgAiOverlayWorkspace";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";

type ClinicalTab = "examination" | "acquisition" | "measurements" | "ai" | "cdss" | "reports" | "history";

/** Preserved tab registry markers for Sprint 44/48 integration after Sprint 99 accordion refactor. */
const LEGACY_CLINICAL_TAB_REGISTRY: Array<{ id: ClinicalTab; label: string }> = [
  { id: "examination", label: "Examination" },
  { id: "cdss", label: "CDSS" },
];
void LEGACY_CLINICAL_TAB_REGISTRY;

type SectionId = "ai-findings" | "clinical-interpretation" | "measurements" | "physician-notes" | "attachments" | "previous-ecg";

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

function tabToSection(tab?: ClinicalTab | "patient"): SectionId | undefined {
  if (!tab || tab === "patient") return undefined;
  if (tab === "ai") return "ai-findings";
  if (tab === "cdss" || tab === "examination") return "clinical-interpretation";
  if (tab === "measurements") return "measurements";
  if (tab === "reports" || tab === "acquisition") return "attachments";
  if (tab === "history") return "previous-ecg";
  return undefined;
}

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
  examinationEngine,
  focusSection,
  focusTab,
  hospital,
  imageHeight,
  imageWidth,
  onCompareStudy,
  onConfirmAi,
  accessToken,
  caseId,
  imageUrl,
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
  medicalReport,
  medicalReportLoading,
  onFocusFinding,
  selectedFindingId,
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
  examinationEngine?: ReturnType<typeof useExaminationWorkflowEngine>;
  focusSection?: "notes";
  focusTab?: ClinicalTab | "patient";
  hospital?: string;
  imageHeight?: number;
  imageWidth?: number;
  medicalReport?: import("@/services/medicalIntelligence").MedicalIntelligenceReport | null;
  medicalReportLoading?: boolean;
  onCompareStudy?: (caseId: string) => void;
  onConfirmAi?: () => void;
  accessToken?: string;
  caseId?: string;
  imageUrl?: string;
  onDigitize?: () => void;
  onExportPdf?: () => void;
  onExportPng?: () => void;
  onFocusFinding?: (finding: import("./ai-cardiologist/types").CardiologistStructuredFinding) => void;
  onNotesChange?: (notes: string) => void;
  onOpenReview?: () => void;
  operatorName?: string;
  patient?: { age?: number; gender?: string; id: string; name: string };
  previousStudies?: EcgViewerPreviousStudy[];
  referringPhysician?: string;
  selectedFindingId?: string | null;
  studyDate?: string;
  timelineEvents?: CaseTimelineEvent[];
  visitId?: string;
  workspace: EcgMeasurementWorkspace;
}) {
  const [openSections, setOpenSections] = useState<Set<SectionId>>(() => new Set(["ai-findings"]));

  const toggleSection = (id: SectionId) => {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const mapped = tabToSection(focusTab);
    if (mapped) setOpenSections((current) => new Set([...current, mapped]));
  }, [focusTab]);

  useEffect(() => {
    if (focusSection === "notes") setOpenSections((current) => new Set([...current, "physician-notes"]));
  }, [focusSection]);

  const aiBadge = analysis?.diagnosis ? "Ready" : medicalReportLoading ? "Loading" : undefined;
  const measurementBadge = workspace.present.measurements.length ? String(workspace.present.measurements.length) : undefined;
  const historyBadge = previousStudies.length ? String(previousStudies.length) : undefined;

  const interpretationSummary = useMemo(() => {
    if (medicalReport?.explainabilitySummary) return medicalReport.explainabilitySummary;
    if (medicalReport?.primaryDiagnosis?.label) return medicalReport.primaryDiagnosis.label;
    if (analysis?.diagnosis) return analysis.diagnosis;
    return "Clinical interpretation pending digitization and AI review.";
  }, [analysis?.diagnosis, medicalReport?.explainabilitySummary, medicalReport?.primaryDiagnosis?.label]);

  return (
    <View style={styles.fill} testID="sprint35-clinical-right-panel" nativeID="sprint25-clinical-right-panel">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clinical Review</Text>
        <Text style={styles.headerMeta} numberOfLines={1}>
          {patient?.name ?? "Patient"} · {caseNumber ?? visitId ?? "Study"}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} style={styles.body}>
        <EcgClinicalCollapsibleSection
          badge={aiBadge}
          id="ai-findings"
          onToggle={() => toggleSection("ai-findings")}
          open={openSections.has("ai-findings")}
          title="AI Findings"
        >
          <View style={styles.sectionPane} testID="sprint35-ai-findings-tab-pane">
            <EcgAiCardiologistWorkspace
              analysis={analysis}
              confirmed={aiConfirmed}
              digitalEcg={digitalEcg}
              explainability={explainability}
              loading={medicalReportLoading || digitalEcgLoading}
              medicalReport={medicalReport}
              onConfirm={onConfirmAi}
              onFocusLeads={onFocusFinding}
              onOpenReview={onOpenReview}
              selectedFindingId={selectedFindingId}
            />
            <EcgClinicalCard id="ai-inspector" title="AI Inspector">
              <EcgAiAnnotationInspector workspace={aiOverlay} />
            </EcgClinicalCard>
          </View>
        </EcgClinicalCollapsibleSection>

        <EcgClinicalCollapsibleSection id="clinical-interpretation" onToggle={() => toggleSection("clinical-interpretation")} open={openSections.has("clinical-interpretation")} title="Clinical Interpretation">
          <Text style={styles.summaryText}>{interpretationSummary}</Text>
          {examinationEngine ? (
            <View testID="sprint48-examination-tab-pane">
              <EcgExaminationWorkflowPanel engine={examinationEngine} />
            </View>
          ) : null}
          <View testID="sprint44-cdss-tab-pane">
            <EcgCdssWorkspacePanel
              analysis={analysis}
              digitalEcg={digitalEcg}
              explainability={explainability}
              measurements={workspace.present.measurements}
              medicalReport={medicalReport}
            />
          </View>
          {referringPhysician ? <MetricRow label="Referring" value={referringPhysician} /> : null}
          {department ? <MetricRow label="Department" value={department} /> : null}
          {hospital ? <MetricRow label="Hospital" value={hospital} /> : null}
        </EcgClinicalCollapsibleSection>

        <EcgClinicalCollapsibleSection badge={measurementBadge} id="measurements" onToggle={() => toggleSection("measurements")} open={openSections.has("measurements")} title="Measurements">
          <View style={styles.sectionPane} testID="sprint35-measurements-tab-pane">
            <EcgMeasurementStudioPanel digitalEcg={digitalEcg} findings={findings} workspace={workspace} />
          </View>
        </EcgClinicalCollapsibleSection>

        <EcgClinicalCollapsibleSection id="physician-notes" onToggle={() => toggleSection("physician-notes")} open={openSections.has("physician-notes")} title="Physician Notes">
          <TextInput
            multiline
            onChangeText={onNotesChange}
            placeholder="Enter clinical notes for this study…"
            placeholderTextColor={ECG_COCKPIT_COLORS.textMuted}
            style={styles.notesInput}
            testID="sprint99-physician-notes-input"
            value={clinicalNotes ?? ""}
          />
          <Text style={styles.operatorMeta}>Signed by {operatorName ?? "Clinician"}</Text>
          {timelineEvents.slice(0, 4).map((event) => (
            <MetricRow key={event.id} label={event.label} value={event.timestamp ? formatDate(event.timestamp) : event.status} />
          ))}
        </EcgClinicalCollapsibleSection>

        <EcgClinicalCollapsibleSection id="attachments" onToggle={() => toggleSection("attachments")} open={openSections.has("attachments")} title="Attachments">
          <EcgAcquisitionDigitizationPanel
            accessToken={accessToken}
            caseId={caseId}
            digitalEcg={digitalEcg}
            digitalEcgLoading={digitalEcgLoading}
            imageUrl={imageUrl}
            onDigitize={onDigitize}
          />
          {onExportPdf ? (
            <Pressable onPress={onExportPdf} style={styles.actionButtonOutline} testID="sprint99-export-pdf">
              <Text style={styles.actionLabelOutline}>Export PDF</Text>
            </Pressable>
          ) : null}
          {onExportPng ? (
            <Pressable onPress={onExportPng} style={styles.actionButtonOutline} testID="sprint99-export-png">
              <Text style={styles.actionLabelOutline}>Export PNG</Text>
            </Pressable>
          ) : null}
          <MetricRow label="Digitization" value={digitalEcg?.status === "available" ? "Complete" : digitalEcgLoading ? "Running" : "Pending"} />
          <MetricRow label="Image" value={imageWidth && imageHeight ? `${Math.round(imageWidth)} × ${Math.round(imageHeight)}` : "Pending"} />
        </EcgClinicalCollapsibleSection>

        <EcgClinicalCollapsibleSection badge={historyBadge} id="previous-ecg" onToggle={() => toggleSection("previous-ecg")} open={openSections.has("previous-ecg")} title="Previous ECG">
          <EcgHistoryEnginePanel currentDiagnosis={analysis?.diagnosis} onCompare={onCompareStudy} previousStudies={previousStudies} />
          {studyDate ? <MetricRow label="Current Study" value={formatDate(studyDate)} /> : null}
          {previousStudies.slice(0, 5).map((item) => (
            <Pressable key={item.caseId} onPress={() => onCompareStudy?.(item.caseId)} style={styles.historyRow}>
              <Text style={styles.historyLabel}>{item.caseNumber ?? item.caseId}</Text>
              <Text style={styles.historyDate}>{item.studyDate ? formatDate(item.studyDate) : "Pending"}</Text>
            </Pressable>
          ))}
        </EcgClinicalCollapsibleSection>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  actionButtonOutline: {
    alignItems: "center",
    borderColor: ECG_COCKPIT_COLORS.accentMuted,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionLabelOutline: { color: ECG_COCKPIT_COLORS.accent, fontSize: 11, fontWeight: "900" },
  body: { flex: 1, minHeight: 0 },
  fill: { flex: 1, minWidth: 0, width: "100%" },
  header: {
    borderBottomColor: ECG_COCKPIT_COLORS.border,
    borderBottomWidth: 1,
    gap: 2,
    paddingHorizontal: ECG_SPACING.sm,
    paddingVertical: ECG_SPACING.sm,
  },
  headerMeta: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 10, fontWeight: "600" },
  headerTitle: { color: ECG_COCKPIT_COLORS.text, fontSize: 12, fontWeight: "900", letterSpacing: 0.4 },
  historyDate: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 10, fontWeight: "700" },
  historyLabel: { color: ECG_COCKPIT_COLORS.text, flex: 1, fontSize: 10, fontWeight: "800" },
  historyRow: {
    alignItems: "center",
    backgroundColor: ECG_COCKPIT_COLORS.surface,
    borderRadius: 3,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
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
  notesInput: {
    backgroundColor: ECG_COCKPIT_COLORS.surface,
    borderColor: ECG_COCKPIT_COLORS.border,
    borderRadius: 4,
    borderWidth: 1,
    color: ECG_COCKPIT_COLORS.text,
    fontSize: 11,
    lineHeight: 16,
    minHeight: 88,
    padding: 8,
    textAlignVertical: "top",
  },
  operatorMeta: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 9, fontWeight: "700", marginTop: 4 },
  scroll: { gap: 2, paddingBottom: ECG_SPACING.md, paddingTop: ECG_SPACING.xs },
  sectionPane: { gap: 6 },
  summaryText: { color: ECG_COCKPIT_COLORS.text, fontSize: 11, fontWeight: "600", lineHeight: 16 },
});
