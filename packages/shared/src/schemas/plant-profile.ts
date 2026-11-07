import { z } from "zod";
import { ThresholdsSchema } from "./config.js";

export const PlantProfileSchema = z
  .object({
    id: z.string(),
    name: z.string().min(1).max(100),
    isSystem: z.boolean(),
    ownerUserId: z.string().nullable(),
    thresholds: ThresholdsSchema,
  })
  .strict();
export type PlantProfile = z.infer<typeof PlantProfileSchema>;

export const CreatePlantProfileRequestSchema = z
  .object({
    name: z.string().min(1).max(100),
    thresholds: ThresholdsSchema,
  })
  .strict();
export type CreatePlantProfileRequest = z.infer<typeof CreatePlantProfileRequestSchema>;

export const UpdatePlantProfileRequestSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    thresholds: ThresholdsSchema.optional(),
  })
  .strict();
export type UpdatePlantProfileRequest = z.infer<typeof UpdatePlantProfileRequestSchema>;
