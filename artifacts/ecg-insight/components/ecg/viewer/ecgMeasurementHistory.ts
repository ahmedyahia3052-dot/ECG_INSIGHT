import { summarizeCaliper } from "./ecgMeasurementEngine";
import type { EcgCaliper, EcgMeasurementHistoryEntry, EcgMeasurementKind } from "./measurementTypes";
import { MEASUREMENT_KIND_LABELS } from "./measurementTypes";
import type { EcgViewerControls } from "./useEcgViewerControls";

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatHistoryValue(caliper: EcgCaliper, controls: EcgViewerControls, rrMs?: number): string {
  const summary = summarizeCaliper(caliper, controls, rrMs);
  const unit =
    caliper.kind === "angle"
      ? "°"
      : caliper.kind === "vertical"
        ? "mm/mV"
        : caliper.kind === "horizontal"
          ? "ms"
          : "px";
  return `${summary.primary}${unit === "°" || unit === "px" ? "" : " "}${unit === "px" ? "" : unit}`;
}

export function createHistoryEntry(input: {
  action: EcgMeasurementHistoryEntry["action"];
  caliper?: EcgCaliper;
  controls: EcgViewerControls;
  doctor: string;
  lead?: string;
  measurementId?: string;
  measurementKind?: EcgMeasurementKind;
  name?: string;
  rrMs?: number;
  value?: string;
}): EcgMeasurementHistoryEntry {
  const kind = input.measurementKind ?? input.caliper?.measurementKind ?? "custom";
  const value =
    input.value ??
    (input.caliper ? formatHistoryValue(input.caliper, input.controls, input.rrMs) : "—");
  return {
    action: input.action,
    caliperId: input.caliper?.id,
    doctor: input.doctor,
    id: uid("history"),
    lead: input.lead ?? input.caliper?.lead,
    measurementId: input.measurementId,
    measurementType: input.name ?? MEASUREMENT_KIND_LABELS[kind],
    name: input.name,
    timestamp: new Date().toISOString(),
    value,
  };
}

export function appendHistory(
  history: EcgMeasurementHistoryEntry[],
  entry: EcgMeasurementHistoryEntry,
  maxEntries = 200,
): EcgMeasurementHistoryEntry[] {
  return [entry, ...history].slice(0, maxEntries);
}

export function renameHistoryEntry(
  history: EcgMeasurementHistoryEntry[],
  entryId: string,
  name: string,
): EcgMeasurementHistoryEntry[] {
  return history.map((item) => (item.id === entryId ? { ...item, name, measurementType: name } : item));
}

export function deleteHistoryEntry(history: EcgMeasurementHistoryEntry[], entryId: string): EcgMeasurementHistoryEntry[] {
  return history.filter((item) => item.id !== entryId);
}
