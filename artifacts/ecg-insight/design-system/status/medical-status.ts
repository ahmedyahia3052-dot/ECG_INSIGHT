import { designColorTokens } from "../tokens/colors";
import type { EnterpriseIconId } from "../icons/registry";

export type MedicalStatusId =
  | "critical"
  | "urgent"
  | "emergency"
  | "stable"
  | "observation"
  | "pending"
  | "completed"
  | "disconnected"
  | "aiProcessing"
  | "aiComplete";

export type MedicalStatusDefinition = {
  animation?: "pulse" | "none";
  badgeTone: "critical" | "warning" | "success" | "primary" | "neutral";
  color: string;
  icon: EnterpriseIconId;
  label: string;
  typography: "statusLabel" | "caption";
};

export const medicalStatusRegistry: Record<MedicalStatusId, MedicalStatusDefinition> = {
  critical: {
    badgeTone: "critical",
    color: designColorTokens.medical.critical,
    icon: "critical",
    label: "Critical",
    typography: "statusLabel",
    animation: "pulse",
  },
  urgent: {
    badgeTone: "warning",
    color: designColorTokens.medical.warning,
    icon: "alert",
    label: "Urgent",
    typography: "statusLabel",
    animation: "pulse",
  },
  emergency: {
    badgeTone: "critical",
    color: designColorTokens.medical.emergency,
    icon: "critical",
    label: "Emergency",
    typography: "statusLabel",
    animation: "pulse",
  },
  stable: {
    badgeTone: "success",
    color: designColorTokens.medical.success,
    icon: "ecg",
    label: "Stable",
    typography: "statusLabel",
  },
  observation: {
    badgeTone: "primary",
    color: designColorTokens.medical.information,
    icon: "viewer",
    label: "Observation",
    typography: "caption",
  },
  pending: {
    badgeTone: "warning",
    color: designColorTokens.medical.warning,
    icon: "report",
    label: "Pending",
    typography: "caption",
  },
  completed: {
    badgeTone: "success",
    color: designColorTokens.medical.success,
    icon: "report",
    label: "Completed",
    typography: "caption",
  },
  disconnected: {
    badgeTone: "neutral",
    color: designColorTokens.gray[500],
    icon: "liveMonitor",
    label: "Disconnected",
    typography: "caption",
  },
  aiProcessing: {
    badgeTone: "primary",
    color: designColorTokens.medical.accent,
    icon: "ai",
    label: "AI Processing",
    typography: "statusLabel",
    animation: "pulse",
  },
  aiComplete: {
    badgeTone: "success",
    color: designColorTokens.medical.success,
    icon: "ai",
    label: "AI Complete",
    typography: "statusLabel",
  },
};

export function resolveMedicalStatus(status: MedicalStatusId): MedicalStatusDefinition {
  return medicalStatusRegistry[status];
}
