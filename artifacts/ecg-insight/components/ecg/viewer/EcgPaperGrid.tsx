import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Line } from "react-native-svg";

import type { EcgViewerGridSettings } from "./types";

export function EcgPaperGrid({ grid }: { grid: EcgViewerGridSettings }) {
  const spacing = useMemo(() => {
    const speedFactor = grid.speed === 50 ? 0.72 : 1;
    const gainFactor = grid.gain === 5 ? 1.25 : grid.gain === 20 ? 0.72 : 1;
    return 14 * speedFactor * gainFactor;
  }, [grid.gain, grid.speed]);

  if (!grid.visible) return null;

  const minor = "#F3A6A6";
  const major = "#E36A6A";

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg height="100%" width="100%">
        {Array.from({ length: 120 }).map((_, index) => (
          <Line
            key={`v-${index}`}
            stroke={index % 5 === 0 ? major : minor}
            strokeWidth={index % 5 === 0 ? 0.9 : 0.35}
            x1={index * spacing}
            x2={index * spacing}
            y1="0"
            y2="100%"
          />
        ))}
        {Array.from({ length: 80 }).map((_, index) => (
          <Line
            key={`h-${index}`}
            stroke={index % 5 === 0 ? major : minor}
            strokeWidth={index % 5 === 0 ? 0.9 : 0.35}
            x1="0"
            x2="100%"
            y1={index * spacing}
            y2={index * spacing}
          />
        ))}
      </Svg>
    </View>
  );
}
