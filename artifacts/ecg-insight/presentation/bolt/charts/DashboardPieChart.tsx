import React, { memo } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";

import { useDesignTokens } from "@/design-system/hooks/useDesignTokens";
import { Text } from "@/design-system/primitives/Text";
import { Stack } from "@/design-system/primitives/Stack";
import type { DashboardDiagnosisSlice } from "@/types/screens/dashboard";

import { resolveChartColor } from "./chart-colors";

type Props = {
  data: DashboardDiagnosisSlice[];
  height?: number;
};

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export const DashboardPieChart = memo(function DashboardPieChart({ data, height = 128 }: Props) {
  const tokens = useDesignTokens();
  const size = height;
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = 55;
  const innerRadius = 30;
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  let cursor = 0;

  return (
    <Stack gap={8}>
      <View style={{ alignItems: "center", height, justifyContent: "center", width: "100%" }}>
        <Svg height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
          <G>
            {data.map((slice) => {
              const angle = (slice.value / total) * 360;
              const startAngle = cursor;
              const endAngle = cursor + angle;
              cursor = endAngle;
              const outer = describeArc(cx, cy, outerRadius, startAngle, endAngle);
              const inner = describeArc(cx, cy, innerRadius, endAngle, startAngle);
              const color = resolveChartColor(tokens, slice.colorKey);
              return (
                <Path
                  key={slice.name}
                  d={`${outer} L ${polarToCartesian(cx, cy, innerRadius, endAngle).x} ${polarToCartesian(cx, cy, innerRadius, endAngle).y} ${inner} Z`}
                  fill={color}
                />
              );
            })}
          </G>
          <Circle cx={cx} cy={cy} fill={tokens.colors.surface.card} r={innerRadius - 1} />
        </Svg>
      </View>
      <Stack gap={4}>
        {data.map((slice) => (
          <View key={slice.name} style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
            <View style={{ alignItems: "center", flexDirection: "row", gap: tokens.spacing.inset.sm, maxWidth: "72%" }}>
              <View
                style={{
                  backgroundColor: resolveChartColor(tokens, slice.colorKey),
                  borderRadius: tokens.radii.full,
                  height: 8,
                  width: 8,
                }}
              />
              <Text numberOfLines={1} tone="muted" variant="caption">
                {slice.name}
              </Text>
            </View>
            <Text variant="caption">{slice.value}%</Text>
          </View>
        ))}
      </Stack>
    </Stack>
  );
});
