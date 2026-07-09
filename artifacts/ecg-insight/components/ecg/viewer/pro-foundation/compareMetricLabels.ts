export const COMPARE_METRIC_LABELS: Record<string, { label: string; unit: string }> = {
  heartRate: { label: "Heart Rate", unit: "bpm" },
  heartRateBpm: { label: "Heart Rate", unit: "bpm" },
  prInterval: { label: "PR Interval", unit: "ms" },
  prIntervalMs: { label: "PR Interval", unit: "ms" },
  qrsDuration: { label: "QRS Duration", unit: "ms" },
  qrsDurationMs: { label: "QRS Duration", unit: "ms" },
  qtInterval: { label: "QT Interval", unit: "ms" },
  qtIntervalMs: { label: "QT Interval", unit: "ms" },
  qtcBazettMs: { label: "QTc (Bazett)", unit: "ms" },
  qtcInterval: { label: "QTc", unit: "ms" },
  qtcIntervalMs: { label: "QTc", unit: "ms" },
  rrIntervalMs: { label: "RR Interval", unit: "ms" },
  stDeviationMm: { label: "ST Deviation", unit: "mm" },
};

export function formatCompareMetric(metric: string, delta: number) {
  const meta = COMPARE_METRIC_LABELS[metric] ?? { label: metric, unit: "" };
  const sign = delta > 0 ? "+" : "";
  const value = Number.isInteger(delta) ? `${sign}${delta}` : `${sign}${delta.toFixed(1)}`;
  return `${meta.label}: ${value}${meta.unit ? ` ${meta.unit}` : ""}`;
}
