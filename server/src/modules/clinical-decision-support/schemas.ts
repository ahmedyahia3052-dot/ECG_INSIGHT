import { z } from "zod";

export const rejectRecommendationSchema = z.object({
  rejectionReason: z.string().trim().optional(),
});
