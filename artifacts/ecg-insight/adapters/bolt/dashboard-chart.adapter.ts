import type { ApiECGCase } from "@/services/clinical";
import type { NotificationRecord } from "@/services/collaboration";
import type {
  DashboardActivityItem,
  DashboardChartPoint,
  DashboardDiagnosisSlice,
  DashboardRecentCaseRow,
} from "@/types/screens/dashboard";

/** Bolt reference chart palette — resolved to design tokens at render time. */
const BOLT_DIAGNOSIS_FALLBACK: DashboardDiagnosisSlice[] = [
  { colorKey: "chart4", name: "Normal ECG", value: 57 },
  { colorKey: "accent", name: "Atrial Fibrillation", value: 18 },
  { colorKey: "critical", name: "ST Changes", value: 12 },
  { colorKey: "primary", name: "Bundle Branch Block", value: 8 },
  { colorKey: "warning", name: "Other", value: 5 },
];

const BOLT_MONTHLY_FALLBACK: DashboardChartPoint[] = [
  { cases: 18, critical: 2, month: "Jan" },
  { cases: 22, critical: 1, month: "Feb" },
  { cases: 28, critical: 4, month: "Mar" },
  { cases: 24, critical: 2, month: "Apr" },
  { cases: 31, critical: 3, month: "May" },
  { cases: 38, critical: 3, month: "Jun" },
];

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function mapPriority(priority: ApiECGCase["priority"]): DashboardRecentCaseRow["priority"] {
  if (priority === "critical") return "critical";
  if (priority === "high") return "urgent";
  return "routine";
}

function mapStatus(status: ApiECGCase["status"]): DashboardRecentCaseRow["status"] {
  if (status === "ai_completed" || status === "approved" || status === "finalized" || status === "signed") return "completed";
  if (status === "reviewed") return "reviewed";
  if (status === "under_review" || status === "awaiting_second_opinion" || status === "escalated") return "reviewing";
  if (status === "pending" || status === "new" || status === "uploaded") return "pending";
  if (status === "processing") return "analyzing";
  return "analyzing";
}

export function toDashboardRecentCaseRows(cases: ApiECGCase[]): DashboardRecentCaseRow[] {
  return cases.slice(0, 4).map((item) => ({
    caseId: item.caseNumber ?? item.caseId ?? item.id,
    id: item.id,
    patientName: `${item.patient?.firstName ?? ""} ${item.patient?.lastName ?? ""}`.trim() || "Unknown patient",
    priority: mapPriority(item.priority),
    rhythm: item.rhythm ?? item.aiDiagnosis ?? "—",
    status: mapStatus(item.status),
  }));
}

export function deriveMonthlyCases(cases: ApiECGCase[], fallbackTotal: number): DashboardChartPoint[] {
  if (!cases.length) {
    return scaleMonthlyFallback(fallbackTotal);
  }

  const buckets = new Map<string, DashboardChartPoint>();
  for (const item of cases) {
    const date = new Date(item.uploadDate ?? item.acquisitionDate);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const label = MONTH_LABELS[date.getMonth()] ?? "—";
    const current = buckets.get(key) ?? { cases: 0, critical: 0, month: label };
    current.cases += 1;
    if (item.priority === "critical" || item.severity === "critical") current.critical += 1;
    buckets.set(key, current);
  }

  const derived = [...buckets.values()].slice(-6);
  return derived.length >= 3 ? derived : scaleMonthlyFallback(fallbackTotal);
}

function scaleMonthlyFallback(total: number): DashboardChartPoint[] {
  const factor = total > 0 ? Math.max(total / 247, 0.35) : 1;
  return BOLT_MONTHLY_FALLBACK.map((point) => ({
    ...point,
    cases: Math.max(1, Math.round(point.cases * factor)),
    critical: Math.max(0, Math.round(point.critical * factor)),
  }));
}

export function deriveDiagnosisDistribution(cases: ApiECGCase[]): DashboardDiagnosisSlice[] {
  if (!cases.length) return BOLT_DIAGNOSIS_FALLBACK;

  const counts = new Map<string, number>();
  for (const item of cases) {
    const label = item.aiDiagnosis ?? item.finalDiagnosis ?? item.severity ?? "Other";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const total = cases.length;
  const palette: DashboardDiagnosisSlice["colorKey"][] = ["chart4", "accent", "critical", "primary", "warning"];
  const slices = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count], index) => ({
      colorKey: palette[index] ?? "primary",
      name,
      value: Math.round((count / total) * 100),
    }));

  return slices.length ? slices : BOLT_DIAGNOSIS_FALLBACK;
}

export function toDashboardActivity(
  notifications: NotificationRecord[],
  timeline: Array<{ text: string; title: string }>,
): DashboardActivityItem[] {
  const fromNotifications = notifications.slice(0, 5).map((item) => ({
    action: "updated",
    createdAt: item.timestamp ?? new Date().toISOString(),
    id: item.id,
    target: item.title,
    type: item.type ?? "system",
    user: item.type ?? "System",
  }));

  if (fromNotifications.length >= 3) return fromNotifications;

  return timeline.slice(0, 5).map((item, index) => ({
    action: item.text,
    createdAt: new Date(Date.now() - index * 86_400_000).toISOString(),
    id: `timeline-${index}`,
    target: item.title,
    type: "workflow",
    user: "Clinical Workspace",
  }));
}

export function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 1)} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}
