import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { users } from "./users.js";
import { devices } from "./devices.js";

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    deviceId: text("device_id").references(() => devices.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    /** JSON-encoded, arbitrary small metadata — never secrets. */
    metadata: text("metadata"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_audit_logs_created").on(table.createdAt)],
);
