import { z } from "zod";
import { StatusSchema, StatusReasonSchema } from "./status.js";

export const ClaimDeviceRequestSchema = z
  .object({
    claimCode: z.string().min(6).max(32),
    name: z.string().min(1).max(100),
    location: z.string().min(1).max(100).optional(),
    plantProfileId: z.string().optional(),
  })
  .strict();
export type ClaimDeviceRequest = z.infer<typeof ClaimDeviceRequestSchema>;

export const UpdateDeviceRequestSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    location: z.string().min(1).max(100).optional(),
    plantProfileId: z.string().optional(),
  })
  .strict();
export type UpdateDeviceRequest = z.infer<typeof UpdateDeviceRequestSchema>;

export const DeviceSummarySchema = z
  .object({
    id: z.string(),
    deviceUid: z.string(),
    name: z.string(),
    location: z.string().nullable(),
    status: StatusSchema,
    reasons: z.array(StatusReasonSchema),
    isOnline: z.boolean(),
    lastSeenAt: z.string().datetime().nullable(),
    autoMode: z.boolean(),
    emergencyLatched: z.boolean(),
    latest: z
      .object({
        soilMoisture: z.number().nullable(),
        temperature: z.number().nullable(),
        humidity: z.number().nullable(),
        waterLevel: z.number().nullable(),
        pumpOn: z.boolean(),
        ts: z.string().datetime(),
      })
      .nullable(),
  })
  .strict();
export type DeviceSummary = z.infer<typeof DeviceSummarySchema>;

export const ManualWateringRequestSchema = z
  .object({
    durationSeconds: z.number().int().min(1).max(60).default(10),
  })
  .strict();
export type ManualWateringRequest = z.infer<typeof ManualWateringRequestSchema>;

export const ManualWateringResponseSchema = z
  .object({
    commandId: z.string(),
    accepted: z.boolean(),
    state: z.enum(["pending", "running", "completed", "stopped", "rejected", "timeout"]),
  })
  .strict();
export type ManualWateringResponse = z.infer<typeof ManualWateringResponseSchema>;

export const ReadingsQuerySchema = z
  .object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    interval: z.enum(["raw", "hour", "day"]).default("raw"),
  })
  .strict();
export type ReadingsQuery = z.infer<typeof ReadingsQuerySchema>;

export const ReadingsPointSchema = z
  .object({
    bucket: z.string().datetime(),
    soilMoisture: z.number().nullable(),
    temperature: z.number().nullable(),
    humidity: z.number().nullable(),
    waterLevel: z.number().nullable(),
  })
  .strict();

export const ReadingsResponseSchema = z
  .object({
    interval: z.enum(["raw", "hour", "day"]),
    points: z.array(ReadingsPointSchema),
  })
  .strict();
export type ReadingsResponse = z.infer<typeof ReadingsResponseSchema>;
