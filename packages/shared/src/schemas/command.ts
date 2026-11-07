import { z } from "zod";
import { DeviceConfigSchema } from "./config.js";

/** Topic: sp/{deviceId}/command — published by the API, QoS 1. */
export const CommandMessageSchema = z.discriminatedUnion("type", [
  z
    .object({
      id: z.string(),
      type: z.literal("pump"),
      action: z.enum(["start", "stop"]),
      durationSeconds: z.number().int().min(1).max(60).optional(),
      issuedAt: z.string().datetime(),
    })
    .strict(),
  z
    .object({
      id: z.string(),
      type: z.literal("emergency_stop"),
      issuedAt: z.string().datetime(),
    })
    .strict(),
  z
    .object({
      id: z.string(),
      type: z.literal("emergency_reset"),
      resumeAutoMode: z.boolean().default(false),
      issuedAt: z.string().datetime(),
    })
    .strict(),
  z
    .object({
      id: z.string(),
      type: z.literal("config"),
      config: DeviceConfigSchema,
      issuedAt: z.string().datetime(),
    })
    .strict(),
]);
export type CommandMessage = z.infer<typeof CommandMessageSchema>;

/** Topic: sp/{deviceId}/ack — published by the device in response to a command. */
export const AckMessageSchema = z
  .object({
    id: z.string(),
    ok: z.boolean(),
    state: z.enum(["on", "off", "accepted", "rejected"]),
    error: z.string().max(200).optional(),
  })
  .strict();
export type AckMessage = z.infer<typeof AckMessageSchema>;
