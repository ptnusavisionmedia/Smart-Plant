import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { users } from "./users.js";
import { devices } from "./devices.js";

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: text("device_id").references(() => devices.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** JSON-encoded string[] of StatusReason. */
    reasons: text("reasons"),
    /** JSON-encoded string[], e.g. ["in_app","push","telegram"]. */
    sentChannels: text("sent_channels"),
    deliveryAttempts: integer("delivery_attempts").notNull().default(0),
    lastError: text("last_error"),
    readAt: integer("read_at"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("idx_notifications_user_created").on(table.userId, table.createdAt),
    index("idx_notifications_user_unread").on(table.userId, table.readAt),
  ],
);

export const notificationPreferences = sqliteTable("notification_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  inApp: integer("in_app", { mode: "boolean" }).notNull().default(true),
  push: integer("push", { mode: "boolean" }).notNull().default(true),
  telegram: integer("telegram", { mode: "boolean" }).notNull().default(false),
  telegramChatId: text("telegram_chat_id"),
  telegramLinkCodeHash: text("telegram_link_code_hash"),
  telegramLinkCodeExpiresAt: integer("telegram_link_code_expires_at"),
});

export const pushTokens = sqliteTable(
  "push_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fcmToken: text("fcm_token").notNull().unique(),
    platform: text("platform", { enum: ["android", "ios"] }).notNull(),
    revokedAt: integer("revoked_at"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_push_tokens_user").on(table.userId)],
);
