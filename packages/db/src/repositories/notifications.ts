import { and, desc, eq, isNotNull, isNull, lt } from "drizzle-orm";
import { uuidv7 } from "@smart-plant/shared";
import type { Db } from "../client.js";
import { notifications, notificationPreferences, pushTokens } from "../schema/index.js";

export function createNotificationsRepository(db: Db) {
  return {
    create(input: {
      userId: string;
      deviceId: string | null;
      type: string;
      title: string;
      body: string;
      reasons: string[];
    }) {
      const row = {
        id: uuidv7(),
        userId: input.userId,
        deviceId: input.deviceId,
        type: input.type,
        title: input.title,
        body: input.body,
        reasons: JSON.stringify(input.reasons),
        sentChannels: JSON.stringify([] as string[]),
        deliveryAttempts: 0,
        lastError: null as string | null,
        readAt: null as number | null,
        createdAt: Date.now(),
      };
      db.insert(notifications).values(row).run();
      return row;
    },

    recordDelivery(id: string, sentChannels: string[], lastError: string | null) {
      db.update(notifications)
        .set({
          sentChannels: JSON.stringify(sentChannels),
          deliveryAttempts: db
            .select({ n: notifications.deliveryAttempts })
            .from(notifications)
            .where(eq(notifications.id, id))
            .get()!.n + 1,
          lastError,
        })
        .where(eq(notifications.id, id))
        .run();
    },

    listForUser(userId: string, cursor: string | null, limit: number) {
      const rows = db
        .select()
        .from(notifications)
        .where(
          cursor
            ? and(eq(notifications.userId, userId), lt(notifications.createdAt, Number(cursor)))
            : eq(notifications.userId, userId),
        )
        .orderBy(desc(notifications.createdAt))
        .limit(limit + 1)
        .all();

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore ? String(items[items.length - 1]!.createdAt) : null;
      return { items, nextCursor };
    },

    unreadCount(userId: string) {
      return db
        .select()
        .from(notifications)
        .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
        .all().length;
    },

    markRead(id: string, userId: string) {
      db.update(notifications)
        .set({ readAt: Date.now() })
        .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
        .run();
    },

    markAllRead(userId: string) {
      db.update(notifications)
        .set({ readAt: Date.now() })
        .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
        .run();
    },

    /** Notifications with a failed delivery that still have retries left (job notification-retry). */
    listPendingRetry(maxAttempts: number, limit = 50) {
      return db
        .select()
        .from(notifications)
        .where(and(lt(notifications.deliveryAttempts, maxAttempts), isNotNull(notifications.lastError)))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .all();
    },

    // --- preferences ---

    getPreferences(userId: string) {
      return db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .get();
    },

    upsertPreferences(userId: string, patch: Partial<{ inApp: boolean; push: boolean; telegram: boolean }>) {
      const existing = this.getPreferences(userId);
      if (existing) {
        db.update(notificationPreferences)
          .set(patch)
          .where(eq(notificationPreferences.userId, userId))
          .run();
      } else {
        db.insert(notificationPreferences)
          .values({ userId, inApp: true, push: true, telegram: false, telegramChatId: null, ...patch })
          .run();
      }
    },

    setTelegramLinkCode(userId: string, codeHash: string, expiresAt: number) {
      const existing = this.getPreferences(userId);
      if (existing) {
        db.update(notificationPreferences)
          .set({ telegramLinkCodeHash: codeHash, telegramLinkCodeExpiresAt: expiresAt })
          .where(eq(notificationPreferences.userId, userId))
          .run();
      } else {
        db.insert(notificationPreferences)
          .values({
            userId,
            inApp: true,
            push: true,
            telegram: false,
            telegramChatId: null,
            telegramLinkCodeHash: codeHash,
            telegramLinkCodeExpiresAt: expiresAt,
          })
          .run();
      }
    },

    /** Caller must additionally check telegramLinkCodeExpiresAt > now. */
    findByTelegramLinkCodeHash(codeHash: string) {
      return db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.telegramLinkCodeHash, codeHash))
        .get();
    },

    findUserIdByTelegramChatId(chatId: string): string | undefined {
      return db
        .select({ userId: notificationPreferences.userId })
        .from(notificationPreferences)
        .where(eq(notificationPreferences.telegramChatId, chatId))
        .get()?.userId;
    },

    linkTelegram(userId: string, chatId: string) {
      db.update(notificationPreferences)
        .set({
          telegramChatId: chatId,
          telegram: true,
          telegramLinkCodeHash: null,
          telegramLinkCodeExpiresAt: null,
        })
        .where(eq(notificationPreferences.userId, userId))
        .run();
    },

    unlinkTelegram(userId: string) {
      db.update(notificationPreferences)
        .set({ telegramChatId: null, telegram: false })
        .where(eq(notificationPreferences.userId, userId))
        .run();
    },

    // --- push tokens ---

    registerPushToken(input: { userId: string; fcmToken: string; platform: "android" | "ios" }) {
      const existing = db
        .select()
        .from(pushTokens)
        .where(eq(pushTokens.fcmToken, input.fcmToken))
        .get();
      if (existing) {
        db.update(pushTokens)
          .set({ userId: input.userId, platform: input.platform, revokedAt: null })
          .where(eq(pushTokens.id, existing.id))
          .run();
        return existing;
      }
      const row = {
        id: uuidv7(),
        userId: input.userId,
        fcmToken: input.fcmToken,
        platform: input.platform,
        revokedAt: null as number | null,
        createdAt: Date.now(),
      };
      db.insert(pushTokens).values(row).run();
      return row;
    },

    revokePushToken(userId: string, fcmToken: string) {
      db.update(pushTokens)
        .set({ revokedAt: Date.now() })
        .where(and(eq(pushTokens.userId, userId), eq(pushTokens.fcmToken, fcmToken)))
        .run();
    },

    listActivePushTokens(userId: string) {
      return db
        .select()
        .from(pushTokens)
        .where(and(eq(pushTokens.userId, userId), isNull(pushTokens.revokedAt)))
        .all();
    },
  };
}

export type NotificationsRepository = ReturnType<typeof createNotificationsRepository>;
