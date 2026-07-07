import React, { memo, useRef } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/enterprise/EnterpriseUI";

import { ECG_LIVE_MONITOR } from "./ecgLiveMonitorTokens";

export const EcgLiveMonitorClinicalToolbar = memo(function EcgLiveMonitorClinicalToolbar({
  measureMode,
  onExport,
  onMeasureToggle,
  onPanToggle,
  onResetView,
  onSnapshot,
  panActive,
  controls,
}: {
  measureMode: boolean;
  onExport: () => void;
  onMeasureToggle: () => void;
  onPanToggle: () => void;
  onResetView: () => void;
  onSnapshot: () => void;
  panActive: boolean;
  controls: { togglePanMode: () => void; zoomBy: (delta: number) => void; transform: { zoom: number } };
}) {
  return (
    <View accessibilityRole="toolbar" style={styles.root} testID="sprint41-live-monitor-toolbar">
      <ToolbarGroup label="View">
        <PrimaryButton label="Zoom +" onPress={() => controls.zoomBy(1)} variant="outline" />
        <PrimaryButton label="Zoom −" onPress={() => controls.zoomBy(-1)} variant="outline" />
        <PrimaryButton label={panActive ? "Pan On" : "Pan"} onPress={onPanToggle} variant={panActive ? "primary" : "outline"} />
        <PrimaryButton label="Reset View" onPress={onResetView} variant="outline" />
      </ToolbarGroup>
      <ToolbarGroup label="Measure">
        <PrimaryButton label={measureMode ? "Calipers On" : "Calipers"} onPress={onMeasureToggle} variant={measureMode ? "primary" : "outline"} />
        <PrimaryButton label="Measure" onPress={onMeasureToggle} variant="outline" />
      </ToolbarGroup>
      <ToolbarGroup label="Capture">
        <PrimaryButton label="Snapshot" onPress={onSnapshot} variant="outline" />
        <PrimaryButton label="Export PNG" onPress={onExport} variant="outline" />
      </ToolbarGroup>
      <Text style={styles.meta}>Zoom {Math.round(controls.transform.zoom * 100)}%</Text>
    </View>
  );
});

function ToolbarGroup({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <ScrollView horizontal contentContainerStyle={styles.groupRow} showsHorizontalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

export function exportMonitorCanvas(canvas: HTMLCanvasElement | null, filename: string) {
  if (!canvas || Platform.OS !== "web") return;
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export function useMonitorCanvasRef() {
  return useRef<HTMLCanvasElement | null>(null);
}

const styles = StyleSheet.create({
  group: { gap: 2 },
  groupLabel: { color: ECG_LIVE_MONITOR.statusMuted, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  groupRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  meta: { color: ECG_LIVE_MONITOR.statusMuted, fontSize: 10, fontWeight: "700", paddingTop: 4 },
  root: {
    backgroundColor: ECG_LIVE_MONITOR.canvasBackground,
    borderBottomColor: ECG_LIVE_MONITOR.border,
    borderBottomWidth: 1,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
