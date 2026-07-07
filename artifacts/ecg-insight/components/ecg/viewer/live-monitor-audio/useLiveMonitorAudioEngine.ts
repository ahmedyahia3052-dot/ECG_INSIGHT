import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import type { DigitalEcgLead } from "@/services/ecgProcessing";

import { detectBeatMarkerIndices, detectPvcIndices } from "../ecgMonitorBeatMarkers";
import { sampleIndexToMs } from "../ecgMonitorPath";
import {
  audioProfileLabel,
  MONITOR_AUDIO,
  profileFrequencyHz,
  type MonitorAudioMode,
  type MonitorAudioProfile,
} from "./ecgMonitorAudioTokens";

function resolveRhythmProfile(input: {
  heartRate?: number;
  leadOff?: boolean;
  rhythm?: string;
}): MonitorAudioProfile {
  const rhythm = (input.rhythm ?? "").toLowerCase();
  if (input.leadOff) return "lead-off";
  if (rhythm.includes("asystole") || (input.heartRate != null && input.heartRate <= 20)) return "asystole";
  if (rhythm.includes("vf") || rhythm.includes("fibrillation")) return "vf";
  if (rhythm.includes("vt") || (rhythm.includes("tachycardia") && rhythm.includes("ventricular"))) return "vt";
  if (input.heartRate != null && input.heartRate < 50) return "bradycardia";
  if (input.heartRate != null && input.heartRate > 100) return "tachycardia";
  return "normal";
}

export function useLiveMonitorAudioEngine(input: {
  activeLead?: DigitalEcgLead | null;
  alarmEnabled?: boolean;
  enabled?: boolean;
  frozen?: boolean;
  heartRate?: number;
  leadOff?: boolean;
  playheadMs: number;
  rhythm?: string;
}) {
  const [mode, setMode] = useState<MonitorAudioMode>("adult");
  const [volume, setVolume] = useState(MONITOR_AUDIO.defaultVolume);
  const [alarmVolume, setAlarmVolume] = useState(MONITOR_AUDIO.defaultAlarmVolume);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const contextRef = useRef<AudioContext | null>(null);
  const triggeredRef = useRef<Set<number>>(new Set());
  const lastPlayheadRef = useRef(0);
  const lastAlarmAtRef = useRef(0);

  const rhythmProfile = resolveRhythmProfile({
    heartRate: input.heartRate,
    leadOff: input.leadOff,
    rhythm: input.rhythm,
  });

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
    (frequencyHz: number, gainLevel: number, durationSec: number = MONITOR_AUDIO.beepDurationSec) => {
      if (mode === "silent" || mode === "mute" || !audioEnabled || gainLevel <= 0) return;
      const ctx = ensureContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequencyHz;
      gain.gain.value = gainLevel;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationSec);
    },
    [audioEnabled, ensureContext, mode],
  );

  const cycleMode = useCallback(() => {
    setMode((current) => {
      const order: MonitorAudioMode[] = ["adult", "pediatric", "silent", "mute"];
      const index = order.indexOf(current);
      return order[(index + 1) % order.length]!;
    });
  }, []);

  useEffect(() => {
    if (!input.enabled || !input.alarmEnabled || input.frozen || mode === "mute" || mode === "silent" || !audioEnabled) return;
    const isAlarmProfile = rhythmProfile !== "normal";
    if (!isAlarmProfile) return;
    const now = performance.now();
    if (now - lastAlarmAtRef.current < 900) return;
    lastAlarmAtRef.current = now;
    playTone(
      profileFrequencyHz(rhythmProfile, mode),
      alarmVolume,
      MONITOR_AUDIO.alarmDurationSec,
    );
  }, [alarmVolume, audioEnabled, input.alarmEnabled, input.enabled, input.frozen, mode, playTone, rhythmProfile]);

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
        const profile: MonitorAudioProfile = isPvc ? "pvc" : rhythmProfile === "normal" ? "normal" : rhythmProfile;
        playTone(profileFrequencyHz(profile, mode), profile === "normal" ? volume : alarmVolume);
      }
    }
  }, [alarmVolume, input.activeLead, input.enabled, input.frozen, input.playheadMs, mode, playTone, rhythmProfile, volume]);

  useEffect(() => {
    return () => {
      void contextRef.current?.close();
      contextRef.current = null;
    };
  }, []);

  return {
    audioEnabled,
    alarmVolume,
    cycleMode,
    mode,
    profile: rhythmProfile,
    profileLabel: audioProfileLabel(rhythmProfile),
    rhythmLabel: audioProfileLabel(rhythmProfile),
    setAlarmVolume,
    setAudioEnabled,
    setMode,
    setVolume,
    volume,
  };
}
