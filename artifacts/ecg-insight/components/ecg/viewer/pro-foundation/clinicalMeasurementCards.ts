import type { ClinicalMeasurementSnapshot } from "@/services/clinicalMeasurementApi";

import type { LiveMeasurementSnapshot } from "../ecgLiveMeasurements";

export type ClinicalMeasurementCard = {
  abnormal?: boolean;
  id: string;
  label: string;
  source: string;
  unit: string;
  value: string;
};

export type ClinicalMeasurementBundleSeed = {
  electricalAxisDeg?: number | null;
  heartRate?: number | null;
  pDurationMs?: number | null;
  prIntervalMs?: number | null;
  qrsDurationMs?: number | null;
  qtIntervalMs?: number | null;
  qtcIntervalMs?: number | null;
  rrIntervalMs?: number | null;
  stLevelMm?: number | null;
  tWaveDurationMs?: number | null;
};

function formatNumber(value: number | null | undefined, unit: string) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const rounded = unit === "mm" ? value.toFixed(1) : String(Math.round(value));
  return `${rounded} ${unit}`;
}

function formatAxis(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return `${Math.round(value)}°`;
}

function pickLive(live: LiveMeasurementSnapshot | null, key: keyof LiveMeasurementSnapshot) {
  const value = live?.[key];
  if (typeof value !== "string" || !value || value === "—") return null;
  return value;
}

function issueForField(record: ClinicalMeasurementSnapshot | null | undefined, field: string) {
  return record?.validation?.issues?.some((issue) => issue.field === field && issue.severity !== "info") ?? false;
}

export function buildClinicalMeasurementCards(input: {
  bundleSeed?: ClinicalMeasurementBundleSeed | null;
  live?: LiveMeasurementSnapshot | null;
  record?: ClinicalMeasurementSnapshot | null;
}): ClinicalMeasurementCard[] {
  const { bundleSeed, live: liveInput, record } = input;
  const live = liveInput ?? null;
  const axis =
    formatAxis(record?.electricalAxisDeg ?? record?.qrsAxisDeg ?? bundleSeed?.electricalAxisDeg) ??
    pickLive(live, "qrsAxis") ??
    "—";

  return [
    {
      abnormal: issueForField(record, "heartRate"),
      id: "hr",
      label: "Heart Rate",
      source: pickLive(live, "heartRate") ? "Live calipers" : record?.source ?? (bundleSeed?.heartRate != null ? "Case record" : "Awaiting measure"),
      unit: "bpm",
      value: pickLive(live, "heartRate") ?? formatNumber(record?.heartRate ?? bundleSeed?.heartRate, "bpm") ?? "—",
    },
    {
      abnormal: issueForField(record, "rrIntervalMs"),
      id: "rr",
      label: "RR",
      source: pickLive(live, "rr") ? "Live calipers" : record?.source ?? "Clinical engine",
      unit: "ms",
      value: pickLive(live, "rr") ?? formatNumber(record?.rrIntervalMs ?? bundleSeed?.rrIntervalMs, "ms") ?? "—",
    },
    {
      abnormal: issueForField(record, "prIntervalMs"),
      id: "pr",
      label: "PR",
      source: pickLive(live, "pr") ? "Live calipers" : record?.source ?? "Clinical engine",
      unit: "ms",
      value: pickLive(live, "pr") ?? formatNumber(record?.prIntervalMs ?? bundleSeed?.prIntervalMs, "ms") ?? "—",
    },
    {
      abnormal: issueForField(record, "qrsDurationMs"),
      id: "qrs",
      label: "QRS",
      source: pickLive(live, "qrs") ? "Live calipers" : record?.source ?? "Clinical engine",
      unit: "ms",
      value: pickLive(live, "qrs") ?? formatNumber(record?.qrsDurationMs ?? bundleSeed?.qrsDurationMs, "ms") ?? "—",
    },
    {
      abnormal: issueForField(record, "qtIntervalMs"),
      id: "qt",
      label: "QT",
      source: pickLive(live, "qt") ? "Live calipers" : record?.source ?? "Clinical engine",
      unit: "ms",
      value: pickLive(live, "qt") ?? formatNumber(record?.qtIntervalMs ?? bundleSeed?.qtIntervalMs, "ms") ?? "—",
    },
    {
      abnormal: issueForField(record, "qtcIntervalMs"),
      id: "qtc",
      label: "QTc",
      source: pickLive(live, "qtc") ? "Live calipers" : record?.source ?? "Clinical engine",
      unit: "ms",
      value: pickLive(live, "qtc") ?? formatNumber(record?.qtcIntervalMs ?? bundleSeed?.qtcIntervalMs, "ms") ?? "—",
    },
    {
      abnormal: issueForField(record, "electricalAxisDeg"),
      id: "axis",
      label: "Axis",
      source: record?.source ?? "Clinical engine",
      unit: "",
      value: axis,
    },
    {
      abnormal: issueForField(record, "stLevelMm"),
      id: "st",
      label: "ST",
      source: pickLive(live, "stElevation") !== "—" || pickLive(live, "stDepression") !== "—" ? "Live calipers" : record?.source ?? "Clinical engine",
      unit: "mm",
      value:
        pickLive(live, "stElevation") !== "—" && pickLive(live, "stElevation")
          ? pickLive(live, "stElevation")!
          : pickLive(live, "stDepression") !== "—" && pickLive(live, "stDepression")
            ? pickLive(live, "stDepression")!
            : formatNumber(record?.stLevelMm ?? bundleSeed?.stLevelMm, "mm") ?? "—",
    },
    {
      abnormal: issueForField(record, "pDurationMs"),
      id: "p-duration",
      label: "P Duration",
      source: record?.source ?? "Clinical engine",
      unit: "ms",
      value: formatNumber(record?.pDurationMs ?? bundleSeed?.pDurationMs, "ms") ?? "—",
    },
    {
      abnormal: issueForField(record, "tWaveDurationMs"),
      id: "t-duration",
      label: "T Duration",
      source: record?.source ?? "Clinical engine",
      unit: "ms",
      value: formatNumber(record?.tWaveDurationMs ?? bundleSeed?.tWaveDurationMs, "ms") ?? "—",
    },
  ];
}

export function bundleSeedFromMeasurements(raw: Record<string, unknown> | null | undefined): ClinicalMeasurementBundleSeed | null {
  if (!raw) return null;
  const num = (keys: string[]) => {
    for (const key of keys) {
      const value = raw[key];
      if (typeof value === "number") return value;
    }
    return undefined;
  };
  return {
    electricalAxisDeg: num(["electricalAxisDeg", "electricalAxis", "meanQrsAxisDeg"]),
    heartRate: num(["heartRate", "heartRateBpm"]),
    pDurationMs: num(["pDurationMs", "pWaveDurationMs"]),
    prIntervalMs: num(["prIntervalMs", "prInterval"]),
    qrsDurationMs: num(["qrsDurationMs", "qrsDuration"]),
    qtIntervalMs: num(["qtIntervalMs", "qtInterval"]),
    qtcIntervalMs: num(["qtcIntervalMs", "qtcBazettMs", "qtcInterval"]),
    rrIntervalMs: num(["rrIntervalMs", "rrInterval"]),
    stLevelMm: num(["stLevelMm", "stDeviationMm", "stDeviation"]),
    tWaveDurationMs: num(["tWaveDurationMs"]),
  };
}
