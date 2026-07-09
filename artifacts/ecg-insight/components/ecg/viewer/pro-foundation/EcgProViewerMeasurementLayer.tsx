import React from "react";
import { StyleSheet, View } from "react-native";

import { EcgMeasurementFloatingToolbar } from "../EcgMeasurementFloatingToolbar";
import { EcgMeasurementOverlay } from "../EcgMeasurementOverlay";
import type { EcgMeasurementWorkspace } from "../useEcgMeasurementWorkspace";
import type { EcgViewerControls } from "../useEcgViewerControls";

type Props = {
  children: React.ReactNode;
  controls: EcgViewerControls;
  imageHeight: number;
  imageWidth: number;
  workspace: EcgMeasurementWorkspace;
};

export function EcgProViewerMeasurementLayer({ children, controls, imageHeight, imageWidth, workspace }: Props) {
  const viewport = controls.viewport;
  const showToolbar =
    workspace.present.toolMode === "caliper" ||
    workspace.present.toolMode === "measurement" ||
    workspace.present.toolMode === "annotation";

  return (
    <View style={styles.root} testID="sprint96-ecg-pro-viewer-measurement-layer">
      {children}
      {imageWidth > 0 && imageHeight > 0 ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <EcgMeasurementOverlay
            containerHeight={viewport.containerHeight}
            containerWidth={viewport.containerWidth}
            controls={controls}
            imageHeight={imageHeight}
            imageWidth={imageWidth}
            workspace={workspace}
          />
          {showToolbar ? <EcgMeasurementFloatingToolbar workspace={workspace} /> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, position: "relative" },
});
