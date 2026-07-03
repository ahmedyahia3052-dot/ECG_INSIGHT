import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";

import { EcgDigitalCalipers } from "@/components/ecg/EcgDigitalCalipers";
import { EcgInterpretationPanel } from "@/components/ecg/EcgInterpretationPanel";
import { EcgMeasurementPanel } from "@/components/ecg/EcgMeasurementPanel";
import { Badge, medicalTheme, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { API_URL } from "@/services/api";
import type { DigitalEcg, EcgMeasurementItem } from "@/services/ecgProcessing";

type WorkspaceView = "comparison" | "original" | "processed";

type Props = {
  digitalEcg?: DigitalEcg | null;
  originalUrl?: string;
  processedUrl?: string;
};

const LEADS = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];

export function EcgWorkspaceViewer({ digitalEcg, originalUrl, processedUrl }: Props) {
  const [view, setView] = useState<WorkspaceView>("comparison");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [focusedLead, setFocusedLead] = useState<string | null>(null);
  const [gridVisible, setGridVisible] = useState(true);
  const [selectedMeasurement, setSelectedMeasurement] = useState<EcgMeasurementItem | null>(null);

  const quality = digitalEcg?.quality;
  const segments = useMemo(() => digitalEcg?.leadSegments ?? [], [digitalEcg]);
  const leadII = useMemo(() => digitalEcg?.leads.find((lead) => lead.lead === "II") ?? digitalEcg?.leads[0], [digitalEcg]);
  const highlight = selectedMeasurement?.highlight ?? null;
  const displayOriginal = absoluteUrl(originalUrl ?? digitalEcg?.originalImageUrl);
  const displayProcessed = absoluteUrl(processedUrl ?? digitalEcg?.enhancedImageUrl);

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setFocusedLead(null);
  }

  return (
    <View style={styles.shell}>
      <SectionHeader
        subtitle="Original image, processed image, detected leads, grid overlay, and quality score."
        title="ECG Workspace"
      />

      <View style={styles.toolbar}>
        {(["original", "processed", "comparison"] as const).map((mode) => (
          <PrimaryButton key={mode} label={mode} onPress={() => setView(mode)} variant={view === mode ? "primary" : "outline"} />
        ))}
        <PrimaryButton label="Zoom +" onPress={() => setZoom((value) => Math.min(value + 0.2, 3))} variant="outline" />
        <PrimaryButton label="Zoom -" onPress={() => setZoom((value) => Math.max(value - 0.2, 0.6))} variant="outline" />
        <PrimaryButton label="Reset View" onPress={resetView} variant="outline" />
        <PrimaryButton label={gridVisible ? "Hide Grid" : "Show Grid"} onPress={() => setGridVisible((value) => !value)} variant="outline" />
      </View>

      {quality ? (
        <View style={styles.qualityCard}>
          <View style={styles.qualityHeader}>
            <Text style={styles.qualityTitle}>Image Quality Score</Text>
            <Badge label={`${quality.score}/100`} tone={quality.score >= 70 ? "success" : quality.score >= 50 ? "warning" : "critical"} />
          </View>
          {quality.warnings.map((warning) => (
            <Text key={warning} style={styles.warningText}>• {warning}</Text>
          ))}
        </View>
      ) : null}

      <View style={styles.workspaceGrid}>
        <View style={styles.viewerColumn}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.leadRail}>
            {LEADS.map((lead) => {
              const segment = segments.find((item) => item.lead === lead);
              const active = focusedLead === lead;
              return (
                <Pressable key={lead} onPress={() => setFocusedLead(active ? null : lead)} style={[styles.leadChip, active && styles.leadChipActive]}>
                  <Text style={styles.leadChipText}>{lead}</Text>
                  {segment ? <Text style={styles.leadConfidence}>{Math.round(segment.confidence * 100)}%</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.canvasRow}>
            {(view === "original" || view === "comparison") && displayOriginal ? (
              <ImagePanel gridVisible={gridVisible} highlight={highlight} label="Original" pan={pan} segments={focusedLead ? segments.filter((item) => item.lead === focusedLead) : segments} uri={displayOriginal} zoom={zoom} />
            ) : null}
            {(view === "processed" || view === "comparison") && displayProcessed ? (
              <ImagePanel gridVisible={gridVisible} highlight={highlight} label="Processed" pan={pan} segments={focusedLead ? segments.filter((item) => item.lead === focusedLead) : segments} uri={displayProcessed} zoom={zoom} />
            ) : null}
          </View>

          <EcgDigitalCalipers calibration={digitalEcg?.calibration} highlight={highlight} lead={leadII ?? null} />
        </View>

        <View style={styles.measurementColumn}>
          <EcgMeasurementPanel
            measurements={digitalEcg?.measurementEngine}
            onSelect={(item) => setSelectedMeasurement((current) => (current?.label === item.label ? null : item))}
            selectedLabel={selectedMeasurement?.label ?? null}
          />
          <EcgInterpretationPanel interpretation={digitalEcg?.interpretationEngine} />
        </View>
      </View>

      {digitalEcg?.calibration ? (
        <Text style={styles.metaText}>
          Grid: {digitalEcg.calibration.gridDetected ? "detected" : "not detected"} · Paper speed {digitalEcg.calibration.paperSpeedMmPerSec} mm/s · Gain {digitalEcg.calibration.gainMmPerMv} mm/mV
        </Text>
      ) : null}
    </View>
  );
}

function ImagePanel({
  gridVisible,
  highlight,
  label,
  pan,
  segments,
  uri,
  zoom,
}: {
  gridVisible: boolean;
  highlight?: { endMs: number; lead: string; startMs: number } | null;
  label: string;
  pan: { x: number; y: number };
  segments: DigitalEcg["leadSegments"];
  uri: string;
  zoom: number;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelLabel}>{label}</Text>
      <View style={styles.imageFrame}>
        <Image resizeMode="contain" source={{ uri }} style={[styles.image, { transform: [{ scale: zoom }, { translateX: pan.x }, { translateY: pan.y }] }]} />
        {gridVisible ? (
          <Svg height="100%" style={StyleSheet.absoluteFill} width="100%">
            {Array.from({ length: 20 }).map((_v, index) => (
              <Rect key={`grid-${index}`} fill="none" height="100%" stroke="rgba(248,113,113,0.25)" strokeWidth={index % 5 === 0 ? 1.2 : 0.5} width={`${(index + 1) * 5}%`} x="0" y="0" />
            ))}
            {highlight ? (
              <Rect fill="rgba(56,189,248,0.18)" height="100%" stroke="#38bdf8" strokeWidth={2} width="18%" x="28%" y="0" />
            ) : null}
            {segments.map((segment) => (
              <Rect
                fill="rgba(56,189,248,0.08)"
                height={`${segment.heightPercent}%`}
                key={segment.lead}
                stroke="#38bdf8"
                strokeWidth={2}
                width={`${segment.widthPercent}%`}
                x={`${segment.xPercent}%`}
                y={`${segment.yPercent}%`}
              />
            ))}
            {segments.map((segment) => (
              <SvgText fill="#38bdf8" fontSize={12} key={`${segment.lead}-label`} x={`${segment.xPercent + 1}%`} y={`${segment.yPercent + 4}%`}>
                {segment.lead}
              </SvgText>
            ))}
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

function absoluteUrl(path?: string) {
  if (!path) return undefined;
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

const styles = StyleSheet.create({
  canvasRow: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  image: { height: "100%", width: "100%" },
  imageFrame: { backgroundColor: "#fff5f5", borderRadius: 16, height: 360, overflow: "hidden", width: "100%" },
  leadChip: {
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.85)",
    borderColor: "rgba(148,163,184,0.25)",
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 54,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  leadChipActive: { borderColor: medicalTheme.primary, backgroundColor: "rgba(56,189,248,0.15)" },
  leadChipText: { color: medicalTheme.text, fontSize: 12, fontWeight: "800" },
  leadConfidence: { color: medicalTheme.muted, fontSize: 10 },
  leadRail: { maxHeight: 52 },
  metaText: { color: medicalTheme.muted, fontSize: 12 },
  panel: { flex: 1, gap: 8, minWidth: 320 },
  panelLabel: { color: medicalTheme.text, fontSize: 13, fontWeight: "800" },
  qualityCard: {
    backgroundColor: "rgba(15,23,42,0.82)",
    borderColor: "rgba(148,163,184,0.22)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  qualityHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  qualityTitle: { color: medicalTheme.text, fontSize: 14, fontWeight: "900" },
  shell: { gap: 14 },
  toolbar: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  viewerColumn: { flex: 1.4, gap: 14, minWidth: 320 },
  warningText: { color: "#fbbf24", fontSize: 12 },
  workspaceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  measurementColumn: { flex: 1, minWidth: 280 },
});
