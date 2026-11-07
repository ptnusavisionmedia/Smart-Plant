import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { users } from "./users.js";
import { plantProfiles } from "./plant-profiles.js";

export const devices = sqliteTable(
  "devices",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    location: text("location"),
    deviceUid: text("device_uid").notNull().unique(),
    /** Hash of the one-time pairing code; null once claimed. */
    claimCodeHash: text("claim_code_hash"),
    claimCodeExpiresAt: integer("claim_code_expires_at"),
    /** Verified by /internal/mqtt/auth; never sent to clients. */
    mqttSecretHash: text("mqtt_secret_hash").notNull(),
    plantProfileId: text("plant_profile_id").references(() => plantProfiles.id),
    firmwareVersion: text("firmware_version"),
    lastSeenAt: integer("last_seen_at"),
    isOnline: integer("is_online", { mode: "boolean" }).notNull().default(false),
    autoMode: integer("auto_mode", { mode: "boolean" }).notNull().default(false),
    emergencyLatched: integer("emergency_latched", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("idx_devices_user_id").on(table.userId)],
);

export const deviceConfigs = sqliteTable("device_configs", {
  deviceId: text("device_id")
    .primaryKey()
    .references(() => devices.id, { onDelete: "cascade" }),
  /** JSON-encoded Thresholds. */
  thresholds: text("thresholds").notNull(),
  targetMoisture: real("target_moisture").notNull(),
  maxPumpSeconds: integer("max_pump_seconds").notNull(),
  cooldownSeconds: integer("cooldown_seconds").notNull(),
  telemetryIntervalSeconds: integer("telemetry_interval_seconds").notNull(),
  waterLevelSource: text("water_level_source", { enum: ["ultrasonic", "float_switch"] }).notNull(),
  tankHeightCm: real("tank_height_cm").notNull(),
  tankMaxLevelCm: real("tank_max_level_cm").notNull(),
  configVersion: integer("config_version").notNull().default(1),
  /** Set once the firmware acks this config version (Tech Spec §4.4 step 8). */
  acceptedAt: integer("accepted_at"),
  updatedAt: integer("updated_at").notNull(),
});
