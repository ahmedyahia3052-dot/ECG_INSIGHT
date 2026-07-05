import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, medicalTheme, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";

import type { EcgAiOverlayWorkspace } from "./useEcgAiOverlayWorkspace";
import type { EcgViewerControls } from "./useEcgViewerControls";

export function EcgViewerSettingsPanel({
  aiOverlay,
  controls,
  onClose,
  visible,
}: {
  aiOverlay?: EcgAiOverlayWorkspace;
  controls: EcgViewerControls;
  onClose: () => void;
  visible: boolean;
}) {
  const overlaySettings = aiOverlay?.present.settings;

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.backdrop}>
        <Pressable onPress={(event) => event.stopPropagation()} style={styles.sheet}>
          <View style={styles.header}>
            <SectionHeader title="Viewer Settings" subtitle="Grid, image adjustments, and overlay preferences" />
            <PrimaryButton label="Close" onPress={onClose} variant="outline" />
          </View>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Card style={styles.section}>
              <SectionHeader title="Grid Calibration" />
              <View style={styles.row}>
                <PrimaryButton label={controls.grid.visible ? "Grid On" : "Grid Off"} onPress={controls.toggleGrid} variant={controls.grid.visible ? "primary" : "outline"} />
                <PrimaryButton label={`Opacity ${Math.round(controls.grid.opacity * 100)}%`} onPress={controls.cycleGridOpacity} variant="outline" />
                <PrimaryButton label={`${controls.grid.speed} mm/s`} onPress={controls.cycleSpeed} variant="outline" />
                <PrimaryButton label={`${controls.grid.gain} mm/mV`} onPress={controls.cycleGain} variant="outline" />
                <PrimaryButton label={controls.grid.customCalibration ? "Custom Cal On" : "Custom Cal Off"} onPress={controls.toggleCustomCalibration} variant={controls.grid.customCalibration ? "primary" : "outline"} />
              </View>
            </Card>
            <Card style={styles.section}>
              <SectionHeader title="Image Adjustments" />
              <View style={styles.row}>
                <PrimaryButton label="Brighter" onPress={() => controls.setAdjustments((value) => ({ ...value, brightness: Math.min(value.brightness + 10, 180) }))} variant="outline" />
                <PrimaryButton label="Darker" onPress={() => controls.setAdjustments((value) => ({ ...value, brightness: Math.max(value.brightness - 10, 40) }))} variant="outline" />
                <PrimaryButton label="More Contrast" onPress={() => controls.setAdjustments((value) => ({ ...value, contrast: Math.min(value.contrast + 10, 180) }))} variant="outline" />
                <PrimaryButton label="Less Contrast" onPress={() => controls.setAdjustments((value) => ({ ...value, contrast: Math.max(value.contrast - 10, 40) }))} variant="outline" />
                <PrimaryButton label="Flip H" onPress={() => controls.setAdjustments((value) => ({ ...value, flipHorizontal: !value.flipHorizontal }))} variant="outline" />
                <PrimaryButton label="Flip V" onPress={() => controls.setAdjustments((value) => ({ ...value, flipVertical: !value.flipVertical }))} variant="outline" />
                <PrimaryButton label="Invert" onPress={() => controls.setAdjustments((value) => ({ ...value, invert: !value.invert }))} variant="outline" />
                <PrimaryButton label="Grayscale" onPress={() => controls.setAdjustments((value) => ({ ...value, grayscale: !value.grayscale }))} variant="outline" />
                <PrimaryButton label="Sharpen" onPress={() => controls.setAdjustments((value) => ({ ...value, sharpen: !value.sharpen }))} variant="outline" />
                <PrimaryButton label="Reset Image" onPress={controls.resetAdjustments} variant="outline" />
              </View>
            </Card>
            {aiOverlay ? (
              <Card style={styles.section}>
                <SectionHeader title="AI Overlay" />
                <View style={styles.row}>
                  <PrimaryButton label={overlaySettings?.showAnnotations ? "Annotations On" : "Annotations Off"} onPress={() => aiOverlay.setSettings({ showAnnotations: !overlaySettings?.showAnnotations })} variant="outline" />
                  <PrimaryButton label={overlaySettings?.showLabels ? "Labels On" : "Labels Off"} onPress={() => aiOverlay.setSettings({ showLabels: !overlaySettings?.showLabels })} variant="outline" />
                  <PrimaryButton label={overlaySettings?.showConfidence ? "Confidence On" : "Confidence Off"} onPress={() => aiOverlay.setSettings({ showConfidence: !overlaySettings?.showConfidence })} variant="outline" />
                  <PrimaryButton label={`Theme ${overlaySettings?.theme ?? "clinical"}`} onPress={() => aiOverlay.setSettings({ theme: overlaySettings?.theme === "clinical" ? "dark" : overlaySettings?.theme === "dark" ? "light" : "clinical" })} variant="outline" />
                  <PrimaryButton label="Reset Overlay" onPress={() => aiOverlay.resetOverlay()} variant="outline" />
                </View>
              </Card>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { alignItems: "center", backgroundColor: "rgba(15,23,42,0.45)", flex: 1, justifyContent: "center", padding: 16 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  scroll: { gap: 12, paddingBottom: 16 },
  section: { gap: 8 },
  sheet: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 16, borderWidth: 1, gap: 12, maxHeight: "85%", maxWidth: 720, padding: 16, width: "100%" },
});
