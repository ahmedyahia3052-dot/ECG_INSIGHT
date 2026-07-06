import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Platform, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { medicalTheme, patientDisplayName } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { getAIExplainability, getAIResult, type AIExplainability } from "@/services/ai";
import { API_URL } from "@/services/api";
import type { ApiECGCase } from "@/services/clinical";
import { digitizeECG, getDigitalECG } from "@/services/ecgProcessing";
import { downloadEcgViewerWorkspacePdf, downloadEcgViewerWorkspaceJson } from "@/services/ecgViewerWorkspace";
import { buildSegmentAlignedDigitizedWaveformLeads } from "./ecgDigitizedWaveformSync";

import { detectImageFormat } from "./ecgImageEngine";
import { exportMeasurements } from "./ecgMeasurementEngine";
import { exportEcgViewerPng } from "./ecgViewerExport";
import { durationMsForLead } from "./ecgMonitorPath";
import { EcgClinicalRightPanel } from "./EcgClinicalRightPanel";
import { EcgClinicalWorkflowTimeline } from "./EcgClinicalWorkflowTimeline";
import { EcgCommandPalette, type EcgCommandItem } from "./EcgCommandPalette";
import { EcgEnterpriseStatusBar } from "./EcgEnterpriseStatusBar";
import { EcgImageCanvas } from "./EcgImageCanvas";
import { EcgLiveMonitorView } from "./EcgLiveMonitorView";
import { EcgReportPreviewPanel } from "./EcgReportPreviewPanel";
import { EcgViewModeSwitcher } from "./EcgViewModeSwitcher";
import { EcgViewerLeftRail } from "./EcgViewerLeftRail";
import { EcgViewerResizableWorkspace } from "./EcgViewerResizableWorkspace";
import { EcgWorkstationLeftNav } from "./EcgWorkstationLeftNav";
import { EcgViewerSettingsPanel } from "./EcgViewerSettingsPanel";
import { EcgWaveformPlaybackTimeline } from "./EcgWaveformPlaybackTimeline";
import { EcgWorkstationToolbar } from "./EcgWorkstationToolbar";
import { ECG_WORKSTATION_VISUAL } from "./ecgWorkstationVisualTokens";
import type { EcgLeadId, EcgViewerPreviousStudy } from "./types";
import { STANDARD_ECG_LEADS } from "./types";
import { useEcgAiOverlayWorkspace } from "./useEcgAiOverlayWorkspace";
import { useEcgClinicalFindings } from "./useEcgClinicalFindings";
import { useEcgEnterpriseViewerState } from "./useEcgEnterpriseViewerState";
import { useEcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";
import { useEcgViewerControls } from "./useEcgViewerControls";
import { useEcgViewerPersistence } from "./useEcgViewerPersistence";
import { useEcgWaveformPlayback } from "./useEcgWaveformPlayback";
import { useEcgWorkstationShortcuts } from "./useEcgWorkstationShortcuts";
import { useEnterpriseStatusMetrics } from "./useEnterpriseStatusMetrics";

function absoluteUrl(path?: string | null) {
  if (!path) return undefined;
  return path.startsWith("http") ? path : `${API_URL.replace(/\/api$/, "")}${path}`;
}

export function EcgMonitorViewerFoundation({
  ecgCase,
  historyCases = [],
  patient,
}: {
  ecgCase: ApiECGCase;
  historyCases?: ApiECGCase[];
  patient: { age?: number; company?: string | null; firstName: string; gender?: string; id: string; lastName: string };
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authToken, user } = useAuth();
  const token = authToken?.token;
  const [selectedLead, setSelectedLead] = useState<EcgLeadId>("II");
  const [pointerCoords, setPointerCoords] = useState<{ imageX: number; imageY: number; x: number; y: number } | null>(null);
  const [renderFps, setRenderFps] = useState(60);
  const [panelLayout, setPanelLayout] = useState<{ bottomSize?: number; leftCollapsed: boolean; leftSize?: number; rightCollapsed: boolean; rightSize?: number }>({
    leftCollapsed: false,
    rightCollapsed: false,
  });
  const [leftNavCollapsed, setLeftNavCollapsed] = useState(false);
  const [leftNavPinned, setLeftNavPinned] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showCrosshair, setShowCrosshair] = useState(true);
  const [showMagnifier, setShowMagnifier] = useState(false);
  const imageUrl = absoluteUrl(ecgCase.imagePath ?? ecgCase.originalFileUrl ?? ecgCase.files.find((file) => file.mimeType.startsWith("image/"))?.downloadUrl);
  const pdfUrl = absoluteUrl(ecgCase.pdfPath ?? ecgCase.files.find((file) => file.mimeType.includes("pdf"))?.downloadUrl);
  const controls = useEcgViewerControls();
  const operatorName = user?.name ?? user?.email ?? "Clinician";
  const scheduleSaveRef = useRef<() => void>(() => undefined);

  const analysisQuery = useQuery({
    enabled: !!token && !!ecgCase.id,
    queryFn: () => getAIResult(token!, ecgCase.id),
    queryKey: ["ecg-monitor-ai-result", token, ecgCase.id],
    retry: false,
  });
  const explainabilityQuery = useQuery({
    enabled: !!token && !!ecgCase.id,
    queryFn: () => getAIExplainability(token!, ecgCase.id),
    queryKey: ["ecg-monitor-ai-explainability", token, ecgCase.id],
    retry: false,
  });
  const digitalEcgQuery = useQuery({
    enabled: !!token && !!ecgCase.id,
    queryFn: () => getDigitalECG(token!, ecgCase.id),
    queryKey: ["ecg-monitor-digital-ecg", token, ecgCase.id],
    retry: false,
  });
  const digitalEcg = digitalEcgQuery.data?.digitalEcg ?? null;

  const digitizeMutation = useMutation({
    mutationFn: () => digitizeECG(token!, { caseId: ecgCase.id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ecg-monitor-digital-ecg", token, ecgCase.id] });
    },
  });

  const analysis = analysisQuery.data?.analysis ?? null;
  const explainability =
    explainabilityQuery.data?.explainability ?? (ecgCase.explainabilityData as AIExplainability | null | undefined) ?? null;

  const workspace = useEcgMeasurementWorkspace({
    controls,
    onPersist: () => scheduleSaveRef.current(),
    operatorName,
  });
  const aiOverlay = useEcgAiOverlayWorkspace({
    activeLead: selectedLead,
    analysis,
    controls,
    ecgCase,
    explainability,
    onPersist: () => scheduleSaveRef.current(),
    operatorName,
  });
  const findings = useEcgClinicalFindings(ecgCase, workspace, analysis, explainability, digitalEcg);

  const previousStudies: EcgViewerPreviousStudy[] = useMemo(
    () =>
      historyCases
        .filter((item) => item.id !== ecgCase.id)
        .map((item) => ({
          caseId: item.id,
          caseNumber: item.caseNumber ?? item.caseId,
          studyDate: item.acquisitionDate ?? item.uploadDate,
          thumbnailUrl: absoluteUrl(item.imagePath ?? item.ecgImage),
        })),
    [ecgCase.id, historyCases],
  );

  const enterprise = useEcgEnterpriseViewerState({ caseId: ecgCase.id, historyStudies: previousStudies });

  const rhythmLead = useMemo(
    () => digitalEcg?.leads.find((lead) => lead.lead === selectedLead) ?? digitalEcg?.leads.find((lead) => lead.lead === "II") ?? null,
    [digitalEcg?.leads, selectedLead],
  );

  const playbackDurationMs = rhythmLead ? durationMsForLead(rhythmLead) : 10_000;
  const playback = useEcgWaveformPlayback(playbackDurationMs);

  const hydrateWorkspace = useCallback(
    (state: Parameters<typeof workspace.hydrate>[0]) => {
      workspace.hydrate(state);
      if (state.aiOverlay) aiOverlay.hydrate(state.aiOverlay);
    },
    [aiOverlay, workspace],
  );

  const { scheduleSave } = useEcgViewerPersistence({
    accessToken: token,
    caseId: ecgCase.id,
    enabled: true,
    onHydrate: hydrateWorkspace,
    patientId: patient.id,
    snapshot: () => ({
      ...workspace.exportState(),
      aiOverlay: aiOverlay.exportState(),
      version: 5 as const,
    }),
  });
  scheduleSaveRef.current = scheduleSave;

  const study = {
    acquisitionDevice: ecgCase.ecgType ?? "Standard ECG",
    caseId: ecgCase.id,
    caseNumber: ecgCase.caseNumber ?? ecgCase.caseId,
    fileType: detectImageFormat(imageUrl ?? pdfUrl ?? "", ecgCase.files[0]?.mimeType).toUpperCase(),
    heartRate: digitalEcg?.measurementEngine?.heartRate ?? ecgCase.heartRate,
    hospital: ecgCase.hospitalName ?? patient.company ?? undefined,
    imageHeight: controls.viewport.imageHeight,
    imageUrl,
    imageWidth: controls.viewport.imageWidth,
    pdfUrl,
    physician: ecgCase.reviewedBy?.name ?? ecgCase.assignedDoctor?.name ?? undefined,
    studyDate: ecgCase.acquisitionDate ?? ecgCase.uploadDate,
  };

  const alignedDigitizedLeads = useMemo(
    () => buildSegmentAlignedDigitizedWaveformLeads(digitalEcg, controls.viewport.imageWidth, controls.viewport.imageHeight),
    [controls.viewport.imageHeight, controls.viewport.imageWidth, digitalEcg],
  );
  const digitizedLeads = useMemo(
    () => enterprise.filterDigitizedLeads(alignedDigitizedLeads, selectedLead),
    [alignedDigitizedLeads, enterprise, selectedLead],
  );

  const compareCase = historyCases.find((item) => item.id === enterprise.compareStudy?.caseId);
  const compareImageUrl = absoluteUrl(
    compareCase?.imagePath ?? compareCase?.originalFileUrl ?? compareCase?.files.find((file) => file.mimeType.startsWith("image/"))?.downloadUrl,
  );
  const processedImageUrl = absoluteUrl(digitalEcg?.enhancedImageUrl ?? digitalEcg?.originalImageUrl);

  const openStudy = (nextCaseId: string) => router.push(`/ecg-workspace?caseId=${nextCaseId}` as never);

  const cycleLead = useCallback(() => {
    setSelectedLead((current) => {
      const index = STANDARD_ECG_LEADS.indexOf(current);
      return STANDARD_ECG_LEADS[(index + 1) % STANDARD_ECG_LEADS.length] ?? "II";
    });
  }, []);

  const exportPdf = useCallback(async () => {
    if (token && ecgCase.id && Platform.OS === "web") {
      const blob = await downloadEcgViewerWorkspacePdf(token, ecgCase.id);
      window.open(URL.createObjectURL(blob), "_blank");
      return;
    }
    if (imageUrl ?? pdfUrl) void Linking.openURL(imageUrl ?? pdfUrl!);
  }, [ecgCase.id, imageUrl, pdfUrl, token]);

  const exportJson = useCallback(async () => {
    if (workspace && Platform.OS === "web") {
      const bundle = exportMeasurements(workspace.present.measurements, "json");
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ecg-measurements-${ecgCase.id}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      return;
    }
    if (token && ecgCase.id) await downloadEcgViewerWorkspaceJson(token, ecgCase.id);
  }, [ecgCase.id, token, workspace]);

  const exportCsv = useCallback(() => {
    if (!workspace || Platform.OS !== "web") return;
    const bundle = exportMeasurements(workspace.present.measurements, "csv") as { csv?: string };
    const blob = new Blob([bundle.csv ?? ""], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ecg-measurements-${ecgCase.id}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [ecgCase.id, workspace]);

  const exportPng = useCallback(async () => {
    if (!imageUrl) return;
    await exportEcgViewerPng({ accessToken: token, caseId: ecgCase.id, imageUrl });
  }, [ecgCase.id, imageUrl, token]);

  useEffect(() => {
    workspace.setActiveLead(selectedLead);
  }, [selectedLead, workspace]);

  useEffect(() => {
    if (!digitalEcg?.calibration) return;
    controls.setGrid((grid) => ({
      ...grid,
      gain: digitalEcg.calibration.gainMmPerMv,
      speed: digitalEcg.calibration.paperSpeedMmPerSec,
    }));
  }, [controls.setGrid, digitalEcg?.calibration]);

  useEffect(() => {
    if (enterprise.viewMode === "overlay" || enterprise.viewMode === "ai-review") {
      aiOverlay.setSettings({ enabled: true, showAnnotations: true, showHeatmap: true, showLabels: true });
    }
  }, [aiOverlay, enterprise.viewMode]);

  useEffect(() => {
    if (enterprise.viewMode === "measurement") {
      workspace.setToolMode("measurement");
    }
  }, [enterprise.viewMode, workspace]);

  useEcgWorkstationShortcuts({
    controls,
    onOpenCases: () => router.push("/ecg-cases" as never),
    onOpenCommandPalette: () => setCommandPaletteOpen(true),
    onUpload: () => router.push("/upload-ecg" as never),
    onViewModeChange: enterprise.setViewMode,
    workspace,
  });

  useEffect(() => {
    scheduleSave();
  }, [aiOverlay.present, controls.adjustments, controls.grid, controls.transform, scheduleSave, workspace.present]);

  const waveFps = enterprise.viewMode === "monitor" ? renderFps : renderFps;

  const statusMetrics = useEnterpriseStatusMetrics({
    aiOverlayEnabled: aiOverlay.present.settings.enabled,
    annotationCount: aiOverlay.present.annotations.filter((item) => item.visible).length,
    viewMode: enterprise.viewMode,
  });

  const commandItems: EcgCommandItem[] = useMemo(
    () => [
      { group: "FILE", icon: "folder", id: "open-cases", label: "Open ECG Cases", onPress: () => router.push("/ecg-cases" as never), shortcut: "Ctrl+O" },
      { group: "FILE", icon: "upload", id: "upload", label: "Upload ECG", onPress: () => router.push("/upload-ecg" as never), shortcut: "Ctrl+U" },
      { group: "VIEW", icon: "monitor", id: "monitor", keywords: ["live"], label: "Live Monitor Mode", onPress: () => enterprise.setViewMode("monitor"), shortcut: "M" },
      { group: "VIEW", icon: "eye", id: "ai-review", label: "AI Review Mode", onPress: () => enterprise.setViewMode("ai-review"), shortcut: "A" },
      { group: "VIEW", icon: "file", id: "report", label: "Report Preview", onPress: () => enterprise.setViewMode("report"), shortcut: "R" },
      { group: "DIGITIZE", icon: "cpu", id: "digitize", label: "Run Digitization", onPress: () => digitizeMutation.mutate() },
      { group: "MEASURE", icon: "sliders", id: "measure", label: "Measurement Mode", onPress: () => enterprise.setViewMode("measurement") },
      { group: "EXPORT", icon: "file-text", id: "export-pdf", label: "Export PDF", onPress: () => void exportPdf() },
      { group: "EXPORT", icon: "image", id: "export-png", label: "Export PNG", onPress: () => void exportPng() },
    ],
    [digitizeMutation, enterprise, exportPdf, exportPng, router],
  );

  return (
    <View style={[styles.root, controls.fullscreen && styles.fullscreenRoot]} testID="sprint13-ecg-monitor-ready" nativeID="sprint22-hospital-workstation-ready">
      <View nativeID="sprint25-hospital-workstation-ready" style={styles.inspectorReady} testID="sprint26-hospital-workstation-ready">
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          {patientDisplayName(patient)} · {ecgCase.caseNumber ?? ecgCase.caseId} · Lead {selectedLead}
        </Text>
      </View>
      <EcgViewModeSwitcher onChange={enterprise.setViewMode} value={enterprise.viewMode} />

      <EcgWorkstationToolbar
        aiOverlay={aiOverlay}
        compareLayout={enterprise.compareLayout}
        compareMode={enterprise.compareMode}
        controls={controls}
        leadLayout={enterprise.leadLayout}
        onCapture={() => router.push("/upload-ecg" as never)}
        onCompareLayoutChange={enterprise.setCompareLayout}
        onCompareToggle={enterprise.toggleCompareMode}
        onDigitize={() => digitizeMutation.mutate()}
        onExportCsv={exportCsv}
        onExportJson={() => void exportJson()}
        onExportPdf={() => void exportPdf()}
        onExportPng={() => void exportPng()}
        onLeadCycle={cycleLead}
        onLeadLayoutChange={enterprise.setLeadLayout}
        onOpenCases={() => router.push("/ecg-cases" as never)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenSettings={() => enterprise.setSettingsVisible(true)}
        onToggleCrosshair={() => setShowCrosshair((value) => !value)}
        onToggleMagnifier={() => setShowMagnifier((value) => !value)}
        showCrosshair={showCrosshair}
        showMagnifier={showMagnifier}
        onRhythmStrip={() => enterprise.setViewMode("monitor")}
        onToggleLeadFocus={() => enterprise.setLeadFocusMode((value) => !value)}
        onToggleLeftPanel={() =>
          setPanelLayout((current) => {
            const nextCollapsed = !current.leftCollapsed;
            setLeftNavCollapsed(nextCollapsed);
            return { ...current, leftCollapsed: nextCollapsed };
          })
        }
        onToggleRightPanel={() => setPanelLayout((current) => ({ ...current, rightCollapsed: !current.rightCollapsed }))}
        onToggleTheme={enterprise.toggleWorkstationTheme}
        onUpload={() => router.push("/upload-ecg" as never)}
        onViewModeChange={enterprise.setViewMode}
        playback={playback}
        recentCaseId={ecgCase.id}
        selectedLead={selectedLead}
        showDigitizedWaveform={enterprise.showDigitizedWaveform}
        viewMode={enterprise.viewMode}
        workspace={workspace}
      />

      <View style={styles.workspace}>
        <EcgViewerResizableWorkspace
          layout={panelLayout}
          onLayoutChange={(layout) =>
            setPanelLayout({
              bottomSize: layout.bottomSize,
              leftCollapsed: layout.leftCollapsed ?? false,
              leftSize: layout.leftSize,
              rightCollapsed: layout.rightCollapsed ?? false,
              rightSize: layout.rightSize,
            })
          }
          bottom={
            <View style={styles.bottomStack}>
              {enterprise.viewMode === "monitor" ? (
                <EcgWaveformPlaybackTimeline durationMs={playbackDurationMs} playback={playback} />
              ) : null}
              <EcgEnterpriseStatusBar
                apiStatus={statusMetrics.backendStatus === "healthy" ? "Online" : "Offline"}
                fps={waveFps}
                gain={controls.grid.gain}
                lead={selectedLead}
                paperSpeed={controls.grid.speed}
                patientName={patientDisplayName(patient)}
                renderingMode={enterprise.viewMode === "monitor" ? "Monitor" : enterprise.viewMode}
                zoom={controls.transform.zoom}
              />
            </View>
          }
          center={
            enterprise.viewMode === "report" ? (
              <EcgReportPreviewPanel
                accessToken={token}
                caseId={ecgCase.id}
                caseNumber={ecgCase.caseNumber ?? ecgCase.caseId}
                patientName={patientDisplayName(patient)}
              />
            ) : enterprise.viewMode === "ai-review" ? (
              <EcgImageCanvas
                accessToken={token}
                activeLead={selectedLead}
                aiOverlay={aiOverlay}
                controls={controls}
                currentLabel={study.caseNumber ?? "Current Study"}
                digitalEcg={digitalEcg}
                digitizedLeads={digitizedLeads}
                explainability={explainability}
                imageUrl={imageUrl}
                onPointerMove={setPointerCoords}
                onFpsUpdate={setRenderFps}
                pdfUrl={pdfUrl}
                processedImageUrl={processedImageUrl}
                showDigitizedWaveform={false}
                showCrosshair={showCrosshair}
                showMagnifier={showMagnifier}
                viewMode="ai-review"
                workspace={workspace}
              />
            ) : enterprise.viewMode === "monitor" ? (
              <EcgLiveMonitorView
                controls={controls}
                heartRate={study.heartRate ?? undefined}
                isDigitizing={digitizeMutation.isPending}
                lead={rhythmLead}
                onDigitize={() => digitizeMutation.mutate()}
                onFpsUpdate={setRenderFps}
                playback={playback}
                rhythm={analysis?.rhythm ?? ecgCase.rhythm ?? undefined}
                selectedLead={selectedLead}
              />
            ) : (
              <EcgImageCanvas
                accessToken={token}
                activeLead={selectedLead}
                aiOverlay={aiOverlay}
                compareImageUrl={compareImageUrl}
                compareLabel={enterprise.compareStudy?.caseNumber ?? "Comparison Study"}
                compareLayout={enterprise.compareLayout}
                compareMode={enterprise.compareMode}
                compareOpacity={enterprise.compareOpacity}
                compareThumbnailUrl={enterprise.compareStudy?.thumbnailUrl}
                controls={controls}
                currentLabel={study.caseNumber ?? "Current Study"}
                digitalEcg={digitalEcg}
                digitizedLeads={digitizedLeads}
                explainability={explainability}
                imageUrl={imageUrl}
                onPointerMove={setPointerCoords}
                onFpsUpdate={setRenderFps}
                pdfUrl={pdfUrl}
                processedImageUrl={processedImageUrl}
                showCrosshair={showCrosshair}
                showDigitizedWaveform={enterprise.showDigitizedWaveform}
                showMagnifier={showMagnifier}
                viewMode={enterprise.viewMode}
                workspace={workspace}
              />
            )
          }
          left={
            <View style={styles.leftColumn}>
              <EcgWorkstationLeftNav
                collapsed={panelLayout.leftCollapsed || leftNavCollapsed}
                onToggleCollapse={() =>
                  setPanelLayout((current) => {
                    const next = !(current.leftCollapsed ?? false);
                    setLeftNavCollapsed(next);
                    return { ...current, leftCollapsed: next };
                  })
                }
                onTogglePin={() => setLeftNavPinned((value) => !value)}
                pinned={leftNavPinned}
              />
              {!panelLayout.leftCollapsed ? (
                <View style={styles.leftRailHost}>
                  <EcgClinicalWorkflowTimeline
                    analysis={analysis}
                    digitalEcg={digitalEcg}
                    digitizing={digitizeMutation.isPending}
                    hasReport={!!pdfUrl}
                    reviewed={!!ecgCase.reviewedBy}
                  />
                  <EcgViewerLeftRail
                    compareCaseId={enterprise.compareCaseId}
                    leadFocusMode={enterprise.leadFocusMode}
                    notes={ecgCase.clinicalNotes ?? ecgCase.clinicalComments ?? undefined}
                    onSelectCompare={(caseId) => {
                      enterprise.setCompareCaseId(caseId);
                      enterprise.setCompareMode(true);
                      enterprise.setViewMode("compare");
                    }}
                    onSelectLead={setSelectedLead}
                    onSelectPrevious={openStudy}
                    onToggleLeadFocus={() => enterprise.setLeadFocusMode((value) => !value)}
                    patient={{ age: patient.age, gender: patient.gender, id: patient.id, name: patientDisplayName(patient) }}
                    previousStudies={previousStudies}
                    selectedLead={selectedLead}
                    study={study}
                  />
                </View>
              ) : null}
            </View>
          }
          right={
            <EcgClinicalRightPanel
              aiOverlay={aiOverlay}
              analysis={analysis}
              clinicalNotes={ecgCase.clinicalNotes ?? ecgCase.clinicalComments}
              digitalEcg={digitalEcg}
              digitalEcgLoading={digitalEcgQuery.isLoading || digitizeMutation.isPending}
              findings={findings}
              imageHeight={controls.viewport.imageHeight}
              imageWidth={controls.viewport.imageWidth}
              onDigitize={() => digitizeMutation.mutate()}
              onOpenReview={() => router.push(`/ecg-cases/${ecgCase.id}/review` as never)}
              onExportPdf={() => void exportPdf()}
              onExportPng={() => void exportPng()}
              caseNumber={ecgCase.caseNumber ?? ecgCase.caseId}
              previousStudies={previousStudies}
              patient={{ age: patient.age, gender: patient.gender, id: patient.id, name: patientDisplayName(patient) }}
              studyDate={study.studyDate}
              workspace={workspace}
            />
          }
        />
      </View>
      </View>

      <EcgCommandPalette commands={commandItems} onClose={() => setCommandPaletteOpen(false)} visible={commandPaletteOpen} />

      <EcgViewerSettingsPanel aiOverlay={aiOverlay} controls={controls} onClose={() => enterprise.setSettingsVisible(false)} visible={enterprise.settingsVisible} />
    </View>
  );
}

const styles = StyleSheet.create({
  bottomStack: { flexShrink: 0, gap: 4, minHeight: 0, overflow: "hidden" },
  fullscreenRoot: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#040E1A",
    padding: 4,
    zIndex: 50,
  },
  headerRow: { flexShrink: 0, minWidth: 0 },
  inspectorReady: { flex: 1, gap: ECG_WORKSTATION_VISUAL.workspaceGap, minHeight: 0, overflow: "hidden" },
  leftColumn: { flex: 1, gap: 4, minHeight: 0, minWidth: 0, overflow: "hidden" },
  leftRailHost: { flex: 1, minHeight: 0, minWidth: 0, overflow: "hidden" },
  root: { backgroundColor: "#040E1A", flex: 1, gap: ECG_WORKSTATION_VISUAL.workspaceGap, minHeight: 0, overflow: "hidden", padding: ECG_WORKSTATION_VISUAL.workspacePadding },
  title: { color: medicalTheme.text, fontSize: 12, fontWeight: "800" },
  workspace: { flex: 1, minHeight: 0, overflow: "hidden" },
});
