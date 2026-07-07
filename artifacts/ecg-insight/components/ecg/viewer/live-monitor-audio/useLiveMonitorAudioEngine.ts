import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import type { DigitalEcgLead } from "@/services/ecgProcessing";

import { detectBeatMarkerIndices, detectPvcIndices } from "../ecgMonitorBeatMarkers";
import { sampleIndexToMs } from "../ecgMonitorPath";
import { MONITOR_AUDIO, type MonitorAudioMode } from "./ecgMonitorAudioTokens";

export function useLiveMonitorAudioEngine(input: {
  activeLead?: DigitalEcgLead | null;
  enabled?: boolean;
  frozen?: boolean;
  heartRate?: number;
  playheadMs: number;
}) {
  const [mode, setMode] = useState<MonitorAudioMode>("adult");
  const [volume, setVolume] = useState(MONITOR_AUDIO.defaultVolume);
  const contextRef = useRef<AudioContext | null>(null);
  const triggeredRef = useRef<Set<number>>(new Set());
  const lastPlayheadRef = useRef(0);

  const ensureContext = useCallback(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return null;
    if (!contextRef.current) {
      contextRef.current = new AudioContext();
    }
    if (contextRef.current.state === "suspended") {
      void contextRef.current.resume();
    }
    return contextRef.current;
  }, []);

  const playTone = useCallback(
    (frequencyHz: number) => {
      if (mode === "silent" || mode === "mute" || volume <= 0) return;
      const ctx = ensureContext();
      if (!ctx) return;
      const started = performance.now();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequencyHz;
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + MONITOR_AUDIO.beepDurationSec);
      const latency = performance.now() - started;
      if (latency > MONITOR_AUDIO.latencyTargetMs * 2) {
        // keep hook for perf telemetry; no console noise in production
      }
    },
    [ensureContext, mode, volume],
  );

  const cycleMode = useCallback(() => {
    setMode((current) => {
      const order: MonitorAudioMode[] = ["adult", "pediatric", "silent", "mute"];
      const index = order.indexOf(current);
      return order[(index + 1) % order.length]!;
    });
  }, []);

  useEffect(() => {
    if (!input.enabled || input.frozen || !input.activeLead?.samples.length) return;
    const lead = input.activeLead;
    const peaks = detectBeatMarkerIndices(lead, 128);
    const pvcSet = new Set(detectPvcIndices(lead));
    const peakTimes = peaks.map((index) => Math.round(sampleIndexToMs(lead, index)));

    const prev = lastPlayheadRef.current;
    const current = input.playheadMs;
    lastPlayheadRef.current = current;

    if (current < prev) {
      triggeredRef.current.clear();
    }

    for (const peakMs of peakTimes) {
      if (triggeredRef.current.has(peakMs)) continue;
      if (peakMs > prev && peakMs <= current) {
        triggeredRef.current.add(peakMs);
        const peakIndex = peaks[peakTimes.indexOf(peakMs)];
        const isPvc = peakIndex != null && pvcSet.has(peakIndex);
        const baseFreq = mode === "pediatric" ? MONITOR_AUDIO.pediatricFrequencyHz : MONITOR_AUDIO.adultFrequencyHz;
        playTone(isPvc ? MONITOR_AUDIO.pvcFrequencyHz : baseFreq);
      }
    }
  }, [input.activeLead, input.enabled, input.frozen, input.playheadMs, mode, playTone]);

  useEffect(() => {
    return () => {
      void contextRef.current?.close();
      contextRef.current = null;
    };
  }, []);

  const rhythmLabel =
    input.heartRate != null && input.heartRate < 50
      ? "Bradycardia"
      : input.heartRate != null && input.heartRate > 100
        ? "Tachycardia"
        : "Normal";

  return {
    cycleMode,
    mode,
    rhythmLabel,
    setMode,
    setVolume,
    volume,
  };
}
