import { z } from "zod";

export const caseIdParamsSchema = z.object({
  caseId: z.string().trim().min(1),
});

export const annotationIdParamsSchema = z.object({
  annotationId: z.string().trim().min(1),
  caseId: z.string().trim().min(1),
});

export const waveformQuerySchema = z.object({
  lead: z.string().trim().optional(),
  maxSeconds: z.coerce.number().min(1).max(120).optional(),
});

export const compareQuerySchema = z.object({
  baselineCaseId: z.string().trim().optional(),
});

export const exportBodySchema = z.object({
  format: z.enum(["pdf", "json", "csv", "png", "svg", "binary"]),
  includeMeasurements: z.boolean().optional(),
  includeAnnotations: z.boolean().optional(),
});

export const reportBodySchema = z.object({
  clinicalIndication: z.string().trim().optional(),
  regenerate: z.boolean().optional(),
});

export const physicianAnnotationBodySchema = z.object({
  color: z.string().trim().optional(),
  ecgFileId: z.string().trim().optional(),
  geometry: z.record(z.string(), z.unknown()),
  label: z.string().trim().optional(),
  lead: z.string().trim().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
  type: z.string().trim().min(1),
  visible: z.boolean().optional(),
});

export const updateAnnotationBodySchema = physicianAnnotationBodySchema.partial();

export const viewerPreferenceBodySchema = z.object({
  defaultZoom: z.number().min(0.1).max(32).optional(),
  gainMmPerMv: z.union([z.literal(5), z.literal(10), z.literal(20)]).optional(),
  layoutJson: z.record(z.string(), z.unknown()).optional(),
  overlayDefaults: z.record(z.string(), z.unknown()).optional(),
  paperSpeedMmSec: z.union([z.literal(25), z.literal(50)]).optional(),
  zoomPresets: z.array(z.number().min(0.1).max(32)).optional(),
});

export const overlayConfigBodySchema = z.object({
  config: z.object({
    layers: z.array(z.string()).optional(),
    opacity: z.number().min(0).max(1).optional(),
    showAiFindings: z.boolean().optional(),
    showGrid: z.boolean().optional(),
    showLeadLabels: z.boolean().optional(),
    showMeasurementOverlay: z.boolean().optional(),
    showPhysicianAnnotations: z.boolean().optional(),
  }),
});

export const measurementsBodySchema = z.object({
  measurements: z.array(z.object({
    lead: z.string().optional(),
    name: z.string().min(1),
    unit: z.string().min(1),
    value: z.number(),
  })),
});
