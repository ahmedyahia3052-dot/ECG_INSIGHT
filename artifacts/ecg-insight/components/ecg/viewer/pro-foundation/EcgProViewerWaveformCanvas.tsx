import React from "react";
import { StyleSheet, View } from "react-native";

import { EcgRenderingEngineView } from "../EcgRenderingEngineView";
import type { EcgLeadLayoutMode } from "../types";
import type { EcgViewerControls } from "../useEcgViewerControls";
import type { DigitalEcg } from "@/services/ecgProcessing";

import type { EcgProViewerLayoutPreset, EcgProViewerLeadSelection } from "./types";

type Props = {
  activeLead: EcgProViewerLeadSelection;
  controls: EcgViewerControls;
  digitalEcg: DigitalEcg | null;
  layoutPreset: EcgProViewerLayoutPreset;
  onFpsUpdate?: (fps: number) => void;
};

function toLayoutMode(preset: EcgProViewerLayoutPreset): EcgLeadLayoutMode {
  return preset;
}

export function EcgProViewerWaveformCanvas({ activeLead, controls, digitalEcg, layoutPreset, onFpsUpdate }: Props) {
  return (
    <View style={styles.root} testID="sprint95-ecg-pro-viewer-waveform-canvas">
      <EcgRenderingEngineView
        activeLead={activeLead === "ALL" ? undefined : activeLead}
        controls={controls}
        digitalEcg={digitalEcg}
        layout={toLayoutMode(layoutPreset)}
        onFpsUpdate={onFpsUpdate}
        testID="sprint95-ecg-pro-viewer-rendering-engine"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 360 },
});
