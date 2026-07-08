import { z } from "zod";

export const uploadEcgStorageBodySchema = z.object({
  caseId: z.string().trim().optional(),
  patientId: z.string().trim().min(1),
});

export const ecgFileIdParamsSchema = z.object({
  ecgFileId: z.string().trim().min(1),
});

export const createVersionBodySchema = z.object({
  ecgFileId: z.string().trim().min(1),
});

export const signedUrlBodySchema = z.object({
  ecgFileId: z.string().trim().min(1),
  expiresInSeconds: z.coerce.number().int().min(60).max(3600).optional(),
});

export const signedDownloadQuerySchema = z.object({
  token: z.string().trim().min(1),
});

export const versionQuerySchema = z.object({
  version: z.coerce.number().int().min(1).optional(),
});
