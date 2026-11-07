import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { users } from "./users.js";

export const plantProfiles = sqliteTable("plant_profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
  ownerUserId: text("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
  /** JSON-encoded Thresholds (see packages/shared/src/schemas/config.ts). */
  thresholds: text("thresholds").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
