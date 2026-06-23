import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import type { ProcessedWaveform } from "@/services/ecgProcessing";

interface Props {
  waveform: ProcessedWaveform;
}

export function WaveformViewer({ waveform }: Props) {
  const colors = useColors();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(0);

  const width = 320;
  const height = 130;
  const pathData = useMemo(() => {
    if (waveform.points.length === 0) return "";
    const visibleDuration = waveform.durationSeconds / zoom;
    const start = pan;
    const end = start + visibleDuration;
    const visible = waveform.points.filter((point) => point.t >= start && point.t <= end);
    const points = visible.length > 1 ? visible : waveform.points.slice(0, Math.min(200, waveform.points.length));
    return points
      .map((point, index) => {
        const x = ((point.t - points[0].t) / Math.max(points[points.length - 1].t - points[0].t, 0.001)) * width;
        const y = height / 2 - point.v * 44;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [pan, waveform.durationSeconds, waveform.points, zoom]);

  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Processed Waveform</Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {waveform.sampleRate} Hz · {waveform.durationSeconds.toFixed(1)}s
        </Text>
      </View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {Array.from({ length: 9 }).map((_, index) => (
          <Line
            key={`v-${index}`}
            x1={(index * width) / 8}
            x2={(index * width) / 8}
            y1={0}
            y2={height}
            stroke={colors.border}
            strokeWidth={0.6}
          />
        ))}
        {Array.from({ length: 7 }).map((_, index) => (
          <Line
            key={`h-${index}`}
            x1={0}
            x2={width}
            y1={(index * height) / 6}
            y2={(index * height) / 6}
            stroke={colors.border}
            strokeWidth={0.6}
          />
        ))}
        <Path d={pathData} fill="none" stroke={colors.primary} strokeLinecap="round" strokeWidth={2} />
      </Svg>
      <View style={styles.controls}>
        <TouchableOpacity style={[styles.btn, { borderColor: colors.border }]} onPress={() => setZoom((value) => Math.min(value + 0.5, 4))}>
          <Text style={[styles.btnText, { color: colors.primary }]}>Zoom +</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { borderColor: colors.border }]} onPress={() => setZoom((value) => Math.max(value - 0.5, 1))}>
          <Text style={[styles.btnText, { color: colors.primary }]}>Zoom -</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { borderColor: colors.border }]} onPress={() => setPan((value) => Math.max(value - 1, 0))}>
          <Text style={[styles.btnText, { color: colors.primary }]}>Pan Left</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { borderColor: colors.border }]} onPress={() => setPan((value) => Math.min(value + 1, waveform.durationSeconds - waveform.durationSeconds / zoom))}>
          <Text style={[styles.btnText, { color: colors.primary }]}>Pan Right</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.leadNote, { color: colors.mutedForeground }]}>
        Lead I preview. Multi-lead architecture can map additional leads into stacked traces.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  btnText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  card: { borderRadius: 16, borderWidth: 1, gap: 10, overflow: "hidden", padding: 12 },
  controls: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  header: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  leadNote: { fontFamily: "Inter_400Regular", fontSize: 11 },
  meta: { fontFamily: "Inter_400Regular", fontSize: 11 },
  title: { fontFamily: "Inter_700Bold", fontSize: 14 },
});
