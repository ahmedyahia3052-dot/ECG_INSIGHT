import { z } from "zod";

export const updateSubscriptionSchema = z.object({
  status: z.enum(["ACTIVE", "PAST_DUE", "CANCELED", "TRIALING"]).optional(),
  tier: z.enum(["free", "professional", "enterprise"]),
});
