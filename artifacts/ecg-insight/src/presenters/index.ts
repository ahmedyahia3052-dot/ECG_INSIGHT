import type { BadgeTone, UiBadge } from "../view-models";

export const datePresenter = {
  formatDate(value?: string | Date | null) {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(undefined, { dateStyle: "medium" });
  },
  formatDateTime(value?: string | Date | null) {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  },
  formatRelative(value?: string | Date | null) {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.round(diffMs / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return datePresenter.formatDate(date);
  },
};

export const measurementPresenter = {
  confidence(value?: number | null) {
    if (value == null) return "—";
    return `${Math.round(value * 100)}%`;
  },
  heartRate(value?: number | null) {
    if (value == null) return "—";
    return `${Math.round(value)} bpm`;
  },
  interval(value?: number | null) {
    if (value == null) return "—";
    return `${Math.round(value)}`;
  },
  withUnit(value?: number | null, unit = "ms") {
    if (value == null) return "—";
    return `${Math.round(value)} ${unit}`;
  },
};

function badge(label: string, tone: BadgeTone = "default"): UiBadge {
  return { label, tone };
}

export const statusPresenter = {
  aiStatus(value?: string | null) {
    const label = value?.replace(/_/g, " ") ?? "Pending";
    const tone: BadgeTone = value?.includes("fail") ? "critical" : value?.includes("complete") ? "success" : "warning";
    return badge(label, tone);
  },
  caseStatus(value?: string | null) {
    const label = value?.replace(/_/g, " ") ?? "Unknown";
    const tone: BadgeTone = value === "approved" ? "success" : value === "rejected" ? "critical" : "primary";
    return badge(label, tone);
  },
  notificationSeverity(value?: string | null) {
    const lower = (value ?? "").toLowerCase();
    const tone: BadgeTone = lower.includes("critical") ? "critical" : lower.includes("warning") ? "warning" : "default";
    return badge(value ?? "Info", tone);
  },
  patientStatus(value?: string | null) {
    return badge(value ?? "Active", value === "archived" ? "muted" : "success");
  },
  planTier(value?: string | null) {
    return badge(value ?? "Standard", value?.toLowerCase().includes("enterprise") ? "primary" : "default");
  },
  priority(value?: string | null) {
    const tone: BadgeTone = value === "critical" ? "critical" : value === "high" ? "warning" : "default";
    return badge(value ?? "normal", tone);
  },
  role(value?: string | null) {
    return badge(value ?? "clinician", "primary");
  },
  subscriptionStatus(value?: string | null) {
    const tone: BadgeTone = value === "active" ? "success" : value === "past_due" ? "warning" : "muted";
    return badge(value ?? "inactive", tone);
  },
  uploadStatus(value?: string | null) {
    const tone: BadgeTone = value === "failed" ? "critical" : value === "complete" ? "success" : "warning";
    return badge(value ?? "pending", tone);
  },
};

export const labelPresenter = {
  titleCase(value: string) {
    return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  },
};
