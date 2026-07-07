import { useRouter } from "expo-router";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { PrimaryButton } from "@/components/enterprise/EnterpriseUI";
import type { ApiECGCase } from "@/services/clinical";
import type { DigitalEcg } from "@/services/ecgProcessing";

import { exportMonitorCanvas, useMonitorCanvasRef } from "./EcgLiveMonitorClinicalToolbar";
import { EcgLiveMonitorView } from "./EcgLiveMonitorView";
import { ECG_LIVE_MONITOR, ECG_LIVE_MONITOR_TYPO } from "./ecgLiveMonitorTokens";
import { durationMsForLead } from "./ecgMonitorPath";
import {
  EcgLiveMonitorFloatingPalette,
  EcgLiveMonitorHospitalHud,
  useMonitorPaletteVisibility,
  useMonitorTelemetry,
} from "./live-monitor-v2";
import type { MonitorLayoutMode } from "./monitorLayout";
import { type EcgLeadId } from "./types";
import { useEcgDiagnosticMode } from "./useEcgDiagnosticMode";
import { useEcgLiveMonitorEngine } from "./useEcgLiveMonitorEngine";
import { useEcgLiveMonitorShortcuts } from "./useEcgLiveMonitorShortcuts";
import { useEcgViewerControls } from "./useEcgViewerControls";
import type { MonitorAlarmState } from "./EcgLiveMonitorAlarmBar";

export const EcgLiveMonitorShell = memo(function EcgLiveMonitorShell({
  digitalEcg,
  ecgCase,
  isDigitizing,
  onDigitize,
  patient,
}: {
  digitalEcg?: DigitalEcg | null;
  ecgCase: ApiECGCase;
  isDigitizing?: boolean;
  onDigitize?: () => void;
  patient: { firstName: string; id: string; lastName: string };
}) {
  const router = useRouter();
  const controls = useEcgViewerControls();
  const { height: viewportHeight } = useWindowDimensions();
  const [selectedLead, setSelectedLead] = useState<EcgLeadId>("II");
  const [fps, setFps] = useState<number | undefined>(undefined);
  const [measureMode, setMeasureMode] = useState(false);
  const [autoHideControls, setAutoHideControls] = useState(false);
  const canvasRef = useMonitorCanvasRef();
  const { diagnosticMode, enterDiagnostic, exitDiagnostic } = useEcgDiagnosticMode();
  const telemetry = useMonitorTelemetry();
  const { paletteVisible, revealPalette } = useMonitorPaletteVisibility(autoHideControls);

  const activeLeadData = useMemo(
    () => digitalEcg?.leads.find((lead) => lead.lead === selectedLead) ?? digitalEcg?.leads.find((lead) => lead.lead === "II") ?? null,
    [digitalEcg?.leads, selectedLead],
  );

  const playbackDurationMs = useMemo(() => (activeLeadData ? durationMsForLead(activeLeadData) : 10_000), [activeLeadData]);
  const engine = useEcgLiveMonitorEngine(playbackDurationMs);

  useEffect(() => {
    engine.setPaperSpeed(controls.grid.speed);
  }, [controls.grid.speed, engine]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return undefined;
    if (diagnosticMode) {
      document.body.setAttribute("data-ecg-live-diagnostic", "true");
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.removeAttribute("data-ecg-live-diagnostic");
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.removeAttribute("data-ecg-live-diagnostic");
      document.documentElement.style.overflow = "";
    };
  }, [diagnosticMode]);

  const heartRate = ecgCase.heartRate ?? undefined;
  const rhythm = ecgCase.rhythm ?? "Pending";
  const signalQuality =
    digitalEcg?.validation?.signalContinuityPercent != null
      ? `${Math.round(digitalEcg.validation.signalContinuityPercent)}%`
      : digitalEcg?.quality?.score != null
        ? `${Math.round(digitalEcg.quality.score * 100)}%`
        : "Unknown";

  const noiseLevel: MonitorAlarmState["noiseLevel"] = useMemo(() => {
    const score = digitalEcg?.quality?.score;
    if (score == null) return "medium";
    if (score >= 0.8) return "low";
    if (score >= 0.55) return "medium";
    return "high";
  }, [digitalEcg?.quality?.score]);

  const alarmState: MonitorAlarmState = useMemo(
    () => ({
      acquisitionStatus: !digitalEcg?.leads.length
        ? "no_signal"
        : engine.reviewMode
          ? "review"
          : engine.frozen
            ? "frozen"
            : engine.isPlaying
              ? "live"
              : "paused",
      heartRate,
      leadOff: !activeLeadData || (activeLeadData.samples.length ?? 0) < 2,
      noiseLevel,
      signalQualityLabel: signalQuality,
    }),
    [activeLeadData, digitalEcg?.leads.length, engine.frozen, engine.isPlaying, engine.reviewMode, heartRate, noiseLevel, signalQuality],
  );

  const handleExitMonitor = useCallback(() => {
    if (diagnosticMode) {
      exitDiagnostic();
      return;
    }
    router.push(`/ecg-workspace?caseId=${ecgCase.id}` as never);
  }, [diagnosticMode, ecgCase.id, exitDiagnostic, router]);

  const handleResetView = useCallback(() => {
    controls.resetView();
    engine.setHorizontalScroll(0);
  }, [controls, engine]);

  const handleSnapshot = useCallback(() => {
    exportMonitorCanvas(canvasRef.current, `ecg-monitor-${ecgCase.caseNumber ?? ecgCase.id}.png`);
  }, [canvasRef, ecgCase.caseNumber, ecgCase.id]);

  const handleLayoutModeChange = useCallback(
    (mode: MonitorLayoutMode) => {
      engine.setLayoutMode(mode);
      engine.setRhythmStripMode(false);
      engine.setIsolatedLead(null);
    },
    [engine],
  );

  useEcgLiveMonitorShortcuts({
    controls,
    engine,
    enabled: true,
    onDiagnostic: enterDiagnostic,
    onExitMonitor: handleExitMonitor,
  });

  const handleRhythmStripToggle = useCallback(() => {
    engine.setRhythmStripMode(!engine.rhythmStripMode);
    if (!engine.rhythmStripMode) {
      setSelectedLead("II");
      engine.setRhythmStripLead("II");
    }
  }, [engine]);

  const canvasMinHeight = Math.max(
    360,
    Math.floor(viewportHeight * ECG_LIVE_MONITOR.canvasViewportRatio) - (diagnosticMode ? 0 : ECG_LIVE_MONITOR.chromeCompact),
  );

  const patientLabel = `${patient.lastName}, ${patient.firstName}`.slice(0, 24);
  const patientId = ecgCase.caseNumber ?? ecgCase.caseId ?? patient.id;

  return (
    <View style={[styles.root, diagnosticMode && styles.rootDiagnostic]} testID="sprint37-live-monitor-ready">
      {!diagnosticMode ? (
        <View style={styles.topChrome}>
          <View style={styles.header} testID="sprint37-live-monitor-header">
            <Text style={styles.title} numberOfLines={1}>
              LIVE · {patientLabel}
            </Text>
            <View style={styles.headerActions}>
              <PrimaryButton label="Review" onPress={() => router.push(`/ecg-workspace?caseId=${ecgCase.id}` as never)} variant="outline" />
            </View>
          </View>
          <EcgLiveMonitorHospitalHud
            alarmState={alarmState}
            controls={controls}
            engine={engine}
            filterLabel={engine.filter}
            fps={fps}
            heartRate={heartRate}
            isolatedLead={engine.isolatedLead}
            patientId={String(patientId)}
            rhythm={rhythm}
            signalQuality={signalQuality}
            telemetry={telemetry}
          />
        </View>
      ) : (
        <View pointerEvents="box-none" style={styles.diagnosticOverlay}>
          <Pressable accessibilityLabel="Exit diagnostic monitor" onPress={exitDiagnostic} style={styles.exitChip} testID="sprint37-exit-diagnostic">
            <Text style={styles.exitChipText}>ESC · Exit Full Screen</Text>
          </Pressable>
          <View style={styles.diagnosticHud}>
            <Text style={styles.diagnosticHudText}>
              HR {heartRate ?? "--"} · {rhythm} · {controls.grid.speed} mm/s · {controls.grid.gain} mm/mV · {engine.filter} ·{" "}
              {engine.frozen ? "FROZEN" : engine.isPlaying ? "LIVE" : "PAUSED"} · {telemetry.clock}
            </Text>
          </View>
        </View>
      )}

      <View style={[styles.monitorStage, { minHeight: canvasMinHeight }, diagnosticMode && styles.monitorStageDiagnostic]}>
        <EcgLiveMonitorView
          allLeads={digitalEcg?.leads ?? []}
          autoFit
          canvasRef={canvasRef}
          chrome={diagnosticMode ? "canvas-only" : "workspace"}
          controls={controls}
          customLeads={engine.customLeads}
          engine={engine}
          heartRate={heartRate}
          highlightedLead={selectedLead}
          isDigitizing={isDigitizing}
          layoutMode={engine.layoutMode}
          lead={activeLeadData}
          measureMode={measureMode}
          onDigitize={onDigitize}
          onFpsUpdate={setFps}
          onPanBy={(dx, dy) => controls.panBy(dx * 0.35, dy * 0.35)}
          panActive={controls.panMode === "active"}
          playback={engine}
          reviewMode={engine.reviewMode}
          rhythm={rhythm}
          rhythmStripLead={engine.rhythmStripLead}
          rhythmStripMode={engine.rhythmStripMode}
          selectedLead={selectedLead}
          showMiniNavigator={false}
        />
      </View>

      <EcgLiveMonitorFloatingPalette
        autoHideEnabled={autoHideControls}
        canvasRef={canvasRef}
        controls={controls}
        customLeads={engine.customLeads}
        diagnosticMode={diagnosticMode}
        engine={engine}
        exportFilename={`ecg-monitor-${ecgCase.caseNumber ?? ecgCase.id}.png`}
        layoutMode={engine.layoutMode}
        measureMode={measureMode}
        onAutoHideToggle={() => setAutoHideControls((v) => !v)}
        onCustomLeadsChange={engine.setCustomLeads}
        onEnterDiagnostic={diagnosticMode ? undefined : enterDiagnostic}
        onLayoutModeChange={handleLayoutModeChange}
        onLeadChange={(lead) => {
          engine.setLayoutMode("single");
          engine.setRhythmStripMode(false);
          engine.setIsolatedLead(null);
          setSelectedLead(lead);
        }}
        onMeasureToggle={() => setMeasureMode((v) => !v)}
        onResetView={handleResetView}
        onRhythmStripToggle={handleRhythmStripToggle}
        paletteVisible={paletteVisible || !autoHideControls}
        revealPalette={revealPalette}
        selectedLead={selectedLead}
      />

      {diagnosticMode ? (
        <View style={styles.hiddenControls} testID="sprint37-live-monitor-controls">
          <PrimaryButton label="Snapshot" onPress={handleSnapshot} variant="outline" />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  diagnosticHud: {
    alignSelf: "flex-end",
    backgroundColor: ECG_LIVE_MONITOR.overlay,
    borderColor: ECG_LIVE_MONITOR.border,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 6,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  diagnosticHudText: { color: ECG_LIVE_MONITOR.statusText, fontSize: 10, fontWeight: "800" },
  diagnosticOverlay: { left: 0, pointerEvents: "box-none", position: "absolute", right: 0, top: 0, zIndex: 30 },
  exitChip: {
    alignSelf: "flex-start",
    backgroundColor: ECG_LIVE_MONITOR.overlay,
    borderColor: ECG_LIVE_MONITOR.border,
    borderRadius: 999,
    borderWidth: 1,
    marginLeft: 6,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  exitChipText: { color: ECG_LIVE_MONITOR.statusText, fontSize: 10, fontWeight: "800" },
  header: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 6,
    justifyContent: "space-between",
    minHeight: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  headerActions: { flexDirection: "row", gap: 4 },
  hiddenControls: { height: 0, opacity: 0, overflow: "hidden", position: "absolute", width: 0 },
  monitorStage: { flex: 1, minHeight: 0 },
  monitorStageDiagnostic: { paddingBottom: 0 },
  root: { backgroundColor: ECG_LIVE_MONITOR.background, flex: 1, minHeight: 0 },
  rootDiagnostic: { backgroundColor: "#000000" },
  title: { ...ECG_LIVE_MONITOR_TYPO.title, color: ECG_LIVE_MONITOR.statusText, flex: 1, fontSize: 11 },
  topChrome: { flexShrink: 0 },
});
