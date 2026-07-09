import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { ApiECGCase } from "@/services/clinical";
import type { EcgViewerBundleDto } from "@/services/ecgViewerApi";

import { annotationTypeLabel, confidencePercent } from "../ecgAiOverlayEngine";
import type { EcgAiClinicalAnnotation } from "../aiOverlayTypes";
import type { EcgAiOverlayWorkspace } from "../useEcgAiOverlayWorkspace";
import { ECG_PRO_VIEWER_THEMES, type EcgProViewerTheme } from "./types";

type Props = {
  aiOverlay?: EcgAiOverlayWorkspace;
  bundle?: EcgViewerBundleDto | null;
  caseRecord?: ApiECGCase | null;
  onClose?: () => void;
  theme: EcgProViewerTheme;
};

function FindingRow({
  confidence,
  label,
  palette,
  subtitle,
}: {
  confidence?: number;
  label: string;
  palette: (typeof ECG_PRO_VIEWER_THEMES)["dark"];
  subtitle?: string;
}) {
  return (
    <View style={[styles.row, { borderColor: palette.border }]}>
      <Text style={[styles.rowLabel, { color: palette.text }]}>{label}</Text>
      {subtitle ? <Text style={[styles.rowSub, { color: palette.muted }]}>{subtitle}</Text> : null}
      {confidence != null ? (
        <Text style={[styles.rowConfidence, { color: confidence >= 70 ? "#22C55E" : "#F97316" }]}>
          {confidence}% confidence
        </Text>
      ) : null}
    </View>
  );
}

function annotationLabel(annotation: EcgAiClinicalAnnotation) {
  return annotationTypeLabel(annotation.type);
}

export function EcgProViewerAiFindingsSidebar({ aiOverlay, bundle, caseRecord, onClose, theme }: Props) {
  const palette = ECG_PRO_VIEWER_THEMES[theme];
  const diagnosis =
    caseRecord?.finalDiagnosis ??
    caseRecord?.doctorDiagnosis ??
    caseRecord?.aiDiagnosis ??
    caseRecord?.diagnosis ??
    null;
  const confidence = confidencePercent(caseRecord?.confidenceScore ?? caseRecord?.confidence);
  const overlayAnnotations = aiOverlay?.present.annotations.filter((item) => item.visible) ?? [];
  const bundleAnnotations = useMemo(() => {
    if (!bundle?.annotations?.length) return [];
    return bundle.annotations
      .map((raw) => {
        const label = String(raw.label ?? raw.type ?? raw.kind ?? "Finding");
        const detail = String(raw.detail ?? raw.text ?? raw.summary ?? "");
        return { detail, label };
      })
      .filter((item) => item.label.length > 0);
  }, [bundle?.annotations]);

  return (
    <View style={[styles.root, { backgroundColor: palette.panel, borderLeftColor: palette.border }]} testID="sprint101-ai-findings-sidebar">
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.muted }]}>AI FINDINGS</Text>
        {onClose ? (
          <Pressable accessibilityRole="button" onPress={onClose}>
            <Text style={[styles.close, { color: palette.text }]}>Close</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {diagnosis ? (
          <FindingRow
            confidence={confidence || undefined}
            label={diagnosis}
            palette={palette}
            subtitle={caseRecord?.interpretation ?? caseRecord?.recommendations ?? undefined}
          />
        ) : (
          <Text style={[styles.empty, { color: palette.muted }]}>No primary diagnosis recorded for this case.</Text>
        )}
        {caseRecord?.severity ? (
          <FindingRow label={`Severity: ${caseRecord.severity}`} palette={palette} subtitle={caseRecord.rhythm ? `Rhythm: ${caseRecord.rhythm}` : undefined} />
        ) : null}
        {overlayAnnotations.length ? (
          <>
            <Text style={[styles.section, { color: palette.muted }]}>Clinical overlay ({overlayAnnotations.length})</Text>
            {overlayAnnotations.map((annotation) => (
              <FindingRow
                key={annotation.id}
                confidence={confidencePercent(annotation.confidence)}
                label={annotationLabel(annotation)}
                palette={palette}
                subtitle={annotation.clinicalMeaning ?? annotation.measurement ?? annotation.lead}
              />
            ))}
          </>
        ) : null}
        {bundleAnnotations.length ? (
          <>
            <Text style={[styles.section, { color: palette.muted }]}>Bundle annotations ({bundleAnnotations.length})</Text>
            {bundleAnnotations.map((item, index) => (
              <FindingRow key={`${item.label}-${index}`} label={item.label} palette={palette} subtitle={item.detail || undefined} />
            ))}
          </>
        ) : null}
        {bundle?.aiJobStatus ? (
          <FindingRow
            label="AI pipeline"
            palette={palette}
            subtitle={`${bundle.aiJobStatus.completed} completed · ${bundle.aiJobStatus.pending} pending`}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 8, padding: 12 },
  close: { fontSize: 12, fontWeight: "700" },
  empty: { fontSize: 12, lineHeight: 18 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingTop: 12 },
  root: { borderLeftWidth: 1, width: 280 },
  row: { borderRadius: 10, borderWidth: 1, gap: 4, padding: 10 },
  rowConfidence: { fontSize: 11, fontWeight: "700" },
  rowLabel: { fontSize: 13, fontWeight: "700" },
  rowSub: { fontSize: 11, lineHeight: 16 },
  section: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6, marginTop: 8, textTransform: "uppercase" },
  title: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
});
