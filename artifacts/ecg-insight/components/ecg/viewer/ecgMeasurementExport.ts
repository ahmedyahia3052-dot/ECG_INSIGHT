import type { EcgClinicalMeasurement } from "./measurementTypes";

function escapeCsv(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function escapeXml(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function measurementsToCsv(measurements: EcgClinicalMeasurement[]) {
  const headers = [
    "id",
    "name",
    "abbreviation",
    "type",
    "kind",
    "value",
    "unit",
    "lead",
    "durationMs",
    "amplitudeMv",
    "waveformStartMs",
    "waveformEndMs",
    "waveformStartMv",
    "waveformEndMv",
    "approvalStatus",
    "referenceRange",
    "clinicalSignificance",
    "doctorNotes",
    "confidence",
    "operator",
    "timestamp",
    "updatedAt",
    "version",
  ];
  const rows = measurements.map((item) =>
    [
      item.id,
      item.name,
      item.abbreviation ?? "",
      item.type,
      item.kind,
      item.value,
      item.unit,
      item.lead ?? "",
      item.durationMs ?? "",
      item.amplitudeMv ?? "",
      item.waveformStart?.timeMs ?? "",
      item.waveformEnd?.timeMs ?? "",
      item.waveformStart?.amplitudeMv ?? "",
      item.waveformEnd?.amplitudeMv ?? "",
      item.approvalStatus ?? "pending",
      item.referenceRange ?? "",
      item.clinicalSignificance ?? "",
      item.doctorNotes ?? item.comments ?? "",
      item.confidence ?? "",
      item.operator,
      item.timestamp,
      item.updatedAt,
      item.version ?? 1,
    ]
      .map(escapeCsv)
      .join(","),
  );
  return `${headers.join(",")}\n${rows.join("\n")}`;
}

export function measurementsToXml(measurements: EcgClinicalMeasurement[]) {
  const exportedAt = new Date().toISOString();
  const items = measurements
    .map(
      (item) => `  <Measurement id="${escapeXml(item.id)}" kind="${escapeXml(item.kind)}" lead="${escapeXml(item.lead ?? "")}" approval="${escapeXml(item.approvalStatus ?? "pending")}">
    <Name>${escapeXml(item.name)}</Name>
    <Abbreviation>${escapeXml(item.abbreviation ?? "")}</Abbreviation>
    <Value unit="${escapeXml(item.unit)}">${escapeXml(item.value)}</Value>
    <DurationMs>${escapeXml(item.durationMs ?? "")}</DurationMs>
    <AmplitudeMv>${escapeXml(item.amplitudeMv ?? "")}</AmplitudeMv>
    <WaveformStart timeMs="${escapeXml(item.waveformStart?.timeMs ?? "")}" amplitudeMv="${escapeXml(item.waveformStart?.amplitudeMv ?? "")}" />
    <WaveformEnd timeMs="${escapeXml(item.waveformEnd?.timeMs ?? "")}" amplitudeMv="${escapeXml(item.waveformEnd?.amplitudeMv ?? "")}" />
    <Operator>${escapeXml(item.operator)}</Operator>
    <Timestamp>${escapeXml(item.timestamp)}</Timestamp>
    <ReferenceRange>${escapeXml(item.referenceRange ?? "")}</ReferenceRange>
    <ClinicalSignificance>${escapeXml(item.clinicalSignificance ?? "")}</ClinicalSignificance>
  </Measurement>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<EcgMeasurementExport exportedAt="${escapeXml(exportedAt)}" schemaVersion="6" count="${measurements.length}">
${items}
</EcgMeasurementExport>`;
}
