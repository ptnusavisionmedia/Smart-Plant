import { z } from "zod";
import { WaterLevelSourceSchema } from "./config.js";

/** Topic: sp/{deviceId}/telemetry — published by the device, QoS 1. */
export const TelemetryMessageSchema = z
  .object({
    deviceUid: z.string().min(1).max(64),
    ts: z.string().datetime(),
    soilMoisture: z.number().min(0).max(100).nullable(),
    temperature: z.number().min(-40).max(85).nullable(),
    humidity: z.number().min(0).max(100).nullable(),
    waterLevel: z.number().min(0).max(100).nullable(),
    waterLevelCm: z.number().min(0).max(1000).nullable(),
    waterLevelSource: WaterLevelSourceSchema,
    pumpOn: z.boolean(),
    firmwareVersion: z.string().max(32).optional(),
    /** true when this reading was buffered offline and is being replayed. */
    historical: z.boolean().optional().default(false),
  })
  .strict();
export type TelemetryMessage = z.infer<typeof TelemetryMessageSchema>;

/** Topic: sp/{deviceId}/presence — plain-text LWT payload ("online"/"offline"). */
export const PresenceMessageSchema = z.enum(["online", "offline"]);
export type PresenceMessage = z.infer<typeof PresenceMessageSchema>;

/** Topic: sp/{deviceId}/state — device-reported authoritative pump/mode state. */
export const DeviceStateMessageSchema = z
  .object({
    pumpOn: z.boolean(),
    autoMode: z.boolean(),
    emergencyLatched: z.boolean(),
    configVersion: z.number().int().min(0),
    ts: z.string().datetime(),
  })
  .strict();
export type DeviceStateMessage = z.infer<typeof DeviceStateMessageSchema>;
