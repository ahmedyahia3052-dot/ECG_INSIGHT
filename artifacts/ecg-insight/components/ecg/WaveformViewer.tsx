import React, { useMemo, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import type { DigitalEcg, DigitalEcgLead, ProcessedWaveform } from "@/services/ecgProcessing";

interface Props {
  digitalEcg?: DigitalEcg | null;
  waveform?: ProcessedWaveform | null;
}

function waveformToDigital(waveform: ProcessedWaveform): DigitalEcg {
  return {
    annotations: [],
    calibration: { confidence: 0.7, gainMmPerMv: 10, gridDetected: true, paperSpeedMmPerSec: 25 },
    durationSeconds: waveform.durationSeconds,
    leads: [
      {
        durationSeconds: waveform.durationSeconds,
        lead: "I",
        samples: waveform.points.map((point) => point.v),
        samplingRate: waveform.sampleRate,
      },
    ],
    measurements: { prIntervalMs: 0, qrsDurationMs: 0, qtIntervalMs: 0, rrIntervalMs: 0 },
    status: "available",
  };
}

function pathForLead(lead: DigitalEcgLead, width: number, height: number, zoom: number, pan: number) {
  const visibleSamples = Math.max(80, Math.floor(lead.samples.length / zoom));
  const start = Math.min(Math.max(0, Math.floor(pan * lead.samplingRate)), Math.max(0, lead.samples.length - visibleSamples));
  const samples = lead.samples.slice(start, start + visibleSamples);
  if (samples.length < 2) return "";
  const step = Math.max(1, Math.ceil(samples.length / 260));
  const reduced = samples.filter((_sample, index) => index % step === 0);
  return reduced
    .map((sample, index) => {
      const x = (index / Math.max(reduced.length - 1, 1)) * width;
      const y = height / 2 - sample * 34;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function WaveformViewer({ digitalEcg, waveform }: Props) {
  const colors = useColors();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(0);
  const [tab, setTab] = useState<"enhanced" | "image" | "waveform">("waveform");
  const [annotationsVisible, setAnnotationsVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  const ecg = useMemo(() => digitalEcg ?? (waveform ? waveformToDigital(waveform) : null), [digitalEcg, waveform]);
  const width = 360;
  const leadHeight = fullscreen ? 78 : 56;
  const leads = ecg?.leads ?? [];
  const displayLeads = leads.length > 0 ? leads.slice(0, 12) : [];
  const totalHeight = Math.max(leadHeight * Math.max(displayLeads.length, 1), 160);

  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Digital ECG Viewer</Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {ecg ? `${ecg.calibration.paperSpeedMmPerSec} mm/s · ${ecg.calibration.gainMmPerMv} mm/mV · ${Math.round(ecg.calibration.confidence * 100)}% grid` : "Unavailable"}
        </Text>
      </View>
      <View style={styles.tabs}>
        {(["image", "enhanced", "waveform"] as const).map((nextTab) => (
          <TouchableOpacity
            key={nextTab}
            style={[styles.tab, { backgroundColor: tab === nextTab ? colors.primary : colors.muted }]}
            onPress={() => setTab(nextTab)}
          >
            <Text style={[styles.tabText, { color: tab === nextTab ? colors.primaryForeground : colors.foreground }]}>
              {nextTab === "image" ? "Image" : nextTab === "enhanced" ? "Enhanced" : "Waveform"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {ecg?.status === "fallback" ? (
        <View style={[styles.fallback, { backgroundColor: colors.muted }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Digital waveform reconstruction unavailable.</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>{ecg.fallbackReason}</Text>
        </View>
      ) : tab === "image" || tab === "enhanced" ? (
        <View style={[styles.imagePanel, { backgroundColor: colors.muted }]}>
          {ecg?.originalImageUrl || ecg?.enhancedImageUrl ? (
            <Image source={{ uri: tab === "enhanced" ? ecg.enhancedImageUrl ?? ecg.originalImageUrl : ecg.originalImageUrl ?? ecg.enhancedImageUrl }} style={styles.ecgImage} resizeMode="contain" />
          ) : (
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>Original ECG image unavailable.</Text>
          )}
        </View>
      ) : (
        <Svg width="100%" height={totalHeight} viewBox={`0 0 ${width} ${totalHeight}`}>
          <Rect x={0} y={0} width={width} height={totalHeight} fill="#fff7f7" />
          {Array.from({ length: 25 }).map((_, index) => (
            <Line key={`v-${index}`} x1={(index * width) / 24} x2={(index * width) / 24} y1={0} y2={totalHeight} stroke="#fecaca" strokeWidth={index % 5 === 0 ? 0.9 : 0.35} />
          ))}
          {Array.from({ length: Math.ceil(totalHeight / 12) }).map((_, index) => (
            <Line key={`h-${index}`} x1={0} x2={width} y1={index * 12} y2={index * 12} stroke="#fecaca" strokeWidth={index % 5 === 0 ? 0.9 : 0.35} />
          ))}
          {displayLeads.map((lead, index) => {
            const yOffset = index * leadHeight;
            const pathData = pathForLead(lead, width - 44, leadHeight, zoom, pan);
            const leadAnnotations = annotationsVisible ? ecg?.annotations.filter((annotation) => annotation.lead === lead.lead).slice(0, 8) ?? [] : [];
            return (
              <React.Fragment key={lead.lead}>
                <SvgText x={4} y={yOffset + 20} fill="#334155" fontSize={11} fontWeight="700">{lead.lead}</SvgText>
                <Path d={pathData} fill="none" stroke="#dc2626" strokeLinecap="round" strokeWidth={1.8} transform={`translate(34 ${yOffset})`} />
                {leadAnnotations.map((annotation) => {
                  const x = 34 + (annotation.peakMs / Math.max(lead.durationSeconds * 1000, 1)) * (width - 44);
                  return (
                    <React.Fragment key={`${lead.lead}-${annotation.type}-${annotation.peakMs}`}>
                      <Circle cx={x} cy={yOffset + leadHeight / 2 - 26} r={3} fill="#2563eb" />
                      <SvgText x={x + 4} y={yOffset + 12} fill="#2563eb" fontSize={8}>{annotation.label}</SvgText>
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
        </Svg>
      )}
      <View style={styles.controls}>
        <TouchableOpacity style={[styles.btn, { borderColor: colors.border }]} onPress={() => setZoom((value) => Math.min(value + 0.5, 4))}>
          <Text style={[styles.btnText, { color: colors.primary }]}>Zoom +</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { borderColor: colors.border }]} onPress={() => setZoom((value) => Math.max(value - 0.5, 1))}>
          <Text style={[styles.btnText, { color: colors.primary }]}>Zoom -</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { borderColor: colors.border }]} onPress={() => setPan((value) => Math.max(value - 0.5, 0))}>
          <Text style={[styles.btnText, { color: colors.primary }]}>Pan Left</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { borderColor: colors.border }]} onPress={() => setPan((value) => Math.min(value + 0.5, Math.max((ecg?.durationSeconds ?? 1) - (ecg?.durationSeconds ?? 1) / zoom, 0)))}>
          <Text style={[styles.btnText, { color: colors.primary }]}>Pan Right</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { borderColor: colors.border }]} onPress={() => { setPan(0); setZoom(1); }}>
          <Text style={[styles.btnText, { color: colors.primary }]}>Reset View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { borderColor: colors.border }]} onPress={() => setFullscreen((value) => !value)}>
          <Text style={[styles.btnText, { color: colors.primary }]}>Fullscreen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { borderColor: colors.border }]} onPress={() => setAnnotationsVisible((value) => !value)}>
          <Text style={[styles.btnText, { color: colors.primary }]}>Annotations {annotationsVisible ? "On" : "Off"}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.measurements}>
        {[
          ["PR", ecg?.measurements.prIntervalMs],
          ["QRS", ecg?.measurements.qrsDurationMs],
          ["QT", ecg?.measurements.qtIntervalMs],
          ["RR", ecg?.measurements.rrIntervalMs],
        ].map(([label, value]) => (
          <View key={String(label)} style={[styles.measureChip, { backgroundColor: colors.muted }]}>
            <Text style={[styles.measureText, { color: colors.foreground }]}>{label}: {value ? `${value} ms` : "—"}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  btnText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  card: { borderRadius: 16, borderWidth: 1, gap: 10, overflow: "hidden", padding: 12 },
  controls: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ecgImage: { height: 220, width: "100%" },
  fallback: { borderRadius: 12, gap: 6, padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  imagePanel: { alignItems: "center", borderRadius: 12, justifyContent: "center", minHeight: 220, overflow: "hidden" },
  measureChip: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  measureText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  measurements: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  meta: { fontFamily: "Inter_400Regular", fontSize: 11 },
  tab: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  tabText: { fontFamily: "Inter_700Bold", fontSize: 12, textTransform: "capitalize" },
  tabs: { flexDirection: "row", gap: 8 },
  title: { fontFamily: "Inter_700Bold", fontSize: 14 },
});
