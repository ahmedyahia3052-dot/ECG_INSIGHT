import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ECG_LIVE_MONITOR } from "../ecgLiveMonitorTokens";

export const EcgLiveMonitorHmiDiagnosticHud = memo(function EcgLiveMonitorHmiDiagnosticHud({
  clock,
  filter,
  frozen,
  gain,
  heartRate,
  isPlaying,
  onExit,
  rhythm,
  speed,
}: {
  clock: string;
  filter: string;
  frozen: boolean;
  gain: number;
  heartRate?: number;
  isPlaying: boolean;
  onExit: () => void;
  rhythm?: string;
  speed: number;
}) {
  return (
    <View pointerEvents="box-none" style={styles.overlay} testID="sprint49-hmi-diagnostic-hud">
      <Pressable accessibilityLabel="Exit diagnostic monitor" onPress={onExit} style={styles.exitChip} testID="sprint37-exit-diagnostic">
        <Text style={styles.exitText}>ESC · Exit Full Screen</Text>
      </Pressable>
      <View style={styles.hud}>
        <Text style={styles.hudText}>
          HR {heartRate ?? "--"} · {rhythm ?? "—"} · {speed} mm/s · {gain} mm/mV · {filter} · {frozen ? "FROZEN" : isPlaying ? "LIVE" : "PAUSED"} · {clock}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
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
  exitText: { color: ECG_LIVE_MONITOR.statusText, fontSize: 10, fontWeight: "800" },
  hud: {
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
  hudText: { color: ECG_LIVE_MONITOR.statusText, fontSize: 10, fontWeight: "800" },
  overlay: { left: 0, pointerEvents: "box-none", position: "absolute", right: 0, top: 0, zIndex: 30 },
});
