import React, { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Line } from "react-native-svg";

import { gridSpacingPx } from "./ecgCalibrationMath";
import type { EcgViewerGridSettings } from "./types";

type Props = {
  colors?: { major: string; minor: string };
  grid: EcgViewerGridSettings & { colors?: { major: string; minor: string } };
  height: number;
  width: number;
  zoom?: number;
};

export const EcgPaperGrid = memo(function EcgPaperGrid({ grid, height, width, zoom = 1 }: Props) {
  const spacing = useMemo(() => gridSpacingPx(grid.speed, grid.gain) * zoom, [grid.gain, grid.speed, zoom]);

  if (!grid.visible || width <= 0 || height <= 0) return null;

  const minor = grid.colors?.minor ?? "#F3A6A6";
  const major = grid.colors?.major ?? "#E36A6A";
  const verticalCount = Math.ceil(width / spacing) + 2;
  const horizontalCount = Math.ceil(height / spacing) + 2;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: grid.opacity }]}>
      <Svg height={height} width={width}>
        {Array.from({ length: verticalCount }).map((_, index) => (
          <Line
            key={`v-${index}`}
            stroke={index % 5 === 0 ? major : minor}
            strokeWidth={index % 5 === 0 ? 0.55 : 0.2}
            x1={index * spacing}
            x2={index * spacing}
            y1={0}
            y2={height}
          />
        ))}
        {Array.from({ length: horizontalCount }).map((_, index) => (
          <Line
            key={`h-${index}`}
            stroke={index % 5 === 0 ? major : minor}
            strokeWidth={index % 5 === 0 ? 0.55 : 0.2}
            x1={0}
            x2={width}
            y1={index * spacing}
            y2={index * spacing}
          />
        ))}
      </Svg>
    </View>
  );
});
