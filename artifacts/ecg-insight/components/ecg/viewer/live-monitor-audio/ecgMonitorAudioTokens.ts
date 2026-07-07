/** Sprint 50 — authentic bedside monitor audio tokens */

export type MonitorAudioMode = "adult" | "mute" | "pediatric" | "silent";

export const MONITOR_AUDIO = {
  adultFrequencyHz: 880,
  latencyTargetMs: 8,
  pediatricFrequencyHz: 1046,
  pvcFrequencyHz: 660,
  defaultVolume: 0.35,
  maxVolume: 1,
  minVolume: 0,
  beepDurationSec: 0.045,
} as const;

export function audioModeLabel(mode: MonitorAudioMode) {
  const labels: Record<MonitorAudioMode, string> = {
    adult: "Adult",
    mute: "Mute",
    pediatric: "Pediatric",
    silent: "Silent",
  };
  return labels[mode];
}
