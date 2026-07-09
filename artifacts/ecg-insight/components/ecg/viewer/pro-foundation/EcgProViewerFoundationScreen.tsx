import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { EmptyState, FullScreenLoader } from "@/components/enterprise/EnterpriseUI";
import { getEcgViewerPreferences, saveEcgViewerPreferences } from "@/services/ecgViewerApi";
import { EcgCompareViewer } from "../EcgCompareViewer";
import { EcgProViewerEngine } from "../EcgProViewerEngine";
import { useEcgMeasurementWorkspace } from "../useEcgMeasurementWorkspace";
import { useEcgViewerControls } from "../useEcgViewerControls";
import { STANDARD_ECG_LEADS } from "../types";
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
  const [fps, setFps] = useState(0);
  const [lead, setLead] = useState<EcgProViewerLeadSelection>("ALL");
  const [pointer, setPointer] = useState<EcgProViewerPointer>(null);
  const [infoOpen, setInfoOpen] = useState(!isMobile);

  const { selectCase, tabIds } = useEcgProViewerTabs({ activeCaseId: caseId, tabsParam });
  const baselineCaseId = useMemo(() => tabIds.find((id) => id !== caseId), [caseId, tabIds]);

  const { isError, isLoading, session } = useEcgProViewerSession({ caseId, token });
  const baselineSessionQuery = useEcgProViewerSession({ caseId: compareEnabled ? baselineCaseId : undefined, token });

  const waveformEnabled = canvasMode !== "image" || displayMode === "waveform";
  const { digitalEcg, isLoading: waveformLoading } = useEcgProViewerWaveform({
    caseId,
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

  const clinicalMeasurements = useEcgProViewerClinicalMeasurements({
    caseId,
    enabled: Boolean(token && caseId),
    onHydrateWorkspace: measurementWorkspace.hydrate,
    token,
  });

  useEffect(() => {
    clinicalMeasurements.hydrateFromSnapshot();
  }, [clinicalMeasurements.hydrateFromSnapshot]);

  useEcgProViewerShortcuts({
    canvasMode,
    controls,
    onCanvasModeChange: setCanvasMode,
    onCompareToggle: () => setCompareEnabled((value) => !value),
    onLayoutPresetChange: setLayoutPreset,
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
        assetHeight={enrichedSession!.imageHeight}
        assetWidth={enrichedSession!.imageWidth}
        controls={controls}
        imageUrl={displayMode === "grid" ? undefined : enrichedSession!.imageUrl}
        onPointerMove={onPointerMove}
        showMiniNavigator={false}
        testID="sprint95-ecg-pro-viewer-native-engine"
      />
    )
  ) : null;

  const imageCanvas = rawImageCanvas ? (
    <EcgProViewerMeasurementLayer
      controls={controls}
      imageHeight={enrichedSession!.imageHeight ?? 0}
      imageWidth={enrichedSession!.imageWidth ?? 0}
      workspace={measurementWorkspace}
    >
      <View style={styles.imageCanvas} testID="sprint96-ecg-pro-viewer-image-canvas">
        {rawImageCanvas}
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
      controls={controls}
      currentDigitizedLeads={[]}
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
      testID="sprint95-ecg-pro-viewer-root"
    >
      <EcgProViewerCaseTabs activeCaseId={caseId} onSelect={selectCase} tabIds={tabIds} theme={theme} />

      <EcgProViewerToolbar
        canvasMode={canvasMode}
        caseName={enrichedSession?.caseNumber}
        compareEnabled={compareEnabled}
        controls={controls}
        displayMode={displayMode}
        imageUrl={enrichedSession?.imageUrl}
        layoutPreset={layoutPreset}
        lead={lead}
        onCanvasModeChange={setCanvasMode}
        onCompareToggle={() => setCompareEnabled((value) => !value)}
        onDisplayModeChange={setDisplayMode}
        onDownload={() => openAsset(enrichedSession?.imageUrl)}
        onLayoutPresetChange={setLayoutPreset}
        onLeadChange={setLead}
        onPrint={() => printAsset(enrichedSession?.imageUrl)}
        onThemeToggle={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
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
            onLayoutPresetChange={setLayoutPreset}
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
        {!isMobile && !isTablet ? (
          <EcgProViewerInfoPanel controls={controls} session={enrichedSession!} theme={theme} />
        ) : null}
        {(isMobile || isTablet) && infoOpen ? (
          <EcgProViewerInfoPanel controls={controls} session={enrichedSession!} theme={theme} />
        ) : null}
      </View>

      {(isMobile || isTablet) ? (
        <Pressable onPress={() => setInfoOpen((value) => !value)} style={styles.infoToggle}>
          <Text style={styles.infoToggleText}>{infoOpen ? "Hide study info" : "Show study info"}</Text>
        </Pressable>
      ) : null}

      <EcgProViewerClinicalMeasurementsPanel
        autoPending={clinicalMeasurements.autoPending}
        onAutoMeasure={() => void clinicalMeasurements.autoMeasure()}
        onSaveManual={() => void clinicalMeasurements.saveManual(measurementWorkspace.exportState())}
        record={clinicalMeasurements.latestRecord}
        savePending={clinicalMeasurements.savePending}
        theme={theme}
        workspace={measurementWorkspace}
      />

      <EcgProViewerStatusBar controls={controls} fps={fps} pointer={pointer} theme={theme} />

      {lead !== "ALL" && STANDARD_ECG_LEADS.includes(lead) ? (
        <Text style={styles.leadBadge} testID="sprint95-selected-lead">Lead focus: {lead}</Text>
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
