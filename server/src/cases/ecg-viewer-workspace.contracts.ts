import { z } from "zod";

export const EcgMeasurementKindSchema = z.enum([
  "pr_interval",
  "qrs_duration",
  "qt_interval",
  "qtc",
  "qt_dispersion",
  "rr_interval",
  "pp_interval",
  "st_elevation",
  "st_depression",
  "heart_rate",
  "p_wave_duration",
  "t_wave_duration",
  "p_amplitude",
  "r_amplitude",
  "s_amplitude",
  "t_amplitude",
  "electrical_axis",
  "custom",
]);

export const EcgClinicalMeasurementSchema = z.object({
  aiInterpretation: z.string().nullable().optional(),
  amplitudeMv: z.number().optional(),
  caliperId: z.string(),
  clinicalSignificance: z.string().optional(),
  comments: z.string().optional(),
  confidence: z.number().nullable(),
  createdBy: z.string().optional(),
  doctorNotes: z.string().optional(),
  durationMs: z.number().optional(),
  end: z.object({ x: z.number(), y: z.number() }),
  hidden: z.boolean(),
  id: z.string(),
  kind: EcgMeasurementKindSchema,
  lead: z.string().optional(),
  name: z.string(),
  operator: z.string(),
  readouts: z.record(z.string(), z.unknown()),
  referenceRange: z.string().optional(),
  start: z.object({ x: z.number(), y: z.number() }),
  timestamp: z.string(),
  type: z.string(),
  unit: z.string(),
  updatedAt: z.string(),
  value: z.number(),
});

export const EcgViewerWorkspaceEnvelopeSchema = z.object({
  measurements: z.array(EcgClinicalMeasurementSchema).optional(),
  version: z.literal(5),
  workspace: z.record(z.string(), z.unknown()),
});

export type EcgViewerWorkspaceEnvelopeDto = z.infer<typeof EcgViewerWorkspaceEnvelopeSchema>;

export function buildMeasurementWorkspaceCsv(measurements: Array<Record<string, unknown>>) {
  const headers = ["name", "type", "kind", "value", "unit", "lead", "referenceRange", "clinicalSignificance", "timestamp", "operator"];
  const escape = (value: unknown) => {
    const text = value == null ? "" : String(value);
    return text.includes(",") || text.includes('"') ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const rows = measurements.map((item) => headers.map((header) => escape(item[header])).join(","));
  return `${headers.join(",")}\n${rows.join("\n")}`;
}
