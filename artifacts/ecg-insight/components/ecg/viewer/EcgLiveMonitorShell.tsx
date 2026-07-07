import { useRouter } from "expo-router";
import React, { memo, useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/enterprise/EnterpriseUI";
import type { ApiECGCase } from "@/services/clinical";
import type { DigitalEcg } from "@/services/ecgProcessing";

import { ECG_LIVE_MONITOR, ECG_LIVE_MONITOR_TYPO } from "./ecgLiveMonitorTokens";
import { durationMsForLead } from "./ecgMonitorPath";
import { EcgLiveMonitorControls } from "./EcgLiveMonitorControls";
import { EcgLiveMonitorLeadStrip } from "./EcgLiveMonitorLeadStrip";
import { EcgLiveMonitorStatusPanel } from "./EcgLiveMonitorStatusPanel";
import { EcgLiveMonitorView } from "./EcgLiveMonitorView";
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
  const [selectedLead, setSelectedLead] = useState<EcgLeadId>("II");
  const [fps, setFps] = useState<number | undefined>(undefined);
  const { diagnosticMode, enterDiagnostic, exitDiagnostic } = useEcgDiagnosticMode();

  const activeLeadData = useMemo(
    () => digitalEcg?.leads.find((lead) => lead.lead === selectedLead) ?? digitalEcg?.leads.find((lead) => lead.lead === "II") ?? null,
    [digitalEcg?.leads, selectedLead],
  );

  const playbackDurationMs = useMemo(() => (activeLeadData ? durationMsForLead(activeLeadData) : 10_000), [activeLeadData]);
  const engine = useEcgLiveMonitorEngine(playbackDurationMs);

  const heartRate = ecgCase.heartRate ?? undefined;
  const rhythm = ecgCase.rhythm ?? "Pending";
  const signalQuality =
    digitalEcg?.validation?.signalContinuityPercent != null
      ? `${Math.round(digitalEcg.validation.signalContinuityPercent)}% continuity`
      : digitalEcg?.quality?.score != null
        ? `Score ${Math.round(digitalEcg.quality.score * 100)}%`
        : "Unknown";

  const handleExitMonitor = useCallback(() => {
    if (diagnosticMode) {
      exitDiagnostic();
      return;
    }
    router.push(`/ecg-workspace?caseId=${ecgCase.id}` as never);
  }, [diagnosticMode, ecgCase.id, exitDiagnostic, router]);

  useEcgLiveMonitorShortcuts({
    controls,
    engine,
    enabled: true,
    onExitMonitor: handleExitMonitor,
  });

  const handleRhythmStripToggle = useCallback(() => {
    engine.setRhythmStripMode(!engine.rhythmStripMode);
    if (!engine.rhythmStripMode) setSelectedLead("II");
  }, [engine]);

  return (
    <View style={styles.root} testID="sprint37-live-monitor-ready">
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
            <EcgLiveMonitorStatusPanel
              compact
              controls={controls}
              engine={engine}
              fps={fps}
              heartRate={heartRate}
              rhythm={rhythm}
              signalQuality={signalQuality}
            />
          </View>
        </View>
      )}

      {!diagnosticMode ? (
        <EcgLiveMonitorStatusPanel
          controls={controls}
          engine={engine}
          fps={fps}
          heartRate={heartRate}
          rhythm={rhythm}
          signalQuality={signalQuality}
        />
      ) : null}

      {!diagnosticMode ? (
        <EcgLiveMonitorLeadStrip
          onLeadChange={(lead) => {
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
          chrome={diagnosticMode ? "canvas-only" : "workspace"}
          controls={controls}
          heartRate={heartRate}
          isDigitizing={isDigitizing}
          lead={activeLeadData}
          onDigitize={onDigitize}
          onFpsUpdate={setFps}
          playback={engine}
          rhythm={rhythm}
          rhythmStripMode={engine.rhythmStripMode}
          selectedLead={selectedLead}
        />
      </View>

      {diagnosticMode ? (
        <EcgLiveMonitorControls controls={controls} engine={engine} floating onEnterDiagnostic={undefined} />
      ) : (
        <EcgLiveMonitorControls controls={controls} engine={engine} />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  diagnosticOverlay: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 30,
  },
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
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  headerText: { flex: 1, gap: 2 },
  monitorStage: { flex: 1, minHeight: 360 },
  monitorStageDiagnostic: { paddingBottom: 120 },
  root: {
    backgroundColor: ECG_LIVE_MONITOR.background,
    flex: 1,
    minHeight: 0,
  },
  subtitle: { color: ECG_LIVE_MONITOR.statusMuted, fontSize: 12, fontWeight: "700" },
  title: { ...ECG_LIVE_MONITOR_TYPO.title, color: ECG_LIVE_MONITOR.statusText },
});
