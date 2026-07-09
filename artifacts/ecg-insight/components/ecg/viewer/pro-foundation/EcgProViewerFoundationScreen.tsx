import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { EmptyState, FullScreenLoader } from "@/components/enterprise/EnterpriseUI";
import type { ApiECGCase } from "@/services/clinical";
import { getEcgViewerPreferences, saveEcgViewerPreferences } from "@/services/ecgViewerApi";
import { EcgAiClinicalOverlay } from "../EcgAiClinicalOverlay";
import { EcgCompareViewer } from "../EcgCompareViewer";
import { buildSegmentAlignedDigitizedWaveformLeads } from "../ecgDigitizedWaveformSync";
import { annotationTypeLabel } from "../ecgAiOverlayEngine";
import { EcgProViewerEngine } from "../EcgProViewerEngine";
import type { EcgAiOverlayRegion } from "../EcgAiOverlayLayer";
import type { EcgCompareLayoutMode } from "../types";
import { useEcgAiOverlayWorkspace } from "../useEcgAiOverlayWorkspace";
import { useEcgMeasurementWorkspace } from "../useEcgMeasurementWorkspace";
import { useEcgViewerControls } from "../useEcgViewerControls";
import { STANDARD_ECG_LEADS } from "../types";
import { EcgProViewerAiFindingsSidebar } from "./EcgProViewerAiFindingsSidebar";
import { EcgProViewerCanvas } from "./EcgProViewerCanvas";
import { EcgProViewerCaseTabs } from "./EcgProViewerCaseTabs";
import { EcgProViewerClinicalMeasurementsPanel } from "./EcgProViewerClinicalMeasurementsPanel";
import { EcgProViewerComparisonPanel } from "./EcgProViewerComparisonPanel";
import { EcgProViewerInfoPanel } from "./EcgProViewerInfoPanel";
import { EcgProViewerMeasurementLayer } from "./EcgProViewerMeasurementLayer";
import { EcgProViewerStatusBar } from "./EcgProViewerStatusBar";
import { EcgProViewerToolbar } from "./EcgProViewerToolbar";
import { EcgProViewerToolsPanel } from "./EcgProViewerToolsPanel";
import { EcgProViewerWaveformCanvas } from "./EcgProViewerWaveformCanvas";
import { bundleSeedFromMeasurements } from "./clinicalMeasurementCards";
import { manualPayloadFromWorkspace } from "./clinicalMeasurementMapper";
import type { DigitalEcgClinicalSeed } from "./digitalEcgFromWaveform";
import { captureCanvasSnapshot, downloadJson } from "./proViewerExport";
import type {
  EcgProViewerCanvasMode,
  EcgProViewerDisplayMode,
  EcgProViewerLayoutPreset,
  EcgProViewerLeadSelection,
  EcgProViewerPointer,
  EcgProViewerTheme,
} from "./types";
import { useEcgProViewerClinicalMeasurements } from "./useEcgProViewerClinicalMeasurements";
import { useEcgProViewerComparison } from "./useEcgProViewerComparison";
import { useEcgProViewerSession } from "./useEcgProViewerSession";
import { useEcgProViewerShortcuts } from "./useEcgProViewerShortcuts";
import { useEcgProViewerTabs } from "./useEcgProViewerTabs";
import { useEcgProViewerWaveform } from "./useEcgProViewerWaveform";

type Props = {
  caseId?: string;
  tabsParam?: string;
  token?: string;
};

const COMPARE_LAYOUTS: EcgCompareLayoutMode[] = ["side-by-side", "split", "overlay"];

function openAsset(url?: string) {
  if (!url) return;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  void Linking.openURL(url);
}

function printAsset(url?: string) {
  if (!url || Platform.OS !== "web" || typeof window === "undefined") return;
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  opened?.addEventListener("load", () => opened.print(), { once: true });
}

export function EcgProViewerFoundationScreen({ caseId, tabsParam, token }: Props) {
  const controls = useEcgViewerControls();
  const { height, width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;
  const [theme, setTheme] = useState<EcgProViewerTheme>("dark");
  const [displayMode, setDisplayMode] = useState<EcgProViewerDisplayMode>("image-grid");
  const [canvasMode, setCanvasMode] = useState<EcgProViewerCanvasMode>("hybrid");
  const [layoutPreset, setLayoutPreset] = useState<EcgProViewerLayoutPreset>("12-lead");
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareLayout, setCompareLayout] = useState<EcgCompareLayoutMode>("side-by-side");
  const [compareOpacity, setCompareOpacity] = useState(0.45);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const [fps, setFps] = useState(0);
  const [lead, setLead] = useState<EcgProViewerLeadSelection>("ALL");
  const [pointer, setPointer] = useState<EcgProViewerPointer>(null);
  const [infoOpen, setInfoOpen] = useState(!isMobile);

  const { selectCase, tabIds } = useEcgProViewerTabs({ activeCaseId: caseId, tabsParam });
  const baselineCaseId = useMemo(() => tabIds.find((id) => id !== caseId), [caseId, tabIds]);

  const { bundle, caseRecord, isError, isLoading, session } = useEcgProViewerSession({ caseId, token });
  const baselineSessionQuery = useEcgProViewerSession({ caseId: compareEnabled ? baselineCaseId : undefined, token });

  const bundleSeed = useMemo(() => bundleSeedFromMeasurements(bundle?.measurements), [bundle?.measurements]);
  const clinicalSeed = useMemo<DigitalEcgClinicalSeed>(() => {
    const diagnosis =
      caseRecord?.finalDiagnosis ??
      caseRecord?.doctorDiagnosis ??
      caseRecord?.aiDiagnosis ??
      caseRecord?.diagnosis;
    return {
      aiDiagnosis: diagnosis,
      confidence: caseRecord?.confidenceScore ?? caseRecord?.confidence,
      electricalAxisDeg: bundleSeed?.electricalAxisDeg ?? undefined,
      heartRate: bundleSeed?.heartRate ?? caseRecord?.heartRate ?? undefined,
      pWaveDurationMs: bundleSeed?.pDurationMs ?? undefined,
      prIntervalMs: bundleSeed?.prIntervalMs ?? caseRecord?.prInterval ?? undefined,
      qrsDurationMs: bundleSeed?.qrsDurationMs ?? caseRecord?.qrsDuration ?? undefined,
      qtIntervalMs: bundleSeed?.qtIntervalMs ?? caseRecord?.qtInterval ?? undefined,
      qtcIntervalMs: bundleSeed?.qtcIntervalMs ?? caseRecord?.qtcInterval ?? undefined,
      rrIntervalMs: bundleSeed?.rrIntervalMs ?? undefined,
      stDeviationMm: bundleSeed?.stLevelMm ?? undefined,
      tWaveDurationMs: bundleSeed?.tWaveDurationMs ?? undefined,
    };
  }, [bundleSeed, caseRecord]);

  const waveformEnabled = canvasMode !== "image" || displayMode === "waveform";
  const { digitalEcg, isLoading: waveformLoading } = useEcgProViewerWaveform({
    caseId,
    clinicalSeed,
    enabled: waveformEnabled,
    paper: controls.grid,
    token,
  });

  const { comparison } = useEcgProViewerComparison({
    baselineCaseId,
    caseId,
    enabled: compareEnabled,
    token,
  });

  const measurementWorkspace = useEcgMeasurementWorkspace({
    controls,
    operatorName: "ECG Pro Viewer",
  });

  const overlayCase: ApiECGCase = caseRecord ?? {
    acquisitionDate: "",
    aiStatus: "pending",
    caseId: caseId ?? "",
    ecgType: "12-lead",
    files: [],
    id: caseId ?? "",
    patient: {
      age: 0,
      dateOfBirth: "",
      firstName: "",
      gender: "unknown",
      id: "",
      lastName: "",
      medicalRecordNumber: "",
    },
    patientId: "",
    priority: "medium",
    status: "uploaded",
    uploadDate: "",
    uploadedById: "",
  };

  const aiOverlay = useEcgAiOverlayWorkspace({
    activeLead: lead === "ALL" ? "II" : lead,
    controls,
    ecgCase: overlayCase,
    operatorName: "ECG Pro Viewer",
  });

  const clinicalMeasurements = useEcgProViewerClinicalMeasurements({
    caseId,
    enabled: Boolean(token && caseId),
    onHydrateWorkspace: measurementWorkspace.hydrate,
    token,
  });

  const digitizedLeads = useMemo(
    () => buildSegmentAlignedDigitizedWaveformLeads(digitalEcg, controls.viewport.imageWidth, controls.viewport.imageHeight),
    [controls.viewport.imageHeight, controls.viewport.imageWidth, digitalEcg],
  );

  const aiOverlayRegions = useMemo<EcgAiOverlayRegion[]>(
    () =>
      aiOverlay.present.annotations
        .filter((item) => item.visible)
        .map((annotation) => ({
          height: annotation.coordinates.height,
          id: annotation.id,
          label: annotationTypeLabel(annotation.type),
          opacity: aiOverlay.present.settings.opacity,
          width: annotation.coordinates.width,
          x: annotation.coordinates.x,
          y: annotation.coordinates.y,
        })),
    [aiOverlay.present.annotations, aiOverlay.present.settings.opacity],
  );

  useEffect(() => {
    clinicalMeasurements.hydrateFromSnapshot();
  }, [clinicalMeasurements.hydrateFromSnapshot]);

  useEffect(() => {
    if (!digitalEcg) return;
    measurementWorkspace.configureWaveDetection(digitalEcg, lead === "ALL" ? "II" : lead);
  }, [digitalEcg, lead, measurementWorkspace.configureWaveDetection]);

  useEffect(() => {
    const calibration = digitalEcg?.calibration;
    if (!calibration) return;
    controls.setGrid({
      ...controls.grid,
      gain: calibration.gainMmPerMv as typeof controls.grid.gain,
      speed: calibration.paperSpeedMmPerSec as typeof controls.grid.speed,
    });
  }, [digitalEcg?.calibration?.gainMmPerMv, digitalEcg?.calibration?.paperSpeedMmPerSec]);

  const exportClinicalJson = useCallback(() => {
    downloadJson(`ecg-pro-${caseId ?? "study"}-clinical.json`, {
      bundleMeasurements: bundle?.measurements ?? null,
      caseId,
      clinicalRecord: clinicalMeasurements.latestRecord ?? null,
      manual: manualPayloadFromWorkspace(measurementWorkspace.exportState()),
      studyDate: session?.studyDate,
    });
  }, [bundle?.measurements, caseId, clinicalMeasurements.latestRecord, measurementWorkspace, session?.studyDate]);

  const captureSnapshot = useCallback(() => {
    const captured = captureCanvasSnapshot("sprint101-ecg-pro-viewer-canvas-web", `ecg-pro-${caseId ?? "study"}.png`);
    if (!captured && session?.imageUrl) openAsset(session.imageUrl);
  }, [caseId, session?.imageUrl]);

  const cycleCompareLayout = useCallback(() => {
    setCompareLayout((current) => {
      const index = COMPARE_LAYOUTS.indexOf(current);
      return COMPARE_LAYOUTS[(index + 1) % COMPARE_LAYOUTS.length]!;
    });
  }, []);

  const toggleOverlay = useCallback(() => {
    aiOverlay.setSettings({ enabled: !aiOverlay.present.settings.enabled });
  }, [aiOverlay]);

  useEcgProViewerShortcuts({
    canvasMode,
    compareLayout,
    controls,
    onAiSidebarToggle: () => setAiSidebarOpen((value) => !value),
    onCanvasModeChange: setCanvasMode,
    onCompareLayoutCycle: cycleCompareLayout,
    onCompareToggle: () => setCompareEnabled((value) => !value),
    onDisplayModeChange: setDisplayMode,
    onExportJson: exportClinicalJson,
    onLayoutPresetChange: setLayoutPreset,
    onOverlayToggle: toggleOverlay,
    onSnapshot: captureSnapshot,
  });

  useEffect(() => {
    if (!token) return;
    void getEcgViewerPreferences(token).then((response) => {
      const prefs = response.preferences;
      const nextLayout = prefs.layoutPreset;
      if (typeof nextLayout === "string") setLayoutPreset(nextLayout as EcgProViewerLayoutPreset);
      const nextCanvas = prefs.canvasMode;
      if (typeof nextCanvas === "string") setCanvasMode(nextCanvas as EcgProViewerCanvasMode);
    });
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const timer = setTimeout(() => {
      void saveEcgViewerPreferences(token, { canvasMode, layoutPreset, theme });
    }, 600);
    return () => clearTimeout(timer);
  }, [canvasMode, layoutPreset, theme, token]);

  const enrichedSession = useMemo(() => {
    if (!session) return null;
    return {
      ...session,
      imageHeight: controls.viewport.imageHeight || session.imageHeight,
      imageWidth: controls.viewport.imageWidth || session.imageWidth,
    };
  }, [controls.viewport.imageHeight, controls.viewport.imageWidth, session]);

  const onPointerMove = useCallback((coords: { imageX: number; imageY: number; x: number; y: number }) => {
    setPointer(coords);
  }, []);

  if (!token) {
    return <EmptyState message="Sign in to open the professional ECG viewer." title="Authentication required" />;
  }

  if (!caseId) {
    return (
      <EmptyState
        message="Open ECG Pro Viewer from a case, patient history, or upload workflow using ?caseId=."
        title="Select an ECG case"
      />
    );
  }

  if (isLoading || (waveformEnabled && waveformLoading)) {
    return <FullScreenLoader label="Loading professional ECG viewer…" />;
  }

  const hasImage = !!enrichedSession?.imageUrl;
  const hasWaveform = !!digitalEcg?.leads?.length;

  if (isError || (!hasImage && !hasWaveform)) {
    return (
      <EmptyState
        message="Upload an ECG image for this case, then reopen ECG Pro Viewer."
        title="No ECG image available"
      />
    );
  }

  const overlayEnabled = aiOverlay.present.settings.enabled;
  const imageHeight = enrichedSession!.imageHeight ?? controls.viewport.imageHeight;
  const imageWidth = enrichedSession!.imageWidth ?? controls.viewport.imageWidth;

  const rawImageCanvas = hasImage && canvasMode !== "waveform" ? (
    Platform.OS === "web" ? (
      <EcgProViewerCanvas
        controls={controls}
        displayMode={displayMode}
        imageUrl={enrichedSession!.imageUrl}
        onPointerMove={onPointerMove}
        theme={theme}
      />
    ) : (
      <EcgProViewerEngine
        aiOverlayEnabled={overlayEnabled}
        aiOverlayRegions={aiOverlayRegions}
        assetHeight={imageHeight}
        assetWidth={imageWidth}
        controls={controls}
        digitizedLeads={digitizedLeads}
        imageUrl={displayMode === "grid" ? undefined : enrichedSession!.imageUrl}
        onPointerMove={onPointerMove}
        showDigitizedWaveform={canvasMode !== "image"}
        showMiniNavigator={false}
        testID="sprint101-ecg-pro-viewer-native-engine"
        workspace={measurementWorkspace}
      />
    )
  ) : null;

  const imageCanvas = rawImageCanvas ? (
    <EcgProViewerMeasurementLayer
      controls={controls}
      imageHeight={imageHeight}
      imageWidth={imageWidth}
      workspace={measurementWorkspace}
    >
      <View style={styles.imageCanvas} testID="sprint101-ecg-pro-viewer-image-canvas">
        {rawImageCanvas}
        {Platform.OS === "web" && overlayEnabled ? (
          <EcgAiClinicalOverlay
            activeLead={lead === "ALL" ? "II" : lead}
            containerHeight={controls.viewport.containerHeight}
            containerWidth={controls.viewport.containerWidth}
            controls={controls}
            imageHeight={imageHeight}
            imageWidth={imageWidth}
            workspace={aiOverlay}
          />
        ) : null}
      </View>
    </EcgProViewerMeasurementLayer>
  ) : null;

  const waveformCanvas = waveformEnabled && hasWaveform ? (
    <EcgProViewerWaveformCanvas
      activeLead={lead}
      controls={controls}
      digitalEcg={digitalEcg}
      layoutPreset={layoutPreset}
      onFpsUpdate={setFps}
    />
  ) : null;

  const compareCanvas = compareEnabled && baselineCaseId && hasImage ? (
    <EcgCompareViewer
      accessToken={token}
      compareImageUrl={baselineSessionQuery.session?.imageUrl}
      compareLabel={baselineCaseId}
      compareLayout={compareLayout}
      compareOpacity={compareOpacity}
      controls={controls}
      currentDigitizedLeads={digitizedLeads}
      currentImageUrl={enrichedSession!.imageUrl}
      currentLabel={caseId}
    />
  ) : null;

  const canvas = compareCanvas ?? (
    <View style={styles.stack}>
      {imageCanvas}
      {canvasMode !== "image" ? waveformCanvas : null}
    </View>
  );

  return (
    <View
      style={[styles.root, controls.fullscreen && styles.fullscreen, { minHeight: Math.max(height - 48, 640) }]}
      testID="sprint101-ecg-pro-viewer-root"
    >
      <EcgProViewerCaseTabs activeCaseId={caseId} onSelect={selectCase} tabIds={tabIds} theme={theme} />

      <EcgProViewerToolbar
        canvasMode={canvasMode}
        caseName={enrichedSession?.caseNumber}
        compareEnabled={compareEnabled}
        compareLayout={compareLayout}
        compareOpacity={compareOpacity}
        controls={controls}
        displayMode={displayMode}
        imageUrl={enrichedSession?.imageUrl}
        layoutPreset={layoutPreset}
        lead={lead}
        onAiSidebarToggle={() => setAiSidebarOpen((value) => !value)}
        onCanvasModeChange={setCanvasMode}
        onCompareLayoutChange={setCompareLayout}
        onCompareOpacityChange={setCompareOpacity}
        onCompareToggle={() => setCompareEnabled((value) => !value)}
        onDisplayModeChange={setDisplayMode}
        onDownload={() => openAsset(enrichedSession?.imageUrl)}
        onExportJson={exportClinicalJson}
        onLayoutPresetChange={setLayoutPreset}
        onLeadChange={setLead}
        onOverlayToggle={toggleOverlay}
        onPrint={() => printAsset(enrichedSession?.imageUrl)}
        onSnapshot={captureSnapshot}
        onThemeToggle={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
        overlayEnabled={overlayEnabled}
        patientName={enrichedSession?.patientName}
        studyDate={enrichedSession?.studyDate}
        theme={theme}
      />

      <View style={styles.workspace}>
        {!isMobile ? (
          <EcgProViewerToolsPanel
            canvasMode={canvasMode}
            controls={controls}
            displayMode={displayMode}
            layoutPreset={layoutPreset}
            onCanvasModeChange={setCanvasMode}
            onDisplayModeChange={setDisplayMode}
            onExportJson={exportClinicalJson}
            onLayoutPresetChange={setLayoutPreset}
            onSnapshot={captureSnapshot}
            theme={theme}
            workspace={measurementWorkspace}
          />
        ) : null}
        <View style={styles.centerColumn}>
          <View style={styles.canvasRegion}>{canvas}</View>
          {compareEnabled ? (
            <EcgProViewerComparisonPanel baselineCaseId={baselineCaseId} comparison={comparison} theme={theme} />
          ) : null}
        </View>
        {aiSidebarOpen && !isMobile ? (
          <EcgProViewerAiFindingsSidebar aiOverlay={aiOverlay} bundle={bundle} caseRecord={caseRecord} onClose={() => setAiSidebarOpen(false)} theme={theme} />
        ) : null}
        {!isMobile && !isTablet && !aiSidebarOpen ? (
          <EcgProViewerInfoPanel bundle={bundle} controls={controls} session={enrichedSession!} theme={theme} />
        ) : null}
        {(isMobile || isTablet) && infoOpen ? (
          <EcgProViewerInfoPanel bundle={bundle} controls={controls} session={enrichedSession!} theme={theme} />
        ) : null}
      </View>

      {(isMobile || isTablet) ? (
        <Pressable onPress={() => setInfoOpen((value) => !value)} style={styles.infoToggle}>
          <Text style={styles.infoToggleText}>{infoOpen ? "Hide study info" : "Show study info"}</Text>
        </Pressable>
      ) : null}

      {(isMobile || isTablet) && aiSidebarOpen ? (
        <EcgProViewerAiFindingsSidebar aiOverlay={aiOverlay} bundle={bundle} caseRecord={caseRecord} onClose={() => setAiSidebarOpen(false)} theme={theme} />
      ) : null}

      <EcgProViewerClinicalMeasurementsPanel
        autoPending={clinicalMeasurements.autoPending}
        bundleSeed={bundleSeed}
        onAutoMeasure={() => void clinicalMeasurements.autoMeasure()}
        onSaveManual={() => void clinicalMeasurements.saveManual(measurementWorkspace.exportState())}
        record={clinicalMeasurements.latestRecord}
        savePending={clinicalMeasurements.savePending}
        theme={theme}
        workspace={measurementWorkspace}
      />

      <EcgProViewerStatusBar controls={controls} fps={fps} pointer={pointer} theme={theme} />

      {lead !== "ALL" && STANDARD_ECG_LEADS.includes(lead) ? (
        <Text style={styles.leadBadge} testID="sprint101-selected-lead">Lead focus: {lead}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  canvasRegion: { flex: 1, minHeight: 360 },
  centerColumn: { flex: 1, minWidth: 0 },
  fullscreen: { ...StyleSheet.absoluteFillObject, zIndex: 50 },
  imageCanvas: { flex: 1 },
  infoToggle: { alignItems: "center", padding: 8 },
  infoToggleText: { color: "#38BDF8", fontSize: 12, fontWeight: "700" },
  leadBadge: { color: "#94A3B8", fontSize: 11, paddingHorizontal: 12 },
  root: { flex: 1 },
  stack: { flex: 1, gap: 8 },
  workspace: { flex: 1, flexDirection: "row", minHeight: 420 },
});
