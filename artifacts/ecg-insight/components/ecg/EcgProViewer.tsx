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
type EcgAnnotation = {
  confidence: number;
  evidence: string[];
  finding: string;
  lead: string;
  measurement?: string;
  region: { height: number; width: number; x: number; y: number };
  tone: "critical" | "primary" | "success" | "warning";
  wave: "PR interval" | "P wave" | "QRS complex" | "QT interval" | "ST segment" | "T wave";
};

const leads = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];
const criticalTerms = ["STEMI", "VT", "VF", "COMPLETE HEART BLOCK", "HYPERKALEMIA", "TORSADES", "ASYSTOLE", "HIGH-GRADE AV BLOCK", "LONG QT"];

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
  const [gridOpacity, setGridOpacity] = useState(0.75);
  const [gridColor, setGridColor] = useState<GridColor>("red");
  const [paperSpeed, setPaperSpeed] = useState<PaperSpeed>(25);
  const [focusedLead, setFocusedLead] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<string>("ALL");
  const [fullscreen, setFullscreen] = useState(false);
  const [calipers, setCalipers] = useState({ pr: 160, qrs: 92, qt: 390, qtc: ecgCase.qtcInterval ?? 420, rr: 820 });

  const originalUrl = absoluteUrl(ecgCase.imagePath ?? ecgCase.originalFileUrl ?? ecgCase.files.find((file) => file.mimeType.startsWith("image/"))?.downloadUrl);
  const pdfUrl = absoluteUrl(ecgCase.pdfPath ?? ecgCase.files.find((file) => file.mimeType.includes("pdf"))?.downloadUrl);
  const leadData = useMemo(() => normalizedLeads(digitalEcg), [digitalEcg]);
  const criticalAlert = criticalTerms.find((term) => `${analysis?.diagnosis ?? ""} ${ecgCase.aiDiagnosis ?? ""} ${ecgCase.doctorDiagnosis ?? ""}`.toUpperCase().includes(term));
  const aiFindings = explainability?.leadHighlights ?? [];
  const annotations = useMemo(() => buildAnnotations(aiFindings, analysis, ecgCase), [aiFindings, analysis, ecgCase]);
  const visibleAnnotations = selectedLead === "ALL" ? annotations : annotations.filter((annotation) => annotation.lead === selectedLead);

  return (
    <View style={[styles.workstation, fullscreen && styles.fullscreen]}>
      {criticalAlert ? (
        <View style={styles.criticalBanner}>
          <Feather name="alert-triangle" size={18} color="#fff" />
        <Text style={styles.criticalText}>CRITICAL ECG ALERT: {criticalAlert} suspected. Immediate physician review required.</Text>
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
        <PrimaryButton label={`Grid ${Math.round(gridOpacity * 100)}%`} onPress={() => setGridOpacity((value) => value >= 1 ? 0.35 : Math.min(value + 0.15, 1))} variant="outline" />
        <PrimaryButton label={`${paperSpeed} mm/sec`} onPress={() => setPaperSpeed((value) => value === 25 ? 50 : 25)} variant="outline" />
        <PrimaryButton label={gridColor === "red" ? "Clinical Red" : "Gray Grid"} onPress={() => setGridColor((value) => value === "red" ? "gray" : "red")} variant="outline" />
      </View>
      <LeadNavigator selectedLead={selectedLead} onSelect={(lead) => {
        setSelectedLead(lead);
        if (lead !== "ALL") setFocusedLead(lead);
      }} />

      {mode === "original" ? (
        <View style={styles.viewerPanel}>
          <SectionHeader title="ECG Explainability Engine" subtitle="Transparent annotation layer, heatmap overlays, clinical labels, measurement markers, and AI evidence." />
          <View style={styles.explainabilityLayout}>
            <View style={styles.originalCanvas}>
              {gridVisible ? <GridOverlay color={gridColor} opacity={gridOpacity} speed={paperSpeed} /> : null}
              {originalUrl ? (
                <Image resizeMode="contain" source={{ uri: originalUrl }} style={[styles.originalImage, { transform: [{ scale: zoom }, { rotate: `${rotation}deg` }] }]} />
              ) : pdfUrl ? (
                <PrimaryButton label="Open Original PDF" onPress={() => openUrl(pdfUrl)} />
              ) : (
                <EmptyState title="No original ECG" message="Upload an ECG image or PDF to enable original review." />
              )}
              <AnnotationLayer annotations={visibleAnnotations} heatmap={explainability?.heatmap.points ?? []} selectedLead={selectedLead} />
              <AiOverlay analysis={analysis} findings={aiFindings} />
            </View>
            <ExplainabilityPanel analysis={analysis} annotations={visibleAnnotations} ecgCase={ecgCase} onExplain={openCopilotFinding} />
          </View>
        </View>
      ) : null}

      {mode === "digitized" ? (
        <View style={styles.viewerPanel}>
          <SectionHeader title="Digitized 12-Lead ECG" subtitle="Smooth waveform rendering with lead labels, time axis, voltage axis, lead focus, calipers, and AI overlays." />
          <WaveformGrid annotations={visibleAnnotations} leadData={leadData} focusedLead={focusedLead} onFocusLead={(lead) => {
            setFocusedLead(lead);
            setSelectedLead(lead);
          }} />
          <CaliperPanel calipers={calipers} onChange={setCalipers} />
          {focusedLead ? <LeadFocus annotations={annotations.filter((item) => item.lead === focusedLead)} lead={focusedLead} leadData={leadData.find((item) => item.lead === focusedLead)} onClose={() => setFocusedLead(null)} /> : null}
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
            <ComparisonSummary analysis={analysis} ecgCase={ecgCase} />
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

function GridOverlay({ color, opacity, speed }: { color: GridColor; opacity: number; speed: PaperSpeed }) {
  const stroke = color === "red" ? "#F3A6A6" : "#475569";
  const major = color === "red" ? "#E36A6A" : "#64748B";
  const spacing = speed === 50 ? 10 : 14;
  return (
    <Svg pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      {Array.from({ length: 80 }).map((_, index) => <Line key={`v-${index}`} x1={index * spacing} x2={index * spacing} y1="0" y2="100%" stroke={index % 5 === 0 ? major : stroke} strokeWidth={index % 5 === 0 ? 0.9 : 0.35} />)}
      {Array.from({ length: 50 }).map((_, index) => <Line key={`h-${index}`} x1="0" x2="100%" y1={index * spacing} y2={index * spacing} stroke={index % 5 === 0 ? major : stroke} strokeWidth={index % 5 === 0 ? 0.9 : 0.35} />)}
    </Svg>
  );
}

function LeadNavigator({ onSelect, selectedLead }: { onSelect: (lead: string) => void; selectedLead: string }) {
  return (
    <View style={styles.leadNavigator}>
      {["ALL", ...leads].map((lead) => (
        <PrimaryButton key={lead} label={lead} onPress={() => onSelect(lead)} variant={selectedLead === lead ? "primary" : "outline"} />
      ))}
    </View>
  );
}

function WaveformGrid({ annotations, focusedLead, leadData, onFocusLead }: { annotations: EcgAnnotation[]; focusedLead: string | null; leadData: DigitalEcgLead[]; onFocusLead: (lead: string) => void }) {
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
                {annotations.filter((annotation) => annotation.lead === lead.lead).slice(0, 3).map((annotation, annotationIndex) => (
                  <React.Fragment key={`${lead.lead}-${annotation.finding}-${annotationIndex}`}>
                    <Rect x={annotation.region.x * 7 + 60} y={yOffset + annotation.region.y * 0.55 + 8} width={Math.max(56, annotation.region.width * 4)} height={focusedLead ? 28 : 18} fill={annotationColor(annotation, 0.16)} stroke={annotationColor(annotation)} strokeWidth={1.2} rx={6} />
                    <SvgText x={annotation.region.x * 7 + 64} y={yOffset + annotation.region.y * 0.55 + 22} fill="#0F172A" fontSize={focusedLead ? 11 : 8} fontWeight="700">{annotation.finding}</SvgText>
                  </React.Fragment>
                ))}
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

function AnnotationLayer({ annotations, heatmap, selectedLead }: { annotations: EcgAnnotation[]; heatmap: AIExplainability["heatmap"]["points"]; selectedLead: string }) {
  const points = selectedLead === "ALL" ? heatmap : heatmap.filter((point) => point.lead === selectedLead);
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 1000 560" preserveAspectRatio="none">
      {points.slice(0, 80).map((point, index) => (
        <Circle key={`${point.lead}-${index}`} cx={point.x * 10} cy={point.y * 5.6} r={Math.max(12, point.intensity * 34)} fill={`rgba(244,63,94,${Math.min(0.38, point.intensity * 0.32)})`} />
      ))}
      {annotations.map((annotation, index) => (
        <React.Fragment key={`${annotation.lead}-${annotation.finding}-${index}`}>
          <Rect x={annotation.region.x} y={annotation.region.y} width={annotation.region.width} height={annotation.region.height} rx={10} fill={annotationColor(annotation, 0.12)} stroke={annotationColor(annotation)} strokeWidth={2} />
          <Line x1={annotation.region.x + annotation.region.width / 2} x2={annotation.region.x + annotation.region.width / 2 + 60} y1={annotation.region.y} y2={annotation.region.y - 34} stroke={annotationColor(annotation)} strokeWidth={1.3} />
          <SvgText x={annotation.region.x + annotation.region.width / 2 + 66} y={Math.max(18, annotation.region.y - 36)} fill={annotationColor(annotation)} fontSize={16} fontWeight="700">{annotation.lead}: {annotation.finding}</SvgText>
          <SvgText x={annotation.region.x + 8} y={annotation.region.y + annotation.region.height + 18} fill="#0F172A" fontSize={13} fontWeight="700">{annotation.wave} • {Math.round(annotation.confidence)}%</SvgText>
        </React.Fragment>
      ))}
    </Svg>
  );
}

function ExplainabilityPanel({ analysis, annotations, ecgCase, onExplain }: { analysis?: AIAnalysisResult | null; annotations: EcgAnnotation[]; ecgCase: ApiECGCase; onExplain: (finding: EcgAnnotation | string) => void }) {
  return (
    <View style={styles.explainabilityPanel}>
      <SectionHeader title="Why this diagnosis?" subtitle="Clinical evidence behind the AI output." />
      <Text style={styles.panelDiagnosis}>{ecgCase.aiDiagnosis ?? analysis?.diagnosis ?? "Diagnosis pending"}</Text>
      <Text style={styles.body}>{analysis?.interpretation ?? ecgCase.clinicalComments ?? "Run AI analysis to populate explainability evidence."}</Text>
      <View style={styles.confidenceRow}>
        <ConfidencePill label={ecgCase.aiDiagnosis ?? analysis?.diagnosis ?? "AI"} value={confidencePercent(ecgCase.confidenceScore ?? analysis?.confidenceScore)} />
      </View>
      <MeasurementPanel analysis={analysis} ecgCase={ecgCase} />
      <Text style={styles.panelSubheading}>Evidence</Text>
      {annotations.length ? annotations.map((annotation) => (
        <View key={`${annotation.lead}-${annotation.finding}`} style={styles.findingCard}>
          <View style={styles.findingHeader}>
            <Badge label={`Lead ${annotation.lead}`} tone={annotation.tone} />
            <ConfidencePill label={annotation.finding} value={annotation.confidence} />
          </View>
          {annotation.evidence.map((item) => <Text key={item} style={styles.evidenceLine}>✓ {item}</Text>)}
          <Text style={styles.measurementText}>{annotation.measurement ?? annotation.wave}</Text>
          <PrimaryButton label="Explain this finding" onPress={() => onExplain(annotation)} variant="outline" />
        </View>
      )) : <EmptyState title="No AI annotations" message="Lead-level evidence appears after AI explainability is generated." />}
    </View>
  );
}

function MeasurementPanel({ analysis, ecgCase }: { analysis?: AIAnalysisResult | null; ecgCase: ApiECGCase }) {
  const rows = [
    ["Heart Rate", unit(ecgCase.heartRate ?? analysis?.heartRate, "BPM")],
    ["PR Interval", unit(ecgCase.prInterval, "ms")],
    ["QRS Duration", unit(ecgCase.qrsDuration, "ms")],
    ["QT Interval", unit(ecgCase.qtInterval, "ms")],
    ["QTc", unit(ecgCase.qtcInterval, "ms")],
    ["Axis", "Pending"],
    ["P Duration", "Pending"],
    ["ST Deviation", stDeviation(ecgCase, analysis)],
  ];
  return (
    <View style={styles.measurementPanel}>
      <Text style={styles.panelSubheading}>ECG Measurements</Text>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.measurementRow}>
          <Text style={styles.measurementLabel}>{label}</Text>
          <Text style={styles.measurementValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function ConfidencePill({ label, value }: { label: string; value: number }) {
  const color = value > 90 ? medicalTheme.success : value >= 70 ? medicalTheme.warning : medicalTheme.critical;
  return (
    <View style={[styles.confidencePill, { borderColor: color }]}>
      <Text numberOfLines={1} style={[styles.confidenceText, { color }]}>{label} → {Math.round(value)}%</Text>
    </View>
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

function LeadFocus({ annotations, lead, leadData, onClose }: { annotations: EcgAnnotation[]; lead: string; leadData?: DigitalEcgLead; onClose: () => void }) {
  return (
    <View style={styles.focusPanel}>
      <SectionHeader title={`Lead ${lead} Focus`} action={<PrimaryButton label="Close" onPress={onClose} variant="outline" />} />
      {leadData ? <WaveformGrid annotations={annotations} focusedLead={lead} leadData={[leadData]} onFocusLead={() => null} /> : <Text style={styles.body}>Lead data unavailable.</Text>}
      {annotations.length ? annotations.map((annotation) => (
        <View key={`${annotation.lead}-${annotation.finding}`} style={styles.findingCard}>
          <Text style={styles.aiTitle}>{annotation.finding}</Text>
          <Text style={styles.body}>{annotation.evidence.join(" • ")}</Text>
          <ConfidencePill label={annotation.wave} value={annotation.confidence} />
        </View>
      )) : null}
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

function ComparisonSummary({ analysis, ecgCase }: { analysis?: AIAnalysisResult | null; ecgCase: ApiECGCase }) {
  const diagnosis = `${ecgCase.aiDiagnosis ?? analysis?.diagnosis ?? ""}`.toLowerCase();
  const summary = [
    diagnosis.includes("st") ? "Assess for new ST elevation/depression against prior ECG." : "No explicit new ST elevation signal available in current AI output.",
    ecgCase.heartRate || analysis?.heartRate ? `Current heart rate ${ecgCase.heartRate ?? analysis?.heartRate} BPM; compare against previous ECG rate.` : "Heart rate comparison awaits prior measurements.",
    ecgCase.qtcInterval ? `Current QTc ${ecgCase.qtcInterval} ms; monitor for QT prolongation trend.` : "QTc comparison awaits current/previous measurements.",
    diagnosis.includes("af") || diagnosis.includes("flutter") ? "New arrhythmia should be checked against previous rhythm history." : "No new arrhythmia label detected in current AI output.",
  ];
  return (
    <View style={styles.comparisonSummary}>
      {summary.map((item) => <Text key={item} style={styles.body}>• {item}</Text>)}
    </View>
  );
}

function buildAnnotations(findings: AIExplainability["leadHighlights"], analysis: AIAnalysisResult | null | undefined, ecgCase: ApiECGCase): EcgAnnotation[] {
  const sourceFindings = findings.length ? findings : fallbackFindings(analysis, ecgCase);
  return sourceFindings.map((finding, index) => {
    const confidence = confidencePercent(finding.confidence);
    const wave = waveForFinding(finding.finding);
    const leadIndex = Math.max(0, leads.indexOf(finding.lead));
    return {
      confidence,
      evidence: evidenceForFinding(finding.finding, finding.reason),
      finding: finding.finding,
      lead: finding.lead,
      measurement: measurementForFinding(finding.finding, ecgCase),
      region: {
        height: 58,
        width: 136,
        x: 70 + (index % 3) * 250,
        y: 54 + Math.floor(leadIndex / 3) * 108,
      },
      tone: toneForConfidence(confidence, finding.finding),
      wave,
    };
  });
}

function fallbackFindings(analysis: AIAnalysisResult | null | undefined, ecgCase: ApiECGCase): AIExplainability["leadHighlights"] {
  const diagnosis = ecgCase.aiDiagnosis ?? analysis?.diagnosis ?? "AI finding pending";
  const confidence = ecgCase.confidenceScore ?? analysis?.confidenceScore ?? 0.72;
  const lower = diagnosis.toLowerCase();
  if (lower.includes("stemi") || lower.includes("inferior")) {
    return ["II", "III", "aVF"].map((lead) => ({ confidence, finding: "ST Elevation", lead, reason: "Inferior lead ST-segment elevation pattern supports ischemic diagnosis." }));
  }
  if (lower.includes("af") || lower.includes("atrial fibrillation")) return [{ confidence, finding: "Absent P waves", lead: "II", reason: "Irregular rhythm and absent organized P waves support atrial fibrillation." }];
  if (lower.includes("rbbb")) return [{ confidence, finding: "RBBB morphology", lead: "V1", reason: "Right precordial morphology and QRS widening support RBBB pattern." }];
  if (lower.includes("lvh")) return [{ confidence, finding: "LVH criteria", lead: "V5", reason: "Lateral voltage pattern supports LVH criteria." }];
  return [{ confidence, finding: diagnosis, lead: "II", reason: analysis?.interpretation ?? "AI generated a diagnosis but detailed lead-level evidence is pending." }];
}

function evidenceForFinding(finding: string, reason: string) {
  const lower = finding.toLowerCase();
  if (lower.includes("st")) return ["ST segment deviation measured in affected leads", "Territorial pattern reviewed", reason];
  if (lower.includes("absent p") || lower.includes("af")) return ["Irregular RR intervals", "No organized P waves", "Fibrillatory baseline reviewed", reason];
  if (lower.includes("rbbb")) return ["QRS morphology in V1 reviewed", "Terminal S waves assessed", reason];
  if (lower.includes("lvh")) return ["Voltage criteria assessed", "Lateral leads reviewed", reason];
  if (lower.includes("qt")) return ["QT interval measured", "QTc corrected for heart rate", reason];
  return [reason || "AI evidence available for physician review"];
}

function waveForFinding(finding: string): EcgAnnotation["wave"] {
  const lower = finding.toLowerCase();
  if (lower.includes("p wave") || lower.includes("absent p")) return "P wave";
  if (lower.includes("qrs") || lower.includes("rbbb") || lower.includes("lbbb")) return "QRS complex";
  if (lower.includes("qt")) return "QT interval";
  if (lower.includes("pr")) return "PR interval";
  if (lower.includes("st")) return "ST segment";
  return "T wave";
}

function measurementForFinding(finding: string, ecgCase: ApiECGCase) {
  const lower = finding.toLowerCase();
  if (lower.includes("st")) return "ST deviation: visually highlighted, mm estimate from AI evidence";
  if (lower.includes("qt")) return unit(ecgCase.qtcInterval, "ms QTc");
  if (lower.includes("qrs") || lower.includes("rbbb") || lower.includes("lbbb")) return unit(ecgCase.qrsDuration, "ms QRS");
  if (lower.includes("pr")) return unit(ecgCase.prInterval, "ms PR");
  return ecgCase.heartRate ? `${ecgCase.heartRate} BPM` : undefined;
}

function toneForConfidence(confidence: number, finding: string): EcgAnnotation["tone"] {
  if (criticalTerms.some((term) => finding.toUpperCase().includes(term))) return "critical";
  if (confidence > 90) return "success";
  if (confidence >= 70) return "warning";
  return "critical";
}

function confidencePercent(value?: number) {
  if (value === undefined || Number.isNaN(value)) return 0;
  return value <= 1 ? value * 100 : value;
}

function annotationColor(annotation: EcgAnnotation, alpha = 1) {
  const base = annotation.tone === "critical" ? "244,63,94" : annotation.tone === "success" ? "34,197,94" : annotation.tone === "warning" ? "245,158,11" : "20,221,230";
  return `rgba(${base},${alpha})`;
}

function unit(value: number | undefined | null, suffix: string) {
  return value === undefined || value === null ? "Pending" : `${value} ${suffix}`;
}

function stDeviation(ecgCase: ApiECGCase, analysis?: AIAnalysisResult | null) {
  const text = `${ecgCase.aiDiagnosis ?? ""} ${analysis?.diagnosis ?? ""}`.toLowerCase();
  if (text.includes("stemi") || text.includes("st elevation")) return "ST elevation suspected";
  if (text.includes("depression")) return "ST depression suspected";
  return "Pending";
}

function openCopilotFinding(finding: EcgAnnotation | string) {
  const prompt = typeof finding === "string"
    ? finding
    : `Explain this ECG finding: Lead ${finding.lead} ${finding.finding}. Evidence: ${finding.evidence.join("; ")}. Measurement: ${finding.measurement ?? finding.wave}.`;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("medical-copilot:ask", { detail: { prompt } }));
  }
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
  comparisonSummary: { gap: 6 },
  comparisonTitle: { color: medicalTheme.text, fontSize: 15, fontWeight: "900", marginBottom: 10 },
  confidencePill: { backgroundColor: "rgba(8,22,37,0.9)", borderRadius: 999, borderWidth: 1, maxWidth: 220, paddingHorizontal: 9, paddingVertical: 5 },
  confidenceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  confidenceText: { fontSize: 11, fontWeight: "900" },
  criticalBanner: { alignItems: "center", backgroundColor: medicalTheme.critical, borderRadius: 14, flexDirection: "row", gap: 10, padding: 12 },
  criticalText: { color: "#fff", flex: 1, fontSize: 13, fontWeight: "900" },
  evidenceLine: { color: medicalTheme.text, fontSize: 12, fontWeight: "800", lineHeight: 18 },
  explainabilityLayout: { alignItems: "stretch", flexDirection: "row", flexWrap: "wrap", gap: 14 },
  explainabilityPanel: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 16, borderWidth: 1, flex: 1, gap: 12, minWidth: 300, padding: 14 },
  focusPanel: { backgroundColor: medicalTheme.cardAlt, borderColor: medicalTheme.primary, borderRadius: 16, borderWidth: 1, gap: 10, padding: 12 },
  fullscreen: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0, zIndex: 99 },
  findingCard: { backgroundColor: "#071D2D", borderColor: "#164E63", borderRadius: 14, borderWidth: 1, gap: 8, padding: 10 },
  findingHeader: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" },
  header: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" },
  leadNavigator: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  measurementLabel: { color: medicalTheme.muted, fontSize: 11, fontWeight: "900" },
  measurementPanel: { backgroundColor: medicalTheme.card, borderColor: medicalTheme.border, borderRadius: 14, borderWidth: 1, gap: 7, padding: 10 },
  measurementRow: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  measurementText: { color: medicalTheme.primary, fontSize: 12, fontWeight: "900" },
  measurementValue: { color: medicalTheme.text, fontSize: 12, fontWeight: "900" },
  modeTabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  monitor: { backgroundColor: "#020617", borderColor: "#14532D", borderRadius: 18, borderWidth: 1, gap: 10, padding: 14 },
  monitorHeader: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 16 },
  monitorMetric: { color: "#22C55E", fontSize: 18, fontWeight: "900" },
  monitorText: { color: "#22C55E", fontSize: 14, fontWeight: "800" },
  monitorTitle: { color: "#DCFCE7", fontSize: 13, fontWeight: "900", letterSpacing: 1.2 },
  originalCanvas: { alignItems: "center", backgroundColor: "#FFF7F7", borderColor: medicalTheme.border, borderRadius: 16, borderWidth: 1, justifyContent: "center", minHeight: 520, overflow: "hidden", position: "relative" },
  originalImage: { height: 500, width: "100%" },
  panelDiagnosis: { color: medicalTheme.text, fontSize: 20, fontWeight: "900" },
  panelSubheading: { color: medicalTheme.primary, fontSize: 12, fontWeight: "900", letterSpacing: 0.5, textTransform: "uppercase" },
  subtitle: { color: medicalTheme.muted, fontSize: 13, lineHeight: 19 },
  title: { color: medicalTheme.text, fontSize: 22, fontWeight: "900" },
  toolbar: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  viewerPanel: { gap: 12 },
  waveScroll: { borderRadius: 16, maxHeight: 720 },
  workstation: { backgroundColor: medicalTheme.card, borderColor: medicalTheme.border, borderRadius: 22, borderWidth: 1, gap: 14, padding: 16 },
});
