import React, { useMemo, useState } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";
import Svg, { Line, Path, Rect } from "react-native-svg";

import { medicalTheme, PrimaryButton } from "@/components/enterprise/EnterpriseUI";
import type { DigitalEcgLead } from "@/services/ecgProcessing";

type CaliperMode = "horizontal" | "vertical";

type Props = {
  calibration?: {
    gainMmPerMv: 5 | 10 | 20;
    paperSpeedMmPerSec: 25 | 50;
  };
  highlight?: { endMs: number; lead: string; startMs: number } | null;
  lead?: DigitalEcgLead | null;
};

function snap(value: number, step: number) {
  return Math.round(value / step) * step;
}

function msPerPixel(paperSpeedMmPerSec: number, width: number, durationSeconds: number) {
  const totalMs = durationSeconds * 1000;
  return totalMs / Math.max(width, 1);
}

function mvPerPixel(gainMmPerMv: number, height: number) {
  return (2.4 / height) * (10 / gainMmPerMv);
}

export function EcgDigitalCalipers({ calibration, highlight, lead }: Props) {
  const [mode, setMode] = useState<CaliperMode>("horizontal");
  const [start, setStart] = useState({ x: 40, y: 80 });
  const [end, setEnd] = useState({ x: 180, y: 80 });
  const width = 920;
  const height = 180;

  const durationSeconds = lead?.durationSeconds ?? 2.5;
  const paperSpeed = calibration?.paperSpeedMmPerSec ?? 25;
  const gain = calibration?.gainMmPerMv ?? 10;
  const snapMs = paperSpeed === 25 ? 40 : 20;
  const snapMm = 1;
  const snapMv = Number((1 / gain).toFixed(3));

  const horizontalMs = useMemo(() => {
    const deltaPx = Math.abs(end.x - start.x);
    return snap(deltaPx * msPerPixel(paperSpeed, width, durationSeconds), snapMs);
  }, [durationSeconds, end.x, paperSpeed, snapMs, start.x, width]);

  const verticalMv = useMemo(() => {
    const deltaPx = Math.abs(end.y - start.y);
    return snap(deltaPx * mvPerPixel(gain, height), snapMv);
  }, [end.y, gain, height, snapMv, start.y]);

  const verticalMm = useMemo(() => {
    const deltaPx = Math.abs(end.y - start.y);
    return snap(deltaPx * mvPerPixel(gain, height) * gain, snapMm);
  }, [end.y, gain, height, snapMm, start.y]);

  const panResponder = PanResponder.create({
    onPanResponderGrant: () => undefined,
    onPanResponderMove: (_event, gesture) => {
      if (mode === "horizontal") {
        setEnd((current) => ({
          x: snap(Math.max(0, Math.min(width, current.x + gesture.dx)), paperSpeed === 25 ? 8 : 4),
          y: current.y,
        }));
      } else {
        setEnd((current) => ({
          x: current.x,
          y: snap(Math.max(0, Math.min(height, current.y + gesture.dy)), 4),
        }));
      }
    },
  });

  const path = lead ? buildWavePath(lead, width, height) : "";

  return (
    <View style={styles.shell}>
      <View style={styles.toolbar}>
        <PrimaryButton label="Horizontal" onPress={() => setMode("horizontal")} variant={mode === "horizontal" ? "primary" : "outline"} />
        <PrimaryButton label="Vertical" onPress={() => setMode("vertical")} variant={mode === "vertical" ? "primary" : "outline"} />
        <PrimaryButton label="Reset Calipers" onPress={() => { setStart({ x: 40, y: 80 }); setEnd({ x: 180, y: 80 }); }} variant="outline" />
      </View>

      <View {...panResponder.panHandlers} style={styles.canvasWrap}>
        <Svg height={height} width={width}>
          <Rect fill="#fff5f5" height={height} width={width} x={0} y={0} />
          {Array.from({ length: 24 }).map((_v, index) => (
            <Line key={`grid-${index}`} stroke="rgba(248,113,113,0.18)" strokeWidth={index % 5 === 0 ? 1 : 0.5} x1={index * (width / 24)} x2={index * (width / 24)} y1={0} y2={height} />
          ))}
          {path ? <Path d={path} fill="none" stroke="#dc2626" strokeWidth={1.8} /> : null}
          {highlight && lead ? (
            <Rect
              fill="rgba(56,189,248,0.15)"
              height={height}
              stroke="#38bdf8"
              strokeWidth={2}
              width={Math.max(8, ((highlight.endMs - highlight.startMs) / (durationSeconds * 1000)) * width)}
              x={(highlight.startMs / (durationSeconds * 1000)) * width}
              y={0}
            />
          ) : null}
          <Line stroke="#38bdf8" strokeDasharray="6,4" strokeWidth={2} x1={start.x} x2={end.x} y1={start.y} y2={end.y} />
          <Rect fill="#38bdf8" height={8} width={8} x={start.x - 4} y={start.y - 4} />
          <Rect fill="#0ea5e9" height={8} width={8} x={end.x - 4} y={end.y - 4} />
        </Svg>
      </View>

      <View style={styles.readoutRow}>
        {mode === "horizontal" ? (
          <Readout label="Horizontal" unit="ms" value={horizontalMs} />
        ) : (
          <>
            <Readout label="Vertical" unit="mV" value={verticalMv} />
            <Readout label="Vertical" unit="mm" value={verticalMm} />
          </>
        )}
        <Readout label="Snap" unit={mode === "horizontal" ? "ms" : "mV"} value={mode === "horizontal" ? snapMs : snapMv} />
        <Text style={styles.meta}>Paper {paperSpeed} mm/s · Gain {gain} mm/mV · Automatic snapping enabled</Text>
      </View>
    </View>
  );
}

function Readout({ label, unit, value }: { label: string; unit: string; value: number }) {
  return (
    <View style={styles.readout}>
      <Text style={styles.readoutLabel}>{label}</Text>
      <Text style={styles.readoutValue}>{value} {unit}</Text>
    </View>
  );
}

function buildWavePath(lead: DigitalEcgLead, width: number, height: number) {
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

const styles = StyleSheet.create({
  canvasWrap: {
    backgroundColor: "#fff5f5",
    borderColor: "rgba(148,163,184,0.22)",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  meta: { color: medicalTheme.muted, flex: 1, fontSize: 11, minWidth: 220 },
  readout: {
    backgroundColor: "rgba(15,23,42,0.88)",
    borderColor: "rgba(148,163,184,0.22)",
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 120,
    padding: 10,
  },
  readoutLabel: { color: medicalTheme.muted, fontSize: 11, fontWeight: "700" },
  readoutRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10 },
  readoutValue: { color: medicalTheme.text, fontSize: 16, fontWeight: "900", marginTop: 4 },
  shell: { gap: 12 },
  toolbar: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
