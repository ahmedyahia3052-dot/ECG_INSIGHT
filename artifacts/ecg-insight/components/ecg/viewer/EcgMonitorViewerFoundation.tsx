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
import { formatImageResolution } from "./ecgViewerEngine";
import { exportEcgViewerPng } from "./ecgViewerExport";
import { durationMsForLead } from "./ecgMonitorPath";
import { EcgClinicalRightPanel } from "./EcgClinicalRightPanel";
import { EcgImageCanvas } from "./EcgImageCanvas";
import { EcgLiveMonitorView } from "./EcgLiveMonitorView";
import { EcgReportPreviewPanel } from "./EcgReportPreviewPanel";
import { EcgRhythmStripPanel } from "./EcgRhythmStripPanel";
import { EcgViewModeSwitcher } from "./EcgViewModeSwitcher";
import { EcgViewerLeftRail } from "./EcgViewerLeftRail";
import { EcgViewerResizableWorkspace } from "./EcgViewerResizableWorkspace";
import { EcgViewerSettingsPanel } from "./EcgViewerSettingsPanel";
import { EcgViewerStatusBar, EcgViewerTimeline } from "./EcgViewerTimeline";
import { EcgWaveformPlaybackTimeline } from "./EcgWaveformPlaybackTimeline";
import { EcgWorkstationToolbar } from "./EcgWorkstationToolbar";
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
import { estimateImageDpi } from "./useViewerRuntimeMetrics";

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
    if (enterprise.viewMode === "overlay") {
      aiOverlay.setSettings({ enabled: true, showAnnotations: true, showLabels: true });
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
    onUpload: () => router.push("/upload-ecg" as never),
    onViewModeChange: enterprise.setViewMode,
    workspace,
  });

  useEffect(() => {
    scheduleSave();
  }, [aiOverlay.present, controls.adjustments, controls.grid, controls.transform, scheduleSave, workspace.present]);

  const waveFps = enterprise.viewMode === "monitor" ? renderFps : renderFps;
  const monitorState =
    enterprise.viewMode === "monitor"
      ? playback.frozen
        ? "Frozen"
        : playback.isPlaying
          ? "Live"
          : "Paused"
      : undefined;

  return (
    <View style={[styles.root, controls.fullscreen && styles.fullscreenRoot]} testID="sprint13-ecg-monitor-ready" nativeID="sprint18-ecg-workstation-ready">
      <View style={styles.topBar}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>ECG Pro Clinical Workstation 2.0</Text>
          <Text style={styles.subtitle}>
            {patientDisplayName(patient)} · {ecgCase.caseNumber ?? ecgCase.caseId} · Lead {selectedLead}
          </Text>
        </View>
        <EcgViewModeSwitcher onChange={enterprise.setViewMode} value={enterprise.viewMode} />
      </View>

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
        onOpenSettings={() => enterprise.setSettingsVisible(true)}
        onRhythmStrip={() => enterprise.setViewMode("monitor")}
        onToggleLeadFocus={() => enterprise.setLeadFocusMode((value) => !value)}
        onToggleTheme={enterprise.toggleWorkstationTheme}
        onUpload={() => router.push("/upload-ecg" as never)}
        onViewModeChange={enterprise.setViewMode}
        selectedLead={selectedLead}
        showDigitizedWaveform={enterprise.showDigitizedWaveform}
        viewMode={enterprise.viewMode}
        workspace={workspace}
      />

      <View style={styles.workspace}>
        <EcgViewerResizableWorkspace
          bottom={
            <View style={styles.bottomStack}>
              <EcgWaveformPlaybackTimeline durationMs={playbackDurationMs} playback={playback} />
              {enterprise.leadLayout === "rhythm" || enterprise.viewMode === "monitor" ? (
                <EcgRhythmStripPanel controls={controls} leadWaveform={rhythmLead} onLeadChange={setSelectedLead} selectedLead={selectedLead} />
              ) : null}
              <EcgViewerTimeline currentStudy={study} onSelect={openStudy} studies={previousStudies} />
              <EcgViewerStatusBar
                aiOverlayEnabled={aiOverlay.present.settings.enabled}
                annotationCount={aiOverlay.present.annotations.filter((item) => item.visible).length}
                coordinates={pointerCoords ? `${Math.round(pointerCoords.imageX)},${Math.round(pointerCoords.imageY)}` : undefined}
                digitizationQuality={
                  digitalEcg?.quality?.score != null
                    ? `${Math.round(digitalEcg.quality.score)}%`
                    : digitizeMutation.isPending
                      ? "Processing"
                      : digitalEcg
                        ? "Available"
                        : "Pending"
                }
                fileType={study.fileType}
                fitMode={controls.fitMode}
                fps={waveFps}
                gain={controls.grid.gain}
                gridOpacity={controls.grid.opacity}
                gridVisible={controls.grid.visible}
                imageDpi={estimateImageDpi(controls.viewport.imageWidth, controls.viewport.imageHeight, controls.transform.zoom)}
                imageResolution={formatImageResolution(controls.viewport.imageWidth, controls.viewport.imageHeight)}
                imageSize={`${controls.viewport.imageWidth}×${controls.viewport.imageHeight}`}
                lead={selectedLead}
                measurementCount={workspace.present.measurements.filter((item) => !item.hidden).length}
                monitorState={monitorState}
                paperSpeed={controls.grid.speed}
                signalQuality={
                  digitalEcg?.calibration?.confidence != null
                    ? `${Math.round(digitalEcg.calibration.confidence * 100)}%`
                    : analysis?.confidenceScore != null
                      ? `${Math.round(analysis.confidenceScore * 100)}%`
                      : "Pending"
                }
                toolMode={workspace.present.toolMode}
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
                digitizedLeads={digitizedLeads}
                explainability={explainability}
                imageUrl={imageUrl}
                onPointerMove={setPointerCoords}
                onFpsUpdate={setRenderFps}
                pdfUrl={pdfUrl}
                processedImageUrl={processedImageUrl}
                showDigitizedWaveform={enterprise.showDigitizedWaveform}
                viewMode={enterprise.viewMode}
                workspace={workspace}
              />
            )
          }
          left={
            <EcgViewerLeftRail
              compareCaseId={enterprise.compareCaseId}
              leadFocusMode={enterprise.leadFocusMode}
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
          }
          right={
            <EcgClinicalRightPanel
              aiOverlay={aiOverlay}
              analysis={analysis}
              digitalEcg={digitalEcg}
              digitalEcgLoading={digitalEcgQuery.isLoading || digitizeMutation.isPending}
              findings={findings}
              imageHeight={controls.viewport.imageHeight}
              imageWidth={controls.viewport.imageWidth}
              onDigitize={() => digitizeMutation.mutate()}
              workspace={workspace}
            />
          }
        />
      </View>

      <EcgViewerSettingsPanel aiOverlay={aiOverlay} controls={controls} onClose={() => enterprise.setSettingsVisible(false)} visible={enterprise.settingsVisible} />
    </View>
  );
}

const styles = StyleSheet.create({
  bottomStack: { gap: 6 },
  fullscreenRoot: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#040E1A",
    padding: 8,
    zIndex: 50,
  },
  root: { backgroundColor: "#040E1A", flex: 1, gap: 6, minHeight: 720, padding: 6 },
  subtitle: { color: medicalTheme.muted, fontSize: 12, fontWeight: "700" },
  title: { color: medicalTheme.text, fontSize: 16, fontWeight: "900" },
  titleBlock: { flex: 1, gap: 2, minWidth: 220 },
  topBar: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between" },
  workspace: { flex: 1, minHeight: 520 },
});
