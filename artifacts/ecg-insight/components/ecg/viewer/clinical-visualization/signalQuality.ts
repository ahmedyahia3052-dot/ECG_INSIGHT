import type { DigitalEcg } from "@/services/ecgProcessing";

import type { EcgSignalQualityFlag } from "./types";

export function deriveSignalQualityFlags(digitalEcg: DigitalEcg | null | undefined): EcgSignalQualityFlag[] {
  if (!digitalEcg) return [];
  const flags: EcgSignalQualityFlag[] = [];
  const score = digitalEcg.quality?.score ?? 100;
  const warnings = digitalEcg.quality?.warnings ?? [];
  const validation = digitalEcg.validation?.warnings ?? [];

  if (score < 55) {
    flags.push({ color: "#EF4444", label: "Poor Signal", severity: "critical", type: "poor-signal" });
  } else if (score < 80) {
    flags.push({ color: "#F59E0B", label: "Moderate Quality", severity: "warning", type: "poor-signal" });
  }

  for (const warning of [...warnings, ...validation]) {
    const lower = warning.toLowerCase();
    if (lower.includes("noise")) flags.push({ color: "#F59E0B", label: "Noise", severity: "warning", type: "noise" });
    if (lower.includes("baseline")) flags.push({ color: "#F59E0B", label: "Baseline Wander", severity: "warning", type: "baseline" });
    if (lower.includes("artifact")) flags.push({ color: "#EF4444", label: "Artifact", severity: "critical", type: "artifact" });
    if (lower.includes("powerline") || lower.includes("50hz") || lower.includes("60hz")) {
      flags.push({ color: "#F59E0B", label: "Powerline", severity: "warning", type: "powerline" });
    }
    if (lower.includes("lead off") || lower.includes("lead-off")) {
      flags.push({ color: "#EF4444", label: "Lead Off", severity: "critical", type: "lead-off" });
    }
  }

  const unique = new Map<string, EcgSignalQualityFlag>();
  for (const flag of flags) unique.set(flag.type, flag);
  return [...unique.values()];
}

export function signalQualityLabel(flags: EcgSignalQualityFlag[]) {
  if (!flags.length) return "Good";
  const critical = flags.find((f) => f.severity === "critical");
  if (critical) return critical.label;
  return flags[0]!.label;
}

export function signalQualityTone(flags: EcgSignalQualityFlag[]): "critical" | "success" | "warning" {
  if (flags.some((f) => f.severity === "critical")) return "critical";
  if (flags.some((f) => f.severity === "warning")) return "warning";
  return "success";
}
