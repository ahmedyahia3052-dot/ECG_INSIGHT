/** Hospital bedside monitor audio tokens — R-wave sync + clinical alarm profiles */

export type MonitorAudioMode = "adult" | "mute" | "pediatric" | "silent";

export type MonitorAudioProfile =
  | "asystole"
  | "bradycardia"
  | "lead-off"
  | "normal"
  | "pvc"
  | "tachycardia"
  | "vf"
  | "vt";

export const MONITOR_AUDIO = {
  adultFrequencyHz: 880,
  alarmDurationSec: 0.12,
  asystoleFrequencyHz: 220,
  bradycardiaFrequencyHz: 520,
  defaultAlarmVolume: 0.55,
  defaultVolume: 0.35,
  latencyTargetMs: 8,
  leadOffFrequencyHz: 440,
  maxVolume: 1,
  minVolume: 0,
  pediatricFrequencyHz: 1046,
  pvcFrequencyHz: 660,
  tachycardiaFrequencyHz: 1180,
  beepDurationSec: 0.045,
  vfFrequencyHz: 880,
  vtFrequencyHz: 740,
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

export function audioProfileLabel(profile: MonitorAudioProfile) {
  const labels: Record<MonitorAudioProfile, string> = {
    asystole: "Asystole",
    bradycardia: "Bradycardia",
    "lead-off": "Lead Off",
    normal: "Normal",
    pvc: "PVC",
    tachycardia: "Tachycardia",
    vf: "VF",
    vt: "VT",
  };
  return labels[profile];
}

export function profileFrequencyHz(profile: MonitorAudioProfile, mode: MonitorAudioMode) {
  if (profile === "pvc") return MONITOR_AUDIO.pvcFrequencyHz;
  if (profile === "bradycardia") return MONITOR_AUDIO.bradycardiaFrequencyHz;
  if (profile === "tachycardia") return MONITOR_AUDIO.tachycardiaFrequencyHz;
  if (profile === "vf") return MONITOR_AUDIO.vfFrequencyHz;
  if (profile === "vt") return MONITOR_AUDIO.vtFrequencyHz;
  if (profile === "asystole") return MONITOR_AUDIO.asystoleFrequencyHz;
  if (profile === "lead-off") return MONITOR_AUDIO.leadOffFrequencyHz;
  return mode === "pediatric" ? MONITOR_AUDIO.pediatricFrequencyHz : MONITOR_AUDIO.adultFrequencyHz;
}
