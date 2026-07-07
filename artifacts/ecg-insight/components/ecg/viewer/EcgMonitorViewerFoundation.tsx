import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { patientDisplayName } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { getAIExplainability, getAIResult, type AIExplainability } from "@/services/ai";
import { API_URL } from "@/services/api";
import type { ApiECGCase } from "@/services/clinical";
import { digitizeECG, getDigitalECG } from "@/services/ecgProcessing";
import { listReports } from "@/services/reports";
import { downloadEcgViewerWorkspacePdf, downloadEcgViewerWorkspaceJson } from "@/services/ecgViewerWorkspace";
import { buildSegmentAlignedDigitizedWaveformLeads } from "./ecgDigitizedWaveformSync";
import type { EcgRenderMetrics } from "./rendering-engine";

import { detectImageFormat } from "./ecgImageEngine";
import { exportMeasurements } from "./ecgMeasurementEngine";
import { exportEcgViewerPng } from "./ecgViewerExport";
import { durationMsForLead } from "./ecgMonitorPath";
import { EcgClinicalAlertsBanner } from "./EcgClinicalAlertsBanner";
import { EcgClinicalRightPanel } from "./EcgClinicalRightPanel";
import { EcgClinicalWorkflowRibbon } from "./EcgClinicalWorkflowRibbon";
import { EcgUnifiedClinicalLeftPanel } from "./EcgUnifiedClinicalLeftPanel";
import { EcgCommandPalette, type EcgCommandItem } from "./EcgCommandPalette";
import { EcgEnterpriseStatusBar } from "./EcgEnterpriseStatusBar";
import { EcgFloatingToolPalette } from "./EcgFloatingToolPalette";
import { EcgImageCanvas } from "./EcgImageCanvas";
import { EcgLiveMonitorView } from "./EcgLiveMonitorView";
import { EcgReportPreviewPanel } from "./EcgReportPreviewPanel";
import { EcgViewerResizableWorkspace } from "./EcgViewerResizableWorkspace";
import { EcgViewerSettingsPanel } from "./EcgViewerSettingsPanel";
import { EcgViewModeSwitcher } from "./EcgViewModeSwitcher";
import { EcgWaveformPlaybackTimeline } from "./EcgWaveformPlaybackTimeline";
import { EcgWorkstationToolbar } from "./EcgWorkstationToolbar";
import { ECG_COCKPIT_COLORS } from "./ecgCockpitColors";
import { ECG_WORKSTATION_VISUAL } from "./ecgWorkstationVisualTokens";
import type { EcgLeadId, EcgViewerPreviousStudy } from "./types";
import { STANDARD_ECG_LEADS } from "./types";
import { useClinicalWorkflowEngine } from "./useClinicalWorkflowEngine";
import { useEcgAiOverlayWorkspace } from "./useEcgAiOverlayWorkspace";
import { useEcgClinicalFindings } from "./useEcgClinicalFindings";
import { useEcgDiagnosticMode } from "./useEcgDiagnosticMode";
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
  const renderFpsRef = useRef(60);
  const lastFpsPublishRef = useRef(0);
  const handleFpsUpdate = useCallback((fps: number) => {
    renderFpsRef.current = fps;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - lastFpsPublishRef.current < ECG_WORKSTATION_VISUAL.statusBarUpdateIntervalMs) return;
    lastFpsPublishRef.current = now;
    setRenderFps(fps);
  }, []);
  const [renderMetrics, setRenderMetrics] = useState<EcgRenderMetrics | null>(null);
  const [exportedArtifact, setExportedArtifact] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<"patient" | "measurements" | "ai" | "reports" | "history" | undefined>();
  const [rightPanelSection, setRightPanelSection] = useState<"notes" | undefined>();
  const [aiConfirmed, setAiConfirmed] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState(ecgCase.clinicalNotes ?? ecgCase.clinicalComments ?? "");
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
  const { diagnosticMode, exitDiagnostic, popLayoutSnapshot, toggleDiagnostic } = useEcgDiagnosticMode();
  const operatorName = user?.name ?? user?.email ?? "Clinician";
  const scheduleSaveRef = useRef<() => void>(() => undefined);
  const persistWorkspace = useCallback(() => {
    scheduleSaveRef.current();
  }, []);

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
  const reportsQuery = useQuery({
    enabled: !!token && !!ecgCase.id,
    queryFn: async () => {
      const params = new URLSearchParams({ caseId: ecgCase.id, pageSize: "10" });
      return listReports(token!, params);
    },
    queryKey: ["ecg-workspace-reports", token, ecgCase.id],
    retry: false,
  });
  const caseReports = reportsQuery.data?.reports ?? [];

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
    onPersist: persistWorkspace,
    operatorName,
  });
  const aiOverlay = useEcgAiOverlayWorkspace({
    activeLead: selectedLead,
    analysis,
    controls,
    ecgCase,
    explainability,
    onPersist: persistWorkspace,
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
      setExportedArtifact(true);
      return;
    }
    if (imageUrl ?? pdfUrl) {
      void Linking.openURL(imageUrl ?? pdfUrl!);
      setExportedArtifact(true);
    }
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

  const setActiveLead = workspace.setActiveLead;
  const setToolMode = workspace.setToolMode;
  const configureWaveDetection = workspace.configureWaveDetection;
  const setOverlaySettings = aiOverlay.setSettings;

  useEffect(() => {
    setActiveLead(selectedLead);
  }, [selectedLead, setActiveLead]);

  useEffect(() => {
    if (!digitalEcg?.calibration) return;
    controls.setGrid((grid) => {
      if (
        grid.gain === digitalEcg.calibration.gainMmPerMv &&
        grid.speed === digitalEcg.calibration.paperSpeedMmPerSec
      ) {
        return grid;
      }
      return {
        ...grid,
        gain: digitalEcg.calibration.gainMmPerMv,
        speed: digitalEcg.calibration.paperSpeedMmPerSec,
      };
    });
  }, [controls.setGrid, digitalEcg?.calibration?.gainMmPerMv, digitalEcg?.calibration?.paperSpeedMmPerSec]);

  useEffect(() => {
    if (enterprise.viewMode === "overlay" || enterprise.viewMode === "ai-review") {
      setOverlaySettings({ enabled: true, showAnnotations: true, showHeatmap: true, showLabels: true });
    }
  }, [enterprise.viewMode, setOverlaySettings]);

  useEffect(() => {
    if (enterprise.viewMode === "measurement") {
      setToolMode("measurement");
      if (digitalEcg && controls.viewport.imageWidth > 0 && controls.viewport.imageHeight > 0) {
        configureWaveDetection(digitalEcg, workspace.present.activeLead ?? "II");
      }
    }
  }, [
    configureWaveDetection,
    controls.viewport.imageHeight,
    controls.viewport.imageWidth,
    digitalEcg,
    enterprise.viewMode,
    setToolMode,
    workspace.present.activeLead,
  ]);

  const measurementCount = workspace.present.measurements.length;
  const workflow = useClinicalWorkflowEngine({
    analysis,
    caseRecord: ecgCase,
    clinicalNotes: doctorNotes,
    currentViewMode: enterprise.viewMode,
    digitizing: digitizeMutation.isPending,
    digitalEcg,
    exported: exportedArtifact,
    hasCompareStudy: !!enterprise.compareStudy || enterprise.compareMode,
    measurementCount,
    onCompareMode: (enabled) => {
      if (enabled) enterprise.setCompareMode(true);
    },
    onFocusPanel: (tab, section) => {
      setRightPanelTab(tab);
      setRightPanelSection(section);
    },
    onOpenReview: () => router.push(`/ecg-cases/${ecgCase.id}/review` as never),
    onViewModeChange: enterprise.setViewMode,
    reports: caseReports,
  });

  const enterDiagnosticMode = useCallback(() => {
    toggleDiagnostic({
      leftCollapsed: panelLayout.leftCollapsed,
      leftSize: panelLayout.leftSize,
      rightCollapsed: panelLayout.rightCollapsed,
      rightSize: panelLayout.rightSize,
    });
  }, [panelLayout, toggleDiagnostic]);

  const handleExitDiagnostic = useCallback(() => {
    const snapshot = popLayoutSnapshot();
    exitDiagnostic();
    if (snapshot) {
      setPanelLayout({
        leftCollapsed: snapshot.leftCollapsed,
        leftSize: snapshot.leftSize,
        rightCollapsed: snapshot.rightCollapsed,
        rightSize: snapshot.rightSize,
      });
      setLeftNavCollapsed(snapshot.leftCollapsed);
    }
  }, [exitDiagnostic, popLayoutSnapshot]);

  useEcgWorkstationShortcuts({
    controls,
    diagnosticMode,
    onEnterDiagnostic: enterDiagnosticMode,
    onExitDiagnostic: handleExitDiagnostic,
    onExportPdf: () => void exportPdf(),
    onOpenCases: () => router.push("/ecg-cases" as never),
    onOpenCommandPalette: () => setCommandPaletteOpen(true),
    onSave: scheduleSave,
    onUpload: () => router.push("/upload-ecg" as never),
    onViewModeChange: enterprise.setViewMode,
    playback,
    viewMode: enterprise.viewMode,
    workspace,
  });

  useEffect(() => {
    setUnsavedChanges(true);
    scheduleSaveRef.current();
    const timer = setTimeout(() => setUnsavedChanges(false), 1500);
    return () => clearTimeout(timer);
  }, [
    aiOverlay.present.annotations.length,
    controls.adjustments.brightness,
    controls.adjustments.contrast,
    controls.grid.gain,
    controls.grid.speed,
    controls.transform.panX,
    controls.transform.panY,
    controls.transform.rotation,
    controls.transform.zoom,
    workspace.present.calipers.length,
    workspace.present.measurements.length,
  ]);

  const waveFps = renderFps;

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
    <View style={[styles.root, (controls.fullscreen || diagnosticMode) && styles.fullscreenRoot]} testID="sprint13-ecg-monitor-ready" nativeID="sprint22-hospital-workstation-ready">
      <View nativeID="sprint30-clinical-workflow-ready" style={styles.inspectorReady} testID="sprint29-zero-chrome-workstation-ready">
      {!diagnosticMode ? (
        <>
          <View style={styles.chromeRow}>
            <EcgClinicalWorkflowRibbon
              onStepPress={workflow.goToStep}
              progress={workflow.progress}
              steps={workflow.steps}
              unsavedChanges={unsavedChanges}
            />
            <EcgClinicalAlertsBanner alerts={workflow.alerts} />
            <EcgViewModeSwitcher onChange={enterprise.setViewMode} value={enterprise.viewMode} />
          </View>
          <EcgWorkstationToolbar
            aiOverlay={aiOverlay}
            compareLayout={enterprise.compareLayout}
            compareMode={enterprise.compareMode}
            controls={controls}
            onCompareLayoutChange={enterprise.setCompareLayout}
            onCompareToggle={enterprise.toggleCompareMode}
            onDigitize={() => digitizeMutation.mutate()}
            onEnterDiagnostic={enterDiagnosticMode}
            onExportCsv={exportCsv}
            onExportJson={() => void exportJson()}
            onExportPdf={() => void exportPdf()}
            onExportPng={() => void exportPng()}
            onLeadCycle={cycleLead}
            onOpenCases={() => router.push("/ecg-cases" as never)}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
            onOpenSettings={() => enterprise.setSettingsVisible(true)}
            onSave={scheduleSave}
            onToggleCrosshair={() => setShowCrosshair((value) => !value)}
            onToggleMagnifier={() => setShowMagnifier((value) => !value)}
            showCrosshair={showCrosshair}
            showMagnifier={showMagnifier}
            onToggleLeftPanel={() =>
              setPanelLayout((current) => {
                const nextCollapsed = !current.leftCollapsed;
                setLeftNavCollapsed(nextCollapsed);
                return { ...current, leftCollapsed: nextCollapsed };
              })
            }
            onToggleRightPanel={() => setPanelLayout((current) => ({ ...current, rightCollapsed: !current.rightCollapsed }))}
            onUpload={() => router.push("/upload-ecg" as never)}
            onViewModeChange={enterprise.setViewMode}
            playback={playback}
            selectedLead={selectedLead}
            viewMode={enterprise.viewMode}
            workspace={workspace}
          />
        </>
      ) : (
        <Pressable onPress={handleExitDiagnostic} style={styles.diagnosticExitFloating} testID="sprint35-exit-diagnostic">
          <Feather color="#22C55E" name="minimize" size={14} />
          <Text style={styles.diagnosticExitLabel}>ESC · Exit</Text>
        </Pressable>
      )}

      <View style={styles.workspace}>
        <EcgViewerResizableWorkspace
          diagnosticMode={diagnosticMode}
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
              {!diagnosticMode && enterprise.viewMode === "monitor" ? (
                <EcgWaveformPlaybackTimeline durationMs={playbackDurationMs} playback={playback} />
              ) : null}
              <EcgEnterpriseStatusBar
                compact={diagnosticMode}
                fps={waveFps}
                gain={controls.grid.gain}
                gpuRenderer={renderMetrics?.gpuAccelerated ? `${renderMetrics.backend.toUpperCase()} GPU` : statusMetrics.gpuRenderer}
                gridVisible={controls.grid.visible}
                lead={selectedLead}
                memory={statusMetrics.memory}
                paperSpeed={controls.grid.speed}
                zoom={controls.transform.zoom}
              />
            </View>
          }
          center={
            <View style={styles.viewerHost}>
              {enterprise.viewMode === "report" ? (
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
                onFpsUpdate={handleFpsUpdate}
                onMetricsUpdate={setRenderMetrics}
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
                onFpsUpdate={handleFpsUpdate}
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
                onFpsUpdate={handleFpsUpdate}
                onMetricsUpdate={setRenderMetrics}
                pdfUrl={pdfUrl}
                processedImageUrl={processedImageUrl}
                showCrosshair={showCrosshair}
                showDigitizedWaveform={enterprise.showDigitizedWaveform}
                showMagnifier={showMagnifier}
                viewMode={enterprise.viewMode}
                workspace={workspace}
              />
            )}
              <EcgFloatingToolPalette
                controls={controls}
                diagnosticMode={diagnosticMode}
                onEnterDiagnostic={enterDiagnosticMode}
                onToggleCrosshair={() => setShowCrosshair((value) => !value)}
                onToggleLeftPanel={() =>
                  setPanelLayout((current) => {
                    const nextCollapsed = !current.leftCollapsed;
                    setLeftNavCollapsed(nextCollapsed);
                    return { ...current, leftCollapsed: nextCollapsed };
                  })
                }
                onToggleMagnifier={() => setShowMagnifier((value) => !value)}
                onToggleRightPanel={() => setPanelLayout((current) => ({ ...current, rightCollapsed: !current.rightCollapsed }))}
                showCrosshair={showCrosshair}
                showMagnifier={showMagnifier}
                workspace={workspace}
              />
            </View>
          }
          left={
            diagnosticMode ? null : (
            <EcgUnifiedClinicalLeftPanel
              analysis={analysis}
              collapsed={panelLayout.leftCollapsed || leftNavCollapsed}
              compareCaseId={enterprise.compareCaseId}
              digitalEcg={digitalEcg}
              digitizing={digitizeMutation.isPending}
              leadFocusMode={enterprise.leadFocusMode}
              notes={ecgCase.clinicalNotes ?? ecgCase.clinicalComments ?? undefined}
              onSelectCompare={(caseId) => {
                enterprise.setCompareCaseId(caseId);
                enterprise.setCompareMode(true);
                enterprise.setViewMode("compare");
              }}
              onSelectLead={setSelectedLead}
              onSelectPrevious={openStudy}
              onToggleCollapse={() =>
                setPanelLayout((current) => {
                  const next = !(current.leftCollapsed ?? false);
                  setLeftNavCollapsed(next);
                  return { ...current, leftCollapsed: next };
                })
              }
              onToggleLeadFocus={() => enterprise.setLeadFocusMode((value) => !value)}
              onTogglePin={() => setLeftNavPinned((value) => !value)}
              patient={{ age: patient.age, gender: patient.gender, id: patient.id, name: patientDisplayName(patient) }}
              pinned={leftNavPinned}
              previousStudies={previousStudies}
              selectedLead={selectedLead}
              study={study}
            />
            )
          }
          right={
            diagnosticMode ? null : (
            <EcgClinicalRightPanel
              aiConfirmed={aiConfirmed}
              aiOverlay={aiOverlay}
              analysis={analysis}
              clinicalNotes={doctorNotes}
              department={ecgCase.patient?.department ?? undefined}
              digitalEcg={digitalEcg}
              digitalEcgLoading={digitalEcgQuery.isLoading || digitizeMutation.isPending}
              explainability={explainability}
              findings={findings}
              focusSection={rightPanelSection}
              focusTab={rightPanelTab}
              hospital={ecgCase.hospitalName ?? patient.company ?? undefined}
              imageHeight={controls.viewport.imageHeight}
              imageWidth={controls.viewport.imageWidth}
              onCompareStudy={(caseId) => {
                enterprise.setCompareCaseId(caseId);
                enterprise.setCompareMode(true);
                enterprise.setViewMode("compare");
              }}
              onConfirmAi={() => setAiConfirmed(true)}
              onDigitize={() => digitizeMutation.mutate()}
              onNotesChange={setDoctorNotes}
              onOpenReview={() => router.push(`/ecg-cases/${ecgCase.id}/review` as never)}
              onExportPdf={() => void exportPdf()}
              onExportPng={() => void exportPng()}
              operatorName={operatorName}
              caseNumber={ecgCase.caseNumber ?? ecgCase.caseId}
              previousStudies={previousStudies}
              patient={{ age: patient.age, gender: patient.gender, id: patient.id, name: patientDisplayName(patient) }}
              referringPhysician={ecgCase.assignedDoctor?.name ?? ecgCase.reviewedBy?.name ?? undefined}
              studyDate={study.studyDate}
              timelineEvents={workflow.timelineEvents}
              visitId={ecgCase.caseNumber ?? ecgCase.caseId}
              workspace={workspace}
            />
            )
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
  bottomStack: { flexShrink: 0, gap: 2, minHeight: 0, overflow: "hidden" },
  chromeRow: { flexShrink: 0, gap: 4, minWidth: 0 },
  diagnosticExitFloating: {
    alignItems: "center",
    backgroundColor: "rgba(6,10,15,0.88)",
    borderColor: "rgba(34,197,94,0.35)",
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: "absolute",
    right: 8,
    top: 8,
    zIndex: 60,
  },
  diagnosticExitLabel: { color: "#22C55E", fontSize: 9, fontWeight: "800" },
  fullscreenRoot: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    padding: 0,
    zIndex: 50,
  },
  inspectorReady: { flex: 1, gap: ECG_WORKSTATION_VISUAL.workspaceGap, minHeight: 0, overflow: "hidden" },
  root: { backgroundColor: ECG_COCKPIT_COLORS.bgDeep, flex: 1, gap: ECG_WORKSTATION_VISUAL.workspaceGap, minHeight: 0, overflow: "hidden", padding: ECG_WORKSTATION_VISUAL.workspacePadding },
  viewerHost: { flex: 1, minHeight: 0, minWidth: 0, overflow: "hidden", position: "relative" },
  workspace: { flex: 1, minHeight: 0, overflow: "hidden" },
});
