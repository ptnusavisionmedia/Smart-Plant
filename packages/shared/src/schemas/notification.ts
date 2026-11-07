import { z } from "zod";
import { StatusReasonSchema } from "./status.js";

export const NotificationTypeSchema = z.enum([
  "STATUS_CHANGE",
  "WATER_LOW",
  "DEVICE_OFFLINE",
  "DEVICE_ONLINE",
  "WATERING_COMPLETED",
  "EMERGENCY_STOP",
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationSchema = z
  .object({
    id: z.string(),
    deviceId: z.string().nullable(),
    type: NotificationTypeSchema,
    title: z.string(),
    body: z.string(),
    reasons: z.array(StatusReasonSchema),
    readAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  })
  .strict();
export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationListResponseSchema = z
  .object({
    items: z.array(NotificationSchema),
    nextCursor: z.string().nullable(),
    unreadCount: z.number().int().min(0),
  })
  .strict();
export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;

export const NotificationPreferencesSchema = z
  .object({
    inApp: z.boolean(),
    push: z.boolean(),
    telegram: z.boolean(),
    telegramLinked: z.boolean(),
  })
  .strict();
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

export const UpdateNotificationPreferencesRequestSchema = z
  .object({
    inApp: z.boolean().optional(),
    push: z.boolean().optional(),
    telegram: z.boolean().optional(),
  })
  .strict();
export type UpdateNotificationPreferencesRequest = z.infer<
  typeof UpdateNotificationPreferencesRequestSchema
>;

export const RegisterPushTokenRequestSchema = z
  .object({
    fcmToken: z.string().min(10).max(4096),
    platform: z.enum(["android", "ios"]),
  })
  .strict();
export type RegisterPushTokenRequest = z.infer<typeof RegisterPushTokenRequestSchema>;
