import { z } from "zod";
import { inferenceRequestSchema, promptRenderRequestSchema } from "./validation/schemas";

export const foundationHealthQuerySchema = z.object({}).optional();

export const foundationInferenceBodySchema = inferenceRequestSchema.extend({
  caseId: z.string().optional(),
  patientId: z.string().optional(),
});

export const foundationPromptRenderBodySchema = promptRenderRequestSchema;

export const foundationProviderListQuerySchema = z.object({}).optional();
