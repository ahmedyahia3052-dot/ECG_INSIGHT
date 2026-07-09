import React, { memo, useMemo } from "react";
import { View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop, Line, Text as SvgText } from "react-native-svg";

import { useDesignTokens } from "@/design-system/hooks/useDesignTokens";
import type { DashboardChartPoint } from "@/types/screens/dashboard";

import { withAlpha } from "./chart-colors";

type Props = {
  data: DashboardChartPoint[];
  height?: number;
};

function buildLinePath(values: number[], width: number, height: number, maxValue: number, padding: number) {
  const stepX = values.length <= 1 ? 0 : (width - padding * 2) / (values.length - 1);
  const points = values.map((value, index) => {
    const x = padding + stepX * index;
    const y = height - padding - (value / maxValue) * (height - padding * 2);
    return { x, y };
  });
  if (!points.length) return "";
  const [first, ...rest] = points;
  return rest.reduce((path, point) => `${path} L ${point.x} ${point.y}`, `M ${first.x} ${first.y}`);
}

function buildAreaPath(values: number[], width: number, height: number, maxValue: number, padding: number) {
  const line = buildLinePath(values, width, height, maxValue, padding);
  if (!line) return "";
  const stepX = values.length <= 1 ? 0 : (width - padding * 2) / (values.length - 1);
  const lastX = padding + stepX * (values.length - 1);
  return `${line} L ${lastX} ${height - padding} L ${padding} ${height - padding} Z`;
}

export const DashboardAreaChart = memo(function DashboardAreaChart({ data, height = 192 }: Props) {
  const tokens = useDesignTokens();
  const width = Math.max(tokens.viewportWidth - tokens.spacing.inset.xl * 4, 280);
  const padding = 20;
  const maxValue = Math.max(...data.flatMap((item) => [item.cases, item.critical]), 1);
  const casesValues = data.map((item) => item.cases);
  const criticalValues = data.map((item) => item.critical);
  const casesArea = useMemo(() => buildAreaPath(casesValues, width, height, maxValue, padding), [casesValues, height, maxValue, width]);
  const criticalArea = useMemo(() => buildAreaPath(criticalValues, width, height, maxValue, padding), [criticalValues, height, maxValue, width]);
  const casesLine = useMemo(() => buildLinePath(casesValues, width, height, maxValue, padding), [casesValues, height, maxValue, width]);
  const criticalLine = useMemo(() => buildLinePath(criticalValues, width, height, maxValue, padding), [criticalValues, height, maxValue, width]);

  return (
    <View style={{ height, width: "100%" }}>
      <Svg height={height} viewBox={`0 0 ${width} ${height}`} width="100%">
        <Defs>
          <LinearGradient id="casesGrad" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="5%" stopColor={tokens.colors.medical.primary} stopOpacity={0.2} />
            <Stop offset="95%" stopColor={tokens.colors.medical.primary} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="criticalGrad" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="5%" stopColor={tokens.colors.medical.critical} stopOpacity={0.2} />
            <Stop offset="95%" stopColor={tokens.colors.medical.critical} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <Line
            key={ratio}
            stroke={withAlpha(tokens.colors.border.default, 0.65)}
            strokeDasharray="3 3"
            x1={padding}
            x2={width - padding}
            y1={padding + (height - padding * 2) * ratio}
            y2={padding + (height - padding * 2) * ratio}
          />
        ))}
        {data.map((item, index) => {
          const stepX = data.length <= 1 ? 0 : (width - padding * 2) / (data.length - 1);
          const x = padding + stepX * index;
          return (
            <SvgText
              key={item.month}
              fill={tokens.colors.text.secondary}
              fontSize={11}
              textAnchor="middle"
              x={x}
              y={height - 4}
            >
              {item.month}
            </SvgText>
          );
        })}
        <Path d={casesArea} fill="url(#casesGrad)" />
        <Path d={criticalArea} fill="url(#criticalGrad)" />
        <Path d={casesLine} fill="none" stroke={tokens.colors.medical.primary} strokeWidth={2} />
        <Path d={criticalLine} fill="none" stroke={tokens.colors.medical.critical} strokeWidth={2} />
      </Svg>
    </View>
  );
});
