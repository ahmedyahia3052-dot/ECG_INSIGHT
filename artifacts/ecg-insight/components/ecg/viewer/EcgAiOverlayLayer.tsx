import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";

export type EcgAiOverlayRegion = {
  height: number;
  id: string;
  label?: string;
  opacity?: number;
  width: number;
  x: number;
  y: number;
};

export const EcgAiOverlayLayer = memo(function EcgAiOverlayLayer({
  enabled = false,
  height,
  regions = [],
  width,
}: {
  enabled?: boolean;
  height: number;
  regions?: EcgAiOverlayRegion[];
  width: number;
}) {
  if (!enabled || !regions.length || width <= 0 || height <= 0) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="sprint13-ecg-layer-ai">
      <Svg height={height} width={width}>
        {regions.map((region) => (
          <React.Fragment key={region.id}>
            <Rect
              fill={`rgba(56,189,248,${region.opacity ?? 0.18})`}
              height={region.height}
              stroke="#38BDF8"
              strokeWidth={1.5}
              width={region.width}
              x={region.x}
              y={region.y}
            />
            {region.label ? <Circle cx={region.x + 8} cy={region.y + 8} fill="#0EA5E9" r={4} /> : null}
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
});
