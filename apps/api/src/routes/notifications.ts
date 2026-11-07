import type { FastifyInstance } from "fastify";
import {
  PaginationQuerySchema,
  IdParamSchema,
  UpdateNotificationPreferencesRequestSchema,
  RegisterPushTokenRequestSchema,
} from "@smart-plant/shared";
import { userIdFromRequest } from "../plugins/auth.js";

export default async function notificationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/notifications", async (req) => {
    const userId = userIdFromRequest(req);
    const query = PaginationQuerySchema.parse(req.query);
    const { items, nextCursor } = app.repos.notifications.listForUser(userId, query.cursor ?? null, query.limit);
    return {
      items: items.map((n) => ({
        id: n.id,
        deviceId: n.deviceId,
        type: n.type,
        title: n.title,
        body: n.body,
        reasons: JSON.parse(n.reasons ?? "[]"),
        readAt: n.readAt ? new Date(n.readAt).toISOString() : null,
        createdAt: new Date(n.createdAt).toISOString(),
      })),
      nextCursor,
      unreadCount: app.repos.notifications.unreadCount(userId),
    };
  });

  app.patch("/notifications/:id/read", async (req, reply) => {
    const { id } = IdParamSchema.parse(req.params);
    const userId = userIdFromRequest(req);
    app.repos.notifications.markRead(id, userId);
    reply.code(204);
  });

  app.patch("/notifications/read-all", async (req, reply) => {
    const userId = userIdFromRequest(req);
    app.repos.notifications.markAllRead(userId);
    reply.code(204);
  });

  app.get("/notification-preferences", async (req) => {
    const userId = userIdFromRequest(req);
    const prefs = app.repos.notifications.getPreferences(userId);
    return {
      inApp: prefs?.inApp ?? true,
      push: prefs?.push ?? true,
      telegram: prefs?.telegram ?? false,
      telegramLinked: Boolean(prefs?.telegramChatId),
    };
  });

  app.patch("/notification-preferences", async (req) => {
    const userId = userIdFromRequest(req);
    const body = UpdateNotificationPreferencesRequestSchema.parse(req.body);
    app.repos.notifications.upsertPreferences(userId, body);
    const prefs = app.repos.notifications.getPreferences(userId);
    return {
      inApp: prefs?.inApp ?? true,
      push: prefs?.push ?? true,
      telegram: prefs?.telegram ?? false,
      telegramLinked: Boolean(prefs?.telegramChatId),
    };
  });

  app.post("/push-tokens", async (req, reply) => {
    const userId = userIdFromRequest(req);
    const body = RegisterPushTokenRequestSchema.parse(req.body);
    app.repos.notifications.registerPushToken({ userId, fcmToken: body.fcmToken, platform: body.platform });
    reply.code(201);
    return { ok: true };
  });

  app.delete("/push-tokens/:token", async (req, reply) => {
    const userId = userIdFromRequest(req);
    const { token } = req.params as { token: string };
    app.repos.notifications.revokePushToken(userId, token);
    reply.code(204);
  });
}
