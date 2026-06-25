import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { Badge, EmptyState, medicalTheme, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { API_URL } from "@/services/api";
import type { AIAnalysisResult, AIExplainability } from "@/services/ai";
import type { ApiECGCase } from "@/services/clinical";
import type { DigitalEcg, DigitalEcgLead } from "@/services/ecgProcessing";

type GridColor = "gray" | "red";
type PaperSpeed = 25 | 50;
type ViewerMode = "comparison" | "digitized" | "monitor" | "original";

const leads = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];
const criticalTerms = ["STEMI", "VF", "VT", "HIGH-GRADE AV BLOCK", "LONG QT"];

export function EcgProViewer({
  analysis,
  digitalEcg,
  ecgCase,
  explainability,
}: {
  analysis?: AIAnalysisResult | null;
  digitalEcg?: DigitalEcg | null;
  ecgCase: ApiECGCase;
  explainability?: AIExplainability | null;
}) {
  const [mode, setMode] = useState<ViewerMode>("original");
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [gridVisible, setGridVisible] = useState(true);
  const [gridColor, setGridColor] = useState<GridColor>("red");
  const [paperSpeed, setPaperSpeed] = useState<PaperSpeed>(25);
  const [focusedLead, setFocusedLead] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [calipers, setCalipers] = useState({ pr: 160, qrs: 92, qt: 390, qtc: ecgCase.qtcInterval ?? 420, rr: 820 });

  const originalUrl = absoluteUrl(ecgCase.imagePath ?? ecgCase.originalFileUrl ?? ecgCase.files.find((file) => file.mimeType.startsWith("image/"))?.downloadUrl);
  const pdfUrl = absoluteUrl(ecgCase.pdfPath ?? ecgCase.files.find((file) => file.mimeType.includes("pdf"))?.downloadUrl);
  const leadData = useMemo(() => normalizedLeads(digitalEcg), [digitalEcg]);
  const criticalAlert = criticalTerms.find((term) => `${analysis?.diagnosis ?? ""} ${ecgCase.aiDiagnosis ?? ""} ${ecgCase.doctorDiagnosis ?? ""}`.toUpperCase().includes(term));
  const aiFindings = explainability?.leadHighlights ?? [];

  return (
    <View style={[styles.workstation, fullscreen && styles.fullscreen]}>
      {criticalAlert ? (
        <View style={styles.criticalBanner}>
          <Feather name="alert-triangle" size={18} color="#fff" />
          <Text style={styles.criticalText}>CRITICAL ECG ALERT: {criticalAlert} suspected. Immediate clinical review required.</Text>
        </View>
      ) : null}

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>ECG Pro Review Workstation</Text>
          <Text style={styles.subtitle}>Original ECG, paper grid, 12-lead waveform, calipers, AI overlays, comparison, and monitor mode.</Text>
        </View>
        <View style={styles.modeTabs}>
          {(["original", "digitized", "comparison", "monitor"] as const).map((item) => (
            <PrimaryButton key={item} label={item} onPress={() => setMode(item)} variant={mode === item ? "primary" : "outline"} />
          ))}
        </View>
      </View>

      <View style={styles.toolbar}>
        <PrimaryButton label="Zoom In" onPress={() => setZoom((value) => Math.min(value + 0.2, 3))} variant="outline" />
        <PrimaryButton label="Zoom Out" onPress={() => setZoom((value) => Math.max(value - 0.2, 0.5))} variant="outline" />
        <PrimaryButton label="Fit" onPress={() => setZoom(1)} variant="outline" />
        <PrimaryButton label="Rotate" onPress={() => setRotation((value) => (value + 90) % 360)} variant="outline" />
        <PrimaryButton label={fullscreen ? "Exit Full Screen" : "Full Screen"} onPress={() => setFullscreen((value) => !value)} variant="outline" />
        <PrimaryButton label="Download Original" onPress={() => openUrl(originalUrl ?? pdfUrl)} variant="outline" />
        <PrimaryButton label="Print Original" onPress={() => printUrl(originalUrl ?? pdfUrl)} variant="outline" />
        <PrimaryButton label={gridVisible ? "Grid On" : "Grid Off"} onPress={() => setGridVisible((value) => !value)} variant={gridVisible ? "primary" : "outline"} />
        <PrimaryButton label={`${paperSpeed} mm/sec`} onPress={() => setPaperSpeed((value) => value === 25 ? 50 : 25)} variant="outline" />
        <PrimaryButton label={gridColor === "red" ? "Clinical Red" : "Gray Grid"} onPress={() => setGridColor((value) => value === "red" ? "gray" : "red")} variant="outline" />
      </View>

      {mode === "original" ? (
        <View style={styles.viewerPanel}>
          <SectionHeader title="Original ECG Viewer" subtitle="Uploaded ECG displayed with zoom, fit, rotate, full screen, download, and print controls." />
          <View style={styles.originalCanvas}>
            {gridVisible ? <GridOverlay color={gridColor} speed={paperSpeed} /> : null}
            {originalUrl ? (
              <Image resizeMode="contain" source={{ uri: originalUrl }} style={[styles.originalImage, { transform: [{ scale: zoom }, { rotate: `${rotation}deg` }] }]} />
            ) : pdfUrl ? (
              <PrimaryButton label="Open Original PDF" onPress={() => openUrl(pdfUrl)} />
            ) : (
              <EmptyState title="No original ECG" message="Upload an ECG image or PDF to enable original review." />
            )}
            <AiOverlay analysis={analysis} findings={aiFindings} />
          </View>
        </View>
      ) : null}

      {mode === "digitized" ? (
        <View style={styles.viewerPanel}>
          <SectionHeader title="Digitized 12-Lead ECG" subtitle="Smooth waveform rendering with lead labels, time axis, voltage axis, lead focus, calipers, and AI overlays." />
          <WaveformGrid leadData={leadData} focusedLead={focusedLead} onFocusLead={setFocusedLead} />
          <CaliperPanel calipers={calipers} onChange={setCalipers} />
          {focusedLead ? <LeadFocus lead={focusedLead} leadData={leadData.find((item) => item.lead === focusedLead)} onClose={() => setFocusedLead(null)} /> : null}
        </View>
      ) : null}

      {mode === "comparison" ? (
        <View style={styles.viewerPanel}>
          <SectionHeader title="ECG Comparison Mode" subtitle="Current ECG versus previous ECG side-by-side with clinical change highlights." />
          <View style={styles.comparisonGrid}>
            <ComparisonPane title="Current ECG" url={originalUrl} />
            <ComparisonPane title="Previous ECG" url={undefined} />
          </View>
          <View style={styles.changePanel}>
            <Badge label="Change Review" tone="warning" />
            <Text style={styles.body}>Previous ECG attachment is not available for this case. When a prior case exists, this workspace highlights rhythm, interval, ST-T, and diagnosis changes.</Text>
          </View>
        </View>
      ) : null}

      {mode === "monitor" ? (
        <View style={styles.monitor}>
          <View style={styles.monitorHeader}>
            <Text style={styles.monitorTitle}>MONITOR MODE</Text>
            <Text style={styles.monitorMetric}>HR {ecgCase.heartRate ?? analysis?.heartRate ?? "--"} BPM</Text>
            <Text style={styles.monitorMetric}>{ecgCase.rhythm ?? analysis?.rhythm ?? "Rhythm pending"}</Text>
          </View>
          <MonitorWaveform leadData={leadData.find((item) => item.lead === "II") ?? leadData[0]} />
        </View>
      ) : null}
    </View>
  );
}

function normalizedLeads(digitalEcg?: DigitalEcg | null): DigitalEcgLead[] {
  if (digitalEcg?.leads?.length) return leads.map((lead) => digitalEcg.leads.find((item) => item.lead === lead)).filter(Boolean) as DigitalEcgLead[];
  return [];
}

function GridOverlay({ color, speed }: { color: GridColor; speed: PaperSpeed }) {
  const stroke = color === "red" ? "#F3A6A6" : "#475569";
  const major = color === "red" ? "#E36A6A" : "#64748B";
  const spacing = speed === 50 ? 10 : 14;
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: 80 }).map((_, index) => <Line key={`v-${index}`} x1={index * spacing} x2={index * spacing} y1="0" y2="100%" stroke={index % 5 === 0 ? major : stroke} strokeWidth={index % 5 === 0 ? 0.9 : 0.35} />)}
      {Array.from({ length: 50 }).map((_, index) => <Line key={`h-${index}`} x1="0" x2="100%" y1={index * spacing} y2={index * spacing} stroke={index % 5 === 0 ? major : stroke} strokeWidth={index % 5 === 0 ? 0.9 : 0.35} />)}
    </Svg>
  );
}

function WaveformGrid({ focusedLead, leadData, onFocusLead }: { focusedLead: string | null; leadData: DigitalEcgLead[]; onFocusLead: (lead: string) => void }) {
  if (!leadData.length) return <EmptyState title="Digitized waveform unavailable" message="Run ECG digitization to render 12-lead waveforms." />;
  const display = focusedLead ? leadData.filter((lead) => lead.lead === focusedLead) : leadData;
  const leadHeight = focusedLead ? 170 : 64;
  const width = 980;
  return (
    <ScrollView horizontal style={styles.waveScroll}>
      <Pressable>
        <Svg width={width} height={Math.max(leadHeight * display.length, 200)}>
          <Rect x={0} y={0} width={width} height={Math.max(leadHeight * display.length, 200)} fill="#FFF7F7" />
          {Array.from({ length: 60 }).map((_, index) => <Line key={`wv-${index}`} x1={index * 20} x2={index * 20} y1={0} y2="100%" stroke={index % 5 === 0 ? "#E36A6A" : "#F3A6A6"} strokeWidth={index % 5 === 0 ? 0.9 : 0.35} />)}
          {Array.from({ length: 40 }).map((_, index) => <Line key={`wh-${index}`} x1={0} x2={width} y1={index * 20} y2={index * 20} stroke={index % 5 === 0 ? "#E36A6A" : "#F3A6A6"} strokeWidth={index % 5 === 0 ? 0.9 : 0.35} />)}
          {display.map((lead, index) => {
            const yOffset = index * leadHeight;
            return (
              <React.Fragment key={lead.lead}>
                <SvgText x={12} y={yOffset + 24} fill="#0F172A" fontSize={14} fontWeight="700" onPress={() => onFocusLead(lead.lead)}>{lead.lead}</SvgText>
                <Path d={pathForLead(lead, width - 70, leadHeight - 8)} fill="none" stroke="#C1121F" strokeLinecap="round" strokeWidth={focusedLead ? 2.3 : 1.6} transform={`translate(50 ${yOffset + 4})`} />
                <SvgText x={width - 96} y={yOffset + leadHeight - 10} fill="#334155" fontSize={10}>sec</SvgText>
              </React.Fragment>
            );
          })}
          <Line x1={50} x2={50} y1={0} y2="100%" stroke="#0F172A" strokeWidth={1.2} />
          <SvgText x={55} y={14} fill="#0F172A" fontSize={10}>mV</SvgText>
        </Svg>
      </Pressable>
    </ScrollView>
  );
}

function pathForLead(lead: DigitalEcgLead, width: number, height: number) {
  const samples = lead.samples.slice(0, Math.min(lead.samples.length, 1400));
  if (samples.length < 2) return "";
  const step = Math.max(1, Math.ceil(samples.length / 480));
  const reduced = samples.filter((_sample, index) => index % step === 0);
  return reduced.map((sample, index) => {
    const x = (index / Math.max(reduced.length - 1, 1)) * width;
    const y = height / 2 - sample * (height * 0.28);
    return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
}

function CaliperPanel({ calipers, onChange }: { calipers: Record<"pr" | "qrs" | "qt" | "qtc" | "rr", number>; onChange: (value: Record<"pr" | "qrs" | "qt" | "qtc" | "rr", number>) => void }) {
  return (
    <View style={styles.calipers}>
      {(Object.keys(calipers) as Array<keyof typeof calipers>).map((key) => (
        <View key={key} style={styles.caliper}>
          <Text style={styles.caliperLabel}>{key.toUpperCase()}</Text>
          <Text style={styles.caliperValue}>{calipers[key]} ms</Text>
          <View style={styles.caliperActions}>
            <Pressable onPress={() => onChange({ ...calipers, [key]: Math.max(0, calipers[key] - 5) })}><Text style={styles.caliperButton}>-</Text></Pressable>
            <Pressable onPress={() => onChange({ ...calipers, [key]: calipers[key] + 5 })}><Text style={styles.caliperButton}>+</Text></Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

function AiOverlay({ analysis, findings }: { analysis?: AIAnalysisResult | null; findings: AIExplainability["leadHighlights"] }) {
  if (!analysis && !findings.length) return null;
  return (
    <View style={styles.aiOverlay}>
      <Badge label={`AI ${Math.round(((analysis?.confidenceScore ?? 0) <= 1 ? (analysis?.confidenceScore ?? 0) * 100 : analysis?.confidenceScore ?? 0))}%`} tone="primary" />
      <Text style={styles.aiTitle}>{analysis?.diagnosis ?? "AI findings"}</Text>
      <Text style={styles.aiText}>{analysis?.interpretation ?? findings[0]?.reason ?? "Clinical explanation pending."}</Text>
    </View>
  );
}

function LeadFocus({ lead, leadData, onClose }: { lead: string; leadData?: DigitalEcgLead; onClose: () => void }) {
  return (
    <View style={styles.focusPanel}>
      <SectionHeader title={`Lead ${lead} Focus`} action={<PrimaryButton label="Close" onPress={onClose} variant="outline" />} />
      {leadData ? <WaveformGrid focusedLead={lead} leadData={[leadData]} onFocusLead={() => null} /> : <Text style={styles.body}>Lead data unavailable.</Text>}
    </View>
  );
}

function ComparisonPane({ title, url }: { title: string; url?: string }) {
  return (
    <View style={styles.comparisonPane}>
      <Text style={styles.comparisonTitle}>{title}</Text>
      {url ? <Image resizeMode="contain" source={{ uri: url }} style={styles.comparisonImage} /> : <EmptyState title="No previous ECG" message="Prior ECG comparison will appear when available for this patient." />}
    </View>
  );
}

function MonitorWaveform({ leadData }: { leadData?: DigitalEcgLead }) {
  if (!leadData) return <Text style={styles.monitorText}>Live waveform unavailable. Digitize ECG to preview monitor trace.</Text>;
  return (
    <Svg width="100%" height={260} viewBox="0 0 900 260">
      <Rect x={0} y={0} width={900} height={260} fill="#020617" />
      <Path d={pathForLead(leadData, 850, 220)} fill="none" stroke="#22C55E" strokeLinecap="round" strokeWidth={2.4} transform="translate(25 20)" />
      <Circle cx={850} cy={38} r={5} fill="#22C55E" />
    </Svg>
  );
}

function absoluteUrl(path?: string) {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `${API_URL.replace(/\/api$/, "")}${path}`;
}

function openUrl(url?: string) {
  if (!url || Platform.OS !== "web" || typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function printUrl(url?: string) {
  if (!url || Platform.OS !== "web" || typeof window === "undefined") return;
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  opened?.addEventListener("load", () => opened.print(), { once: true });
}

const styles = StyleSheet.create({
  aiOverlay: { backgroundColor: "rgba(8,22,37,0.92)", borderColor: medicalTheme.primary, borderRadius: 14, borderWidth: 1, bottom: 16, gap: 6, left: 16, maxWidth: 420, padding: 12, position: "absolute" },
  aiText: { color: medicalTheme.text, fontSize: 12, lineHeight: 18 },
  aiTitle: { color: medicalTheme.text, fontSize: 14, fontWeight: "900" },
  body: { color: medicalTheme.text, fontSize: 13, lineHeight: 20 },
  caliper: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 14, borderWidth: 1, gap: 5, padding: 10, width: 112 },
  caliperActions: { flexDirection: "row", gap: 10 },
  caliperButton: { color: medicalTheme.primary, fontSize: 18, fontWeight: "900" },
  caliperLabel: { color: medicalTheme.muted, fontSize: 11, fontWeight: "900" },
  caliperValue: { color: medicalTheme.text, fontSize: 14, fontWeight: "900" },
  calipers: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  changePanel: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 14, borderWidth: 1, gap: 8, padding: 12 },
  comparisonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  comparisonImage: { height: 320, width: "100%" },
  comparisonPane: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 16, borderWidth: 1, flex: 1, minWidth: 280, padding: 12 },
  comparisonTitle: { color: medicalTheme.text, fontSize: 15, fontWeight: "900", marginBottom: 10 },
  criticalBanner: { alignItems: "center", backgroundColor: medicalTheme.critical, borderRadius: 14, flexDirection: "row", gap: 10, padding: 12 },
  criticalText: { color: "#fff", flex: 1, fontSize: 13, fontWeight: "900" },
  focusPanel: { backgroundColor: medicalTheme.cardAlt, borderColor: medicalTheme.primary, borderRadius: 16, borderWidth: 1, gap: 10, padding: 12 },
  fullscreen: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0, zIndex: 99 },
  header: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" },
  modeTabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  monitor: { backgroundColor: "#020617", borderColor: "#14532D", borderRadius: 18, borderWidth: 1, gap: 10, padding: 14 },
  monitorHeader: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 16 },
  monitorMetric: { color: "#22C55E", fontSize: 18, fontWeight: "900" },
  monitorText: { color: "#22C55E", fontSize: 14, fontWeight: "800" },
  monitorTitle: { color: "#DCFCE7", fontSize: 13, fontWeight: "900", letterSpacing: 1.2 },
  originalCanvas: { alignItems: "center", backgroundColor: "#FFF7F7", borderColor: medicalTheme.border, borderRadius: 16, borderWidth: 1, justifyContent: "center", minHeight: 520, overflow: "hidden", position: "relative" },
  originalImage: { height: 500, width: "100%" },
  subtitle: { color: medicalTheme.muted, fontSize: 13, lineHeight: 19 },
  title: { color: medicalTheme.text, fontSize: 22, fontWeight: "900" },
  toolbar: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  viewerPanel: { gap: 12 },
  waveScroll: { borderRadius: 16, maxHeight: 720 },
  workstation: { backgroundColor: medicalTheme.card, borderColor: medicalTheme.border, borderRadius: 22, borderWidth: 1, gap: 14, padding: 16 },
});
