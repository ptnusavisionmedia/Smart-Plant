import { z } from "zod";
import { StatusSchema, StatusReasonSchema } from "./status.js";
import { NotificationSchema } from "./notification.js";

export const WsReadingEventSchema = z
  .object({
    type: z.literal("reading"),
    deviceId: z.string(),
    data: z
      .object({
        soilMoisture: z.number().nullable(),
        temperature: z.number().nullable(),
        humidity: z.number().nullable(),
        waterLevel: z.number().nullable(),
        pumpOn: z.boolean(),
        ts: z.string().datetime(),
      })
      .strict(),
  })
  .strict();

export const WsStatusEventSchema = z
  .object({
    type: z.literal("status"),
    deviceId: z.string(),
    status: StatusSchema,
    reasons: z.array(StatusReasonSchema),
    ts: z.string().datetime(),
  })
  .strict();

export const WsPresenceEventSchema = z
  .object({
    type: z.literal("device_presence"),
    deviceId: z.string(),
    online: z.boolean(),
    lastSeenAt: z.string().datetime().nullable(),
  })
  .strict();

export const WsWateringEventSchema = z
  .object({
    type: z.literal("watering"),
    deviceId: z.string(),
    state: z.enum(["running", "completed", "stopped", "rejected", "timeout"]),
    trigger: z.enum(["auto", "manual", "emergency"]),
    endsAt: z.string().datetime().nullable(),
  })
  .strict();

export const WsNotificationEventSchema = z
  .object({
    type: z.literal("notification"),
    notification: NotificationSchema,
  })
  .strict();

export const WsServerEventSchema = z.discriminatedUnion("type", [
  WsReadingEventSchema,
  WsStatusEventSchema,
  WsPresenceEventSchema,
  WsWateringEventSchema,
  WsNotificationEventSchema,
]);
export type WsServerEvent = z.infer<typeof WsServerEventSchema>;
