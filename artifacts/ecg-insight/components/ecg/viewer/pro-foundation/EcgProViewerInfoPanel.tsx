import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import type { EcgViewerBundleDto } from "@/services/ecgViewerApi";

import { resolveGridSpacing } from "../ecgCalibrationMath";
import type { EcgViewerControls } from "../useEcgViewerControls";
import type { EcgProViewerSession, EcgProViewerTheme } from "./types";
import { ECG_PRO_VIEWER_THEMES } from "./types";

type Props = {
  bundle?: EcgViewerBundleDto | null;
  controls: EcgViewerControls;
  session: EcgProViewerSession | null;
  theme: EcgProViewerTheme;
};

function InfoRow({ label, palette, value }: { label: string; palette: (typeof ECG_PRO_VIEWER_THEMES)["dark"]; value?: string | number | null }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: palette.muted }]}>{label}</Text>
      <Text style={[styles.value, { color: palette.text }]}>{value ?? "—"}</Text>
    </View>
  );
}

export function EcgProViewerInfoPanel({ bundle, controls, session, theme }: Props) {
  const palette = ECG_PRO_VIEWER_THEMES[theme];
  const spacing = resolveGridSpacing(controls.grid);
  const resolution = session?.imageWidth && session?.imageHeight ? `${session.imageWidth} × ${session.imageHeight}` : undefined;
  const metadata = bundle?.metadata;
  const quality = metadata?.quality;

  return (
    <View style={[styles.root, { backgroundColor: palette.panel, borderLeftColor: palette.border }]} testID="sprint101-ecg-pro-viewer-info">
      <Text style={[styles.title, { color: palette.muted }]}>STUDY INFO</Text>
      <ScrollView contentContainerStyle={styles.body}>
        <InfoRow label="Patient" palette={palette} value={session?.patientName} />
        <InfoRow label="Case" palette={palette} value={session?.caseNumber ?? session?.caseId} />
        <InfoRow label="Study date" palette={palette} value={session?.studyDate} />
        <InfoRow label="Upload file" palette={palette} value={session?.originalName} />
        <InfoRow label="Resolution" palette={palette} value={resolution} />
        <InfoRow label="File size" palette={palette} value={session?.sizeBytes ? `${Math.round(session.sizeBytes / 1024)} KB` : undefined} />
        <InfoRow label="MIME type" palette={palette} value={session?.mimeType} />
        <InfoRow label="Checksum" palette={palette} value={session?.checksum ?? undefined} />
        <InfoRow label="Device" palette={palette} value={metadata?.deviceModel ?? metadata?.manufacturer ?? undefined} />
        <InfoRow label="Sampling rate" palette={palette} value={metadata?.samplingRate ? `${metadata.samplingRate} Hz` : undefined} />
        <InfoRow label="Leads" palette={palette} value={metadata?.numberOfLeads ?? undefined} />
        <InfoRow label="Duration" palette={palette} value={metadata?.durationSeconds ? `${metadata.durationSeconds}s` : undefined} />
        <InfoRow label="Quality score" palette={palette} value={quality?.score != null ? `${Math.round(quality.score * 100)}%` : undefined} />
        <InfoRow label="Paper speed" palette={palette} value={`${controls.grid.speed} mm/s`} />
        <InfoRow label="Gain" palette={palette} value={`${controls.grid.gain} mm/mV`} />
        <InfoRow label="Grid spacing" palette={palette} value={`${spacing.toFixed(1)} px`} />
        <InfoRow label="Image width" palette={palette} value={session?.imageWidth} />
        <InfoRow label="Image height" palette={palette} value={session?.imageHeight} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10, padding: 12 },
  label: { fontSize: 11, fontWeight: "700" },
  root: { borderLeftWidth: 1, width: 260 },
  row: { gap: 2 },
  title: { fontSize: 11, fontWeight: "800", letterSpacing: 1, paddingHorizontal: 12, paddingTop: 12 },
  value: { fontSize: 13, fontWeight: "600" },
});
