import { useRouter } from "expo-router";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";

import type { ApiECGCase, ApiPatient } from "@/services/clinical";
import type { DigitalEcg } from "@/services/ecgProcessing";

import { useMonitorCanvasRef } from "./EcgLiveMonitorClinicalToolbar";
import { EcgLiveMonitorView } from "./EcgLiveMonitorView";
import { ECG_LIVE_MONITOR } from "./ecgLiveMonitorTokens";
import { durationMsForLead } from "./ecgMonitorPath";
import {
  EcgLiveMonitorHmiBottomBar,
  EcgLiveMonitorHmiDiagnosticHud,
  EcgLiveMonitorHmiLeftRail,
  EcgLiveMonitorHmiRightRail,
  EcgLiveMonitorHmiStatusBar,
  HMI_LAYOUT,
  useLiveMonitorHmiLayout,
} from "./live-monitor-hmi";
import { useLiveMonitorAudioEngine, audioModeLabel } from "./live-monitor-audio";
import { EcgLiveMonitorAudioControls, EcgLiveMonitorProHud, computeMonitorIntervals } from "./live-monitor-pro";
import { useMonitorPaletteVisibility, useMonitorTelemetry } from "./live-monitor-v2";
import type { MonitorLayoutMode } from "./monitorLayout";
import { type EcgLeadId } from "./types";
import { useEcgDiagnosticMode } from "./useEcgDiagnosticMode";
import { useEcgLiveMonitorEngine } from "./useEcgLiveMonitorEngine";
import { useEcgLiveMonitorShortcuts } from "./useEcgLiveMonitorShortcuts";
import { useEcgViewerControls } from "./useEcgViewerControls";
import type { MonitorAlarmState } from "./EcgLiveMonitorAlarmBar";

function patientAge(dob?: string | null) {
  if (!dob) return undefined;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return undefined;
  return Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000));
}

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
  patient: ApiPatient;
}) {
  const router = useRouter();
  const controls = useEcgViewerControls();
  const { height: viewportHeight } = useWindowDimensions();
  const [selectedLead, setSelectedLead] = useState<EcgLeadId>("II");
  const [fps, setFps] = useState<number | undefined>(undefined);
  const [measureMode, setMeasureMode] = useState(false);
  const canvasRef = useMonitorCanvasRef();
  const { diagnosticMode, enterDiagnostic, exitDiagnostic } = useEcgDiagnosticMode();
  const telemetry = useMonitorTelemetry();
  const hmi = useLiveMonitorHmiLayout(diagnosticMode);
  const { paletteVisible, revealPalette } = useMonitorPaletteVisibility(!hmi.controlsPinned);

  const activeLeadData = useMemo(
    () => digitalEcg?.leads.find((lead) => lead.lead === selectedLead) ?? digitalEcg?.leads.find((lead) => lead.lead === "II") ?? null,
    [digitalEcg?.leads, selectedLead],
  );

  const playbackDurationMs = useMemo(() => (activeLeadData ? durationMsForLead(activeLeadData) : 10_000), [activeLeadData]);
  const engine = useEcgLiveMonitorEngine(playbackDurationMs);

  const heartRate = ecgCase.heartRate ?? undefined;
  const rhythm = ecgCase.rhythm ?? "Pending";

  const audio = useLiveMonitorAudioEngine({
    activeLead: activeLeadData,
    enabled: !diagnosticMode,
    frozen: engine.frozen,
    heartRate,
    playheadMs: engine.playheadMs,
  });

  const intervals = useMemo(() => computeMonitorIntervals(activeLeadData), [activeLeadData]);

  useEffect(() => {
    engine.setPaperSpeed(controls.grid.speed);
  }, [controls.grid.speed, engine]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return undefined;
    if (diagnosticMode) {
      document.body.setAttribute("data-ecg-live-diagnostic", "true");
      document.documentElement.style.overflow = "hidden";
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    } else {
      document.body.removeAttribute("data-ecg-live-diagnostic");
      document.documentElement.style.overflow = "";
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
    }
    return () => {
      document.body.removeAttribute("data-ecg-live-diagnostic");
      document.documentElement.style.overflow = "";
    };
  }, [diagnosticMode]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      controls.zoomBy(event.deltaY > 0 ? -1 : 1);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [controls]);

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

  const handleLayoutModeChange = useCallback(
    (mode: MonitorLayoutMode) => {
      engine.setLayoutMode(mode);
      engine.setRhythmStripMode(false);
      engine.setIsolatedLead(null);
      engine.setComparisonPreset(null);
    },
    [engine],
  );

  useEcgLiveMonitorShortcuts({
    controls,
    engine,
    enabled: true,
    onDiagnostic: enterDiagnostic,
    onExitMonitor: handleExitMonitor,
    onToggleAudioMute: () => audio.setMode(audio.mode === "mute" ? "adult" : "mute"),
  });

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "[") hmi.toggleLeft();
      if (event.key === "]") hmi.toggleRight();
      if (event.key === "\\") hmi.toggleBottom();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hmi]);

  const handleRhythmStripToggle = useCallback(() => {
    engine.setRhythmStripMode(!engine.rhythmStripMode);
    if (!engine.rhythmStripMode) {
      setSelectedLead("II");
      engine.setRhythmStripLead("II");
    }
  }, [engine]);

  const canvasMinHeight = Math.max(
    360,
    Math.floor(viewportHeight * (diagnosticMode ? HMI_LAYOUT.diagnosticViewportRatio : HMI_LAYOUT.canvasViewportRatio)) -
      (diagnosticMode ? 0 : hmi.chromeHeight),
  );

  const patientName = `${patient.lastName}, ${patient.firstName}`.slice(0, 32);
  const mrn = patient.medicalRecordNumber ?? ecgCase.caseNumber ?? ecgCase.caseId;
  const age = patient.age ?? patientAge(patient.dateOfBirth);
  const sex = patient.gender ?? "—";
  const hospital = ecgCase.hospitalName ?? patient.company ?? undefined;
  const recordingTime = ecgCase.acquisitionDate ? new Date(ecgCase.acquisitionDate).toLocaleTimeString() : telemetry.clock;

  const measurements = useMemo(
    () =>
      [
        heartRate != null ? `HR ${heartRate} bpm` : null,
        ecgCase.prInterval != null ? `PR ${ecgCase.prInterval} ms` : null,
        ecgCase.qrsDuration != null ? `QRS ${ecgCase.qrsDuration} ms` : null,
        ecgCase.qtInterval != null ? `QT ${ecgCase.qtInterval} ms` : null,
      ].filter(Boolean) as string[],
    [ecgCase.prInterval, ecgCase.qrsDuration, ecgCase.qtInterval, heartRate],
  );

  const alerts = useMemo(() => {
    const rows: string[] = [];
    if (alarmState.leadOff) rows.push("Lead off detected");
    if (noiseLevel === "high") rows.push("High noise — verify electrode contact");
    if (heartRate != null && (heartRate < 50 || heartRate > 120)) rows.push(`Heart rate ${heartRate} bpm out of range`);
    return rows;
  }, [alarmState.leadOff, heartRate, noiseLevel]);

  const bottomVisible = paletteVisible || hmi.controlsPinned;

  return (
    <View style={[styles.root, diagnosticMode && styles.rootDiagnostic]} testID="sprint37-live-monitor-ready">
      <View nativeID="sprint50-monitor-experience-ready" style={styles.fill} testID="sprint49-hmi-workspace-ready">
        {!diagnosticMode ? (
          <>
            <EcgLiveMonitorHmiStatusBar
            age={age}
            alarmState={alarmState}
            controls={controls}
            engine={engine}
            filterLabel={engine.filter}
            fps={fps}
            heartRate={heartRate}
            hospital={hospital ?? undefined}
            isolatedLead={engine.isolatedLead}
            mrn={String(mrn)}
            onReview={() => router.push(`/ecg-workspace?caseId=${ecgCase.id}` as never)}
            patientName={patientName}
            recordingTime={recordingTime}
            rhythm={rhythm}
            samplingRate={digitalEcg?.calibration ? "500 Hz" : undefined}
            sex={sex}
            signalQuality={signalQuality}
            telemetry={telemetry}
          />
            <EcgLiveMonitorProHud
              audioMode={audioModeLabel(audio.mode)}
              battery={telemetry.batteryLevel != null ? `${telemetry.batteryLevel}%` : "AC"}
              filter={engine.filter}
              fps={fps}
              gain={controls.grid.gain}
              heartRate={heartRate}
              intervals={intervals}
              noise={noiseLevel.toUpperCase()}
              recording={engine.recording}
              samplingRate={digitalEcg?.leads[0]?.samplingRate ? `${digitalEcg.leads[0].samplingRate} Hz` : "500 Hz"}
              signalQuality={signalQuality}
              speed={controls.grid.speed}
              timestamp={telemetry.clock}
            />
            <EcgLiveMonitorAudioControls
              mode={audioModeLabel(audio.mode)}
              onCycleMode={audio.cycleMode}
              onToggleMute={() => audio.setMode(audio.mode === "mute" ? "adult" : "mute")}
              volume={audio.volume}
            />
          </>
        ) : (
          <EcgLiveMonitorHmiDiagnosticHud
            clock={telemetry.clock}
            filter={engine.filter}
            frozen={engine.frozen}
            gain={controls.grid.gain}
            heartRate={heartRate}
            isPlaying={engine.isPlaying}
            onExit={exitDiagnostic}
            rhythm={rhythm}
            speed={controls.grid.speed}
          />
        )}

        <View style={styles.workspaceRow}>
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

            {!diagnosticMode ? (
              <>
                <View pointerEvents="box-none" style={[styles.leftRailOverlay, { width: hmi.leftWidth }]}>
                  <EcgLiveMonitorHmiLeftRail
                    canvasRef={canvasRef}
                    collapsed={hmi.leftCollapsed}
                    comparisonPreset={engine.comparisonPreset}
                    controls={controls}
                    customLeads={engine.customLeads}
                    engine={engine}
                    exportFilename={`ecg-monitor-${ecgCase.caseNumber ?? ecgCase.id}.png`}
                    layoutMode={engine.layoutMode}
                    measureMode={measureMode}
                    onCollapseToggle={hmi.toggleLeft}
                    onComparisonPreset={engine.setComparisonPreset}
                    onCustomLeadsChange={engine.setCustomLeads}
                    onFocusLead={engine.focusLead}
                    onLayoutModeChange={handleLayoutModeChange}
                    onLeadChange={(lead) => {
                      engine.focusLead(lead);
                      setSelectedLead(lead);
                    }}
                    onMeasureToggle={() => setMeasureMode((v) => !v)}
                    onResetView={handleResetView}
                    onRhythmStripToggle={handleRhythmStripToggle}
                    onRhythmWindowChange={engine.setRhythmStripWindowSec}
                    rhythmStripWindowSec={engine.rhythmStripWindowSec}
                    selectedLead={selectedLead}
                  />
                </View>
                <View pointerEvents="box-none" style={[styles.rightRailOverlay, { width: hmi.rightWidth }]}>
                  <EcgLiveMonitorHmiRightRail
                    aiDiagnosis={ecgCase.aiDiagnosis ?? ecgCase.aiStatus}
                    alerts={alerts}
                    clinicalNotes={ecgCase.clinicalNotes ?? ecgCase.clinicalComments ?? undefined}
                    collapsed={hmi.rightCollapsed}
                    heartRate={heartRate}
                    measurements={measurements}
                    onCollapseToggle={hmi.toggleRight}
                    quickImpression={ecgCase.clinicalIndication ?? rhythm}
                    rhythm={rhythm}
                    signalQuality={signalQuality}
                  />
                </View>
              </>
            ) : null}

            {!diagnosticMode && bottomVisible ? (
              <View pointerEvents="box-none" style={styles.bottomOverlay}>
                <EcgLiveMonitorHmiBottomBar
                  collapsed={hmi.bottomCollapsed}
                  controls={controls}
                  durationMs={playbackDurationMs}
                  engine={engine}
                  onAutoHideToggle={() => hmi.setControlsPinned((v) => !v)}
                  onCollapseToggle={hmi.toggleBottom}
                  onEnterDiagnostic={enterDiagnostic}
                  onResetView={handleResetView}
                  palettePinned={hmi.controlsPinned}
                />
              </View>
            ) : !diagnosticMode && !bottomVisible ? (
              <View nativeID="sprint45-palette-reveal" pointerEvents="box-none" style={styles.bottomOverlay}>
                <EcgLiveMonitorHmiBottomBar
                  collapsed
                  controls={controls}
                  durationMs={playbackDurationMs}
                  engine={engine}
                  onAutoHideToggle={() => hmi.setControlsPinned(true)}
                  onCollapseToggle={revealPalette}
                  onResetView={handleResetView}
                  palettePinned={hmi.controlsPinned}
                />
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  bottomOverlay: { bottom: 6, left: 6, pointerEvents: "box-none", position: "absolute", right: 6, zIndex: 25 },
  fill: { flex: 1, minHeight: 0 },
  leftRailOverlay: { bottom: 0, left: 0, pointerEvents: "box-none", position: "absolute", top: 0, zIndex: 20 },
  monitorStage: { flex: 1, minHeight: 0, minWidth: 0, position: "relative" },
  monitorStageDiagnostic: { paddingBottom: 0 },
  rightRailOverlay: { bottom: 0, pointerEvents: "box-none", position: "absolute", right: 0, top: 0, zIndex: 20 },
  root: { backgroundColor: ECG_LIVE_MONITOR.background, flex: 1, minHeight: 0 },
  rootDiagnostic: { backgroundColor: "#000000" },
  workspaceRow: { flex: 1, minHeight: 0 },
});
