import { useRouter } from "expo-router";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { PrimaryButton } from "@/components/enterprise/EnterpriseUI";
import type { ApiECGCase } from "@/services/clinical";
import type { DigitalEcg } from "@/services/ecgProcessing";

import { EcgLiveMonitorAlarmBar, type MonitorAlarmState } from "./EcgLiveMonitorAlarmBar";
import { EcgLiveMonitorClinicalToolbar, exportMonitorCanvas, useMonitorCanvasRef } from "./EcgLiveMonitorClinicalToolbar";
import { EcgLiveMonitorControls } from "./EcgLiveMonitorControls";
import { EcgLiveMonitorLeadStrip } from "./EcgLiveMonitorLeadStrip";
import { EcgLiveMonitorStatusPanel } from "./EcgLiveMonitorStatusPanel";
import { EcgLiveMonitorView } from "./EcgLiveMonitorView";
import { ECG_LIVE_MONITOR, ECG_LIVE_MONITOR_TYPO } from "./ecgLiveMonitorTokens";
import { durationMsForLead } from "./ecgMonitorPath";
import type { MonitorLayoutMode } from "./monitorLayout";
import { type EcgLeadId } from "./types";
import { useEcgDiagnosticMode } from "./useEcgDiagnosticMode";
import { useEcgLiveMonitorEngine } from "./useEcgLiveMonitorEngine";
import { useEcgLiveMonitorShortcuts } from "./useEcgLiveMonitorShortcuts";
import { useEcgViewerControls } from "./useEcgViewerControls";

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
  const { width } = useWindowDimensions();
  const [selectedLead, setSelectedLead] = useState<EcgLeadId>("II");
  const [fps, setFps] = useState<number | undefined>(undefined);
  const [measureMode, setMeasureMode] = useState(false);
  const canvasRef = useMonitorCanvasRef();
  const { diagnosticMode, enterDiagnostic, exitDiagnostic } = useEcgDiagnosticMode();

  const activeLeadData = useMemo(
    () => digitalEcg?.leads.find((lead) => lead.lead === selectedLead) ?? digitalEcg?.leads.find((lead) => lead.lead === "II") ?? null,
    [digitalEcg?.leads, selectedLead],
  );

  const playbackDurationMs = useMemo(() => (activeLeadData ? durationMsForLead(activeLeadData) : 10_000), [activeLeadData]);
  const engine = useEcgLiveMonitorEngine(playbackDurationMs);

  useEffect(() => {
    engine.setPaperSpeed(controls.grid.speed);
  }, [controls.grid.speed, engine]);

  const heartRate = ecgCase.heartRate ?? undefined;
  const rhythm = ecgCase.rhythm ?? "Pending";
  const signalQuality =
    digitalEcg?.validation?.signalContinuityPercent != null
      ? `${Math.round(digitalEcg.validation.signalContinuityPercent)}% continuity`
      : digitalEcg?.quality?.score != null
        ? `Score ${Math.round(digitalEcg.quality.score * 100)}%`
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
  }, [controls]);

  const handleSnapshot = useCallback(() => {
    exportMonitorCanvas(canvasRef.current, `ecg-monitor-${ecgCase.caseNumber ?? ecgCase.id}.png`);
  }, [canvasRef, ecgCase.caseNumber, ecgCase.id]);

  const handleLayoutModeChange = useCallback(
    (mode: MonitorLayoutMode) => {
      engine.setLayoutMode(mode);
      engine.setRhythmStripMode(false);
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

  const isCompact = width < 900;

  return (
    <View style={[styles.root, isCompact && styles.rootCompact]} testID="sprint37-live-monitor-ready">
      {!diagnosticMode ? (
        <View style={styles.header} testID="sprint37-live-monitor-header">
          <View style={styles.headerText}>
            <Text style={styles.title}>LIVE ECG MONITOR</Text>
            <Text style={styles.subtitle}>
              {ecgCase.caseNumber ?? ecgCase.caseId} · {patient.firstName} {patient.lastName}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <PrimaryButton label="ECG Review Workspace" onPress={() => router.push(`/ecg-workspace?caseId=${ecgCase.id}` as never)} variant="outline" />
            <PrimaryButton label="Diagnostic Monitor" onPress={() => enterDiagnostic()} variant="primary" />
          </View>
        </View>
      ) : (
        <View pointerEvents="box-none" style={styles.diagnosticOverlay}>
          <Pressable accessibilityLabel="Exit diagnostic monitor" onPress={exitDiagnostic} style={styles.exitChip} testID="sprint37-exit-diagnostic">
            <Text style={styles.exitChipText}>ESC · Exit Monitor</Text>
          </Pressable>
          <View style={styles.diagnosticStatus}>
            <EcgLiveMonitorStatusPanel compact controls={controls} engine={engine} fps={fps} heartRate={heartRate} rhythm={rhythm} signalQuality={signalQuality} />
          </View>
        </View>
      )}

      {!diagnosticMode ? <EcgLiveMonitorAlarmBar state={alarmState} /> : null}

      {!diagnosticMode ? (
        <EcgLiveMonitorStatusPanel controls={controls} engine={engine} fps={fps} heartRate={heartRate} rhythm={rhythm} signalQuality={signalQuality} />
      ) : null}

      {!diagnosticMode ? (
        <EcgLiveMonitorClinicalToolbar
          controls={controls}
          measureMode={measureMode}
          onExport={handleSnapshot}
          onMeasureToggle={() => setMeasureMode((v) => !v)}
          onPanToggle={controls.togglePanMode}
          onResetView={handleResetView}
          onSnapshot={handleSnapshot}
          panActive={controls.panMode === "active"}
        />
      ) : null}

      {!diagnosticMode ? (
        <EcgLiveMonitorLeadStrip
          layoutMode={engine.layoutMode}
          onLayoutModeChange={handleLayoutModeChange}
          onLeadChange={(lead) => {
            engine.setLayoutMode("single");
            engine.setRhythmStripMode(false);
            setSelectedLead(lead);
          }}
          onRhythmStripToggle={handleRhythmStripToggle}
          rhythmStripMode={engine.rhythmStripMode}
          selectedLead={selectedLead}
        />
      ) : null}

      <View style={[styles.monitorStage, diagnosticMode && styles.monitorStageDiagnostic]}>
        <EcgLiveMonitorView
          allLeads={digitalEcg?.leads ?? []}
          canvasRef={canvasRef}
          chrome={diagnosticMode ? "canvas-only" : "workspace"}
          controls={controls}
          heartRate={heartRate}
          isDigitizing={isDigitizing}
          layoutMode={engine.layoutMode}
          lead={activeLeadData}
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
        />
      </View>

      {diagnosticMode ? (
        <EcgLiveMonitorControls controls={controls} engine={engine} floating onResetView={handleResetView} />
      ) : (
        <EcgLiveMonitorControls controls={controls} engine={engine} onResetView={handleResetView} />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  diagnosticOverlay: { left: 0, position: "absolute", right: 0, top: 0, zIndex: 30 },
  diagnosticStatus: { paddingHorizontal: 8, paddingTop: 8 },
  exitChip: {
    alignSelf: "flex-start",
    backgroundColor: ECG_LIVE_MONITOR.overlay,
    borderColor: ECG_LIVE_MONITOR.border,
    borderRadius: 999,
    borderWidth: 1,
    marginLeft: 12,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  exitChipText: { color: ECG_LIVE_MONITOR.statusText, fontSize: 11, fontWeight: "800" },
  header: {
    alignItems: "center",
    backgroundColor: ECG_LIVE_MONITOR.background,
    borderBottomColor: ECG_LIVE_MONITOR.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  headerText: { flex: 1, gap: 2, minWidth: 220 },
  monitorStage: { flex: 1, minHeight: 360 },
  monitorStageDiagnostic: { paddingBottom: 120 },
  root: { backgroundColor: ECG_LIVE_MONITOR.background, flex: 1, minHeight: 0 },
  rootCompact: { minHeight: 480 },
  subtitle: { color: ECG_LIVE_MONITOR.statusMuted, fontSize: 12, fontWeight: "700" },
  title: { ...ECG_LIVE_MONITOR_TYPO.title, color: ECG_LIVE_MONITOR.statusText },
});
