import { z } from "zod";

export const timelineQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sync: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});
