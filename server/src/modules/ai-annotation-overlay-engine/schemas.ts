import { z } from "zod";
import { AI_OVERLAY_LAYER_ORDER } from "./types";

export const toggleOverlaySchema = z.object({ enabled: z.boolean() });
export const layerConfigSchema = z.object({
  enabled: z.boolean(),
  layers: z.array(z.object({ enabled: z.boolean(), key: z.enum(AI_OVERLAY_LAYER_ORDER), label: z.string(), opacity: z.number() })),
  version: z.literal(1),
});
export const saveOverlayWorkspaceSchema = z.object({ layerConfig: layerConfigSchema.optional(), workspace: z.object({ annotations: z.array(z.any()), selectedAnnotationIds: z.array(z.string()), settings: z.any(), version: z.literal(1) }) });
export const generateOverlaySchema = z.object({ imageHeight: z.number().optional(), imageWidth: z.number().optional() });
export const patchAnnotationSchema = z.object({ confirmed: z.boolean().optional(), doctorNotes: z.string().optional(), rejected: z.boolean().optional(), visible: z.boolean().optional() });
export const physicianNoteSchema = z.object({ lead: z.string().optional(), note: z.string().min(1) });
export const restoreVersionSchema = z.object({ note: z.string().optional() });
export const caseIdParamsSchema = z.object({ caseId: z.string().min(1) });
export const annotationParamsSchema = z.object({ annotationId: z.string().min(1), caseId: z.string().min(1) });
export const versionParamsSchema = z.object({ caseId: z.string().min(1), versionNumber: z.coerce.number().int().positive() });
export const updateLayerConfigSchema = layerConfigSchema;
