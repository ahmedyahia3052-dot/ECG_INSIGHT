import type { EcgClinicalMeasurement } from "./measurementTypes";

function escapeCsv(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function measurementsToCsv(measurements: EcgClinicalMeasurement[]) {
  const headers = [
    "id",
    "name",
    "type",
    "kind",
    "value",
    "unit",
    "lead",
    "durationMs",
    "amplitudeMv",
    "referenceRange",
    "clinicalSignificance",
    "doctorNotes",
    "confidence",
    "operator",
    "timestamp",
    "updatedAt",
    "startX",
    "startY",
    "endX",
    "endY",
  ];
  const rows = measurements.map((item) =>
    [
      item.id,
      item.name,
      item.type,
      item.kind,
      item.value,
      item.unit,
      item.lead ?? "",
      item.durationMs ?? "",
      item.amplitudeMv ?? "",
      item.referenceRange ?? "",
      item.clinicalSignificance ?? "",
      item.doctorNotes ?? item.comments ?? "",
      item.confidence ?? "",
      item.operator,
      item.timestamp,
      item.updatedAt,
      item.start.x,
      item.start.y,
      item.end.x,
      item.end.y,
    ]
      .map(escapeCsv)
      .join(","),
  );
  return `${headers.join(",")}\n${rows.join("\n")}`;
}
