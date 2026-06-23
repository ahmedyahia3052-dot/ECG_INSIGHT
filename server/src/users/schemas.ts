import { z } from "zod";

export const createInternalUserSchema = z.object({
  email: z.string().email(),
  institution: z.string().trim().max(120).optional(),
  licenseNumber: z.string().trim().max(120).optional(),
  name: z.string().trim().min(2).max(120),
  password: z.string().min(8).max(128).default("ChangeMe123!"),
  role: z.enum(["admin", "doctor", "student"]),
  specialization: z.string().trim().max(120).optional(),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});
