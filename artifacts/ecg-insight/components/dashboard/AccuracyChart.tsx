import React, { useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import { ACCURACY_TREND } from "@/data/mockData";
import { useColors } from "@/hooks/useColors";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

const PAD = { top: 16, right: 16, bottom: 32, left: 36 };
const MIN_VAL = 80;
const MAX_VAL = 100;

function buildPath(
  pts: { x: number; y: number }[],
  close?: { width: number; height: number }
): string {
  if (pts.length === 0) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const cpx = (prev.x + cur.x) / 2;
    d += ` C ${cpx} ${prev.y}, ${cpx} ${cur.y}, ${cur.x} ${cur.y}`;
  }
  if (close) {
    d += ` L ${pts[pts.length - 1].x} ${close.height} L ${pts[0].x} ${close.height} Z`;
  }
  return d;
}

export default function AccuracyChart() {
  const colors = useColors();
  const [chartW, setChartW] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => setChartW(e.nativeEvent.layout.width);

  const innerW = chartW - PAD.left - PAD.right;
  const innerH = 100;
  const totalH = innerH + PAD.top + PAD.bottom;

  const points =
    chartW > 0
      ? ACCURACY_TREND.map((d, i) => ({
          x: PAD.left + (i / (ACCURACY_TREND.length - 1)) * innerW,
          y: PAD.top + (1 - (d.accuracy - MIN_VAL) / (MAX_VAL - MIN_VAL)) * innerH,
          accuracy: d.accuracy,
          week: d.week,
        }))
      : [];

  const linePath = buildPath(points);
  const areaPath = buildPath(points, { width: innerW, height: PAD.top + innerH });

  const yTicks = [80, 85, 90, 95, 100];

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: colors.radius.lg,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    title: { fontSize: 15, fontWeight: "700", color: colors.text },
    badge: {
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
    },
    badgeText: { fontSize: 12, color: colors.primary, fontWeight: "600" },
    sub: { fontSize: 12, color: colors.textSecondary, marginBottom: 12 },
  });

  const current = ACCURACY_TREND[ACCURACY_TREND.length - 1].accuracy;
  const prev = ACCURACY_TREND[ACCURACY_TREND.length - 2].accuracy;
  const delta = current - prev;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>Accuracy Trend</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}% vs last week
          </Text>
        </View>
      </View>
      <Text style={styles.sub}>8-week AI analysis accuracy (%)</Text>

      <View onLayout={onLayout}>
        {chartW > 0 ? (
          <Svg width={chartW} height={totalH}>
            <Defs>
              <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.primary} stopOpacity="0.25" />
                <Stop offset="1" stopColor={colors.primary} stopOpacity="0.02" />
              </LinearGradient>
            </Defs>

            {yTicks.map((tick) => {
              const y =
                PAD.top + (1 - (tick - MIN_VAL) / (MAX_VAL - MIN_VAL)) * innerH;
              return (
                <React.Fragment key={tick}>
                  <Line
                    x1={PAD.left}
                    y1={y}
                    x2={chartW - PAD.right}
                    y2={y}
                    stroke={colors.border}
                    strokeWidth={1}
                    strokeDasharray={tick === 100 ? undefined : "3,4"}
                  />
                  <SvgText
                    x={PAD.left - 6}
                    y={y + 4}
                    textAnchor="end"
                    fontSize={10}
                    fill={colors.textSecondary}
                  >
                    {tick}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {areaPath ? (
              <Path d={areaPath} fill="url(#grad)" />
            ) : null}
            {linePath ? (
              <Path
                d={linePath}
                fill="none"
                stroke={colors.primary}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {points.map((pt, i) => (
              <React.Fragment key={i}>
                <Circle cx={pt.x} cy={pt.y} r={5} fill={colors.surface} stroke={colors.primary} strokeWidth={2} />
                <SvgText
                  x={pt.x}
                  y={totalH - 6}
                  textAnchor="middle"
                  fontSize={10}
                  fill={colors.textSecondary}
                >
                  {pt.week}
                </SvgText>
                {i === points.length - 1 && (
                  <>
                    <Rect
                      x={pt.x - 22}
                      y={pt.y - 28}
                      width={44}
                      height={22}
                      rx={6}
                      fill={colors.primary}
                    />
                    <SvgText
                      x={pt.x}
                      y={pt.y - 12}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight="700"
                      fill="#fff"
                    >
                      {pt.accuracy}%
                    </SvgText>
                  </>
                )}
              </React.Fragment>
            ))}
          </Svg>
        ) : (
          <View style={{ height: totalH }} />
        )}
      </View>
    </View>
  );
}

