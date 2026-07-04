import React from "react";
import { Linking, Platform, ScrollView, StyleSheet, View } from "react-native";

import { PrimaryButton, medicalTheme } from "@/components/enterprise/EnterpriseUI";

import type { EcgViewerControls } from "./useEcgViewerControls";

type Props = {
  controls: EcgViewerControls;
  imageUrl?: string;
  onCapture?: () => void;
  onOpen?: () => void;
  onUpload?: () => void;
  pdfUrl?: string;
};

export function EcgViewerToolbar({ controls, imageUrl, pdfUrl, onOpen, onUpload, onCapture }: Props) {
  const exportTarget = imageUrl ?? pdfUrl;

  return (
    <View style={styles.toolbar} testID="sprint13-ecg-viewer-toolbar">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <PrimaryButton label="Open ECG" onPress={() => (onOpen ? onOpen() : exportTarget ? void Linking.openURL(exportTarget) : undefined)} variant="outline" />
        <PrimaryButton label="Upload" onPress={() => onUpload?.()} variant="outline" />
        <PrimaryButton label="Capture" onPress={() => onCapture?.()} variant="outline" />
        <PrimaryButton label="Zoom In" onPress={() => controls.zoomBy(0.2)} variant="outline" />
        <PrimaryButton label="Zoom Out" onPress={() => controls.zoomBy(-0.2)} variant="outline" />
        <PrimaryButton label="Fit Width" onPress={() => controls.applyFit("width")} variant="outline" />
        <PrimaryButton label="Fit Height" onPress={() => controls.applyFit("height")} variant="outline" />
        <PrimaryButton label="100%" onPress={() => controls.applyFit("100")} variant="outline" />
        <PrimaryButton label="Reset View" onPress={controls.resetView} variant="outline" />
        <PrimaryButton label="Rotate" onPress={controls.rotate} variant="outline" />
        <PrimaryButton disabled label="Measure" onPress={() => undefined} variant="outline" />
        <PrimaryButton disabled label="Compare" onPress={() => undefined} variant="outline" />
        <PrimaryButton disabled label="AI Overlay" onPress={() => undefined} variant="outline" />
        <PrimaryButton
          label="Export"
          onPress={() => {
            if (exportTarget) void Linking.openURL(exportTarget);
          }}
          variant="outline"
        />
        <PrimaryButton
          label="Print"
          onPress={() => {
            if (Platform.OS === "web" && typeof window !== "undefined" && exportTarget) window.open(exportTarget, "_blank");
          }}
          variant="outline"
        />
        <PrimaryButton label={controls.fullscreen ? "Exit Fullscreen" : "Fullscreen"} onPress={controls.toggleFullscreen} variant="outline" />
        <PrimaryButton label={controls.grid.visible ? "Grid On" : "Grid Off"} onPress={controls.toggleGrid} variant={controls.grid.visible ? "primary" : "outline"} />
        <PrimaryButton label={`${controls.grid.speed} mm/sec`} onPress={controls.cycleSpeed} variant="outline" />
        <PrimaryButton label={`${controls.grid.gain} mm/mV`} onPress={controls.cycleGain} variant="outline" />
        <PrimaryButton label="Flip H" onPress={() => controls.setAdjustments((value) => ({ ...value, flipHorizontal: !value.flipHorizontal }))} variant="outline" />
        <PrimaryButton label="Flip V" onPress={() => controls.setAdjustments((value) => ({ ...value, flipVertical: !value.flipVertical }))} variant="outline" />
        <PrimaryButton label="Invert" onPress={() => controls.setAdjustments((value) => ({ ...value, invert: !value.invert }))} variant="outline" />
        <PrimaryButton label="Grayscale" onPress={() => controls.setAdjustments((value) => ({ ...value, grayscale: !value.grayscale }))} variant="outline" />
        <PrimaryButton label="Sharpen" onPress={() => controls.setAdjustments((value) => ({ ...value, sharpen: !value.sharpen }))} variant="outline" />
        <PrimaryButton label="Brighter" onPress={() => controls.setAdjustments((value) => ({ ...value, brightness: Math.min(value.brightness + 10, 180) }))} variant="outline" />
        <PrimaryButton label="Darker" onPress={() => controls.setAdjustments((value) => ({ ...value, brightness: Math.max(value.brightness - 10, 40) }))} variant="outline" />
        <PrimaryButton label="More Contrast" onPress={() => controls.setAdjustments((value) => ({ ...value, contrast: Math.min(value.contrast + 10, 180) }))} variant="outline" />
        <PrimaryButton label="Less Contrast" onPress={() => controls.setAdjustments((value) => ({ ...value, contrast: Math.max(value.contrast - 10, 40) }))} variant="outline" />
        <PrimaryButton label="Image Reset" onPress={controls.resetAdjustments} variant="outline" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  toolbar: {
    backgroundColor: medicalTheme.surface,
    borderColor: medicalTheme.border,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});
